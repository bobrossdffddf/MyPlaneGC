
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// Discord Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID || 'your-discord-client-id',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your-discord-client-secret',
  callbackURL: process.env.DISCORD_CALLBACK_URL || '/auth/discord/callback',
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// In-memory storage for demo (use database in production)
let airportData = {}; // Structure: { airport: { stands: {}, requests: [], users: new Map() } }
let connectedUsers = new Map();

// Serve frontend build
app.use(express.static(path.join(__dirname, "dist")));

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Socket.io handling
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("userMode", (data) => {
    connectedUsers.set(socket.id, data);
    
    // Initialize airport data if not exists
    if (data.airport && !airportData[data.airport]) {
      airportData[data.airport] = {
        stands: {},
        requests: [],
        users: new Map()
      };
    }
    
    // Add user to airport-specific data
    if (data.airport) {
      airportData[data.airport].users.set(socket.id, data);
      socket.join(data.airport); // Join airport-specific room
      
      // Send airport-specific data
      socket.emit("standUpdate", airportData[data.airport].stands);
      socket.emit("serviceUpdate", airportData[data.airport].requests);
      
      console.log(`User ${data.userId} joined ${data.airport} as ${data.mode}`);
    }
  });

  socket.on("claimStand", (data) => {
    const { stand, flightNumber, aircraft, pilot, userId, airport } = data;
    
    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }
    
    // Check if stand is available
    if (airportData[airport].stands[stand] && airportData[airport].stands[stand].occupied) {
      socket.emit("error", { message: "Stand already occupied" });
      return;
    }

    airportData[airport].stands[stand] = {
      flight: flightNumber,
      aircraft: aircraft,
      pilot: pilot,
      userId: userId,
      occupied: true,
      claimedAt: new Date().toLocaleTimeString()
    };

    // Emit to users at the same airport only
    io.to(airport).emit("standUpdate", airportData[airport].stands);
    
    // Notify users at the same airport
    io.to(airport).emit("chatUpdate", {
      text: `${pilot} has claimed ${stand} with flight ${flightNumber} (${aircraft}) at ${airport}`,
      sender: "SYSTEM",
      stand: stand,
      airport: airport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });
  });

  socket.on("chatMessage", (msg) => {
    // Only broadcast to users at the same airport
    if (msg.airport) {
      io.to(msg.airport).emit("chatUpdate", msg);
    }
  });

  socket.on("serviceRequest", (req) => {
    if (!req.airport || !airportData[req.airport]) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }
    
    const requestId = airportData[req.airport].requests.length;
    const serviceRequest = {
      ...req,
      id: requestId,
      requestedBy: socket.id
    };
    
    airportData[req.airport].requests.push(serviceRequest);
    io.to(req.airport).emit("serviceUpdate", airportData[req.airport].requests);

    // Notify users at the same airport
    io.to(req.airport).emit("chatUpdate", {
      text: `Service request: ${req.service} for ${req.flight} at ${req.stand} (${req.airport})`,
      sender: "SYSTEM",
      stand: req.stand,
      airport: req.airport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });
  });

  socket.on("serviceAction", (data) => {
    const { requestId, action, crewMember } = data;
    const userInfo = connectedUsers.get(socket.id);
    
    if (!userInfo || !userInfo.airport || !airportData[userInfo.airport]) {
      socket.emit("error", { message: "Invalid airport or user not properly connected" });
      return;
    }
    
    const airport = userInfo.airport;
    
    if (airportData[airport].requests[requestId]) {
      airportData[airport].requests[requestId].status = action;
      airportData[airport].requests[requestId].handledBy = crewMember;
      airportData[airport].requests[requestId].handledAt = new Date().toLocaleTimeString();
      
      io.to(airport).emit("serviceUpdate", airportData[airport].requests);
      
      // Notify users at the same airport
      const request = airportData[airport].requests[requestId];
      io.to(airport).emit("chatUpdate", {
        text: `${crewMember} has ${action.toLowerCase()} ${request.service} service for ${request.flight} at ${airport}`,
        sender: "SYSTEM",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    
    const userInfo = connectedUsers.get(socket.id);
    
    // Release any stands claimed by this user
    if (userInfo && userInfo.airport && airportData[userInfo.airport]) {
      for (const [stand, info] of Object.entries(airportData[userInfo.airport].stands)) {
        if (info.userId === userInfo.userId) {
          delete airportData[userInfo.airport].stands[stand];
          io.emit("standUpdate", airportData[userInfo.airport].stands);
          
          io.emit("chatUpdate", {
            text: `${info.pilot} has disconnected. ${stand} is now available.`,
            sender: "SYSTEM",
            stand: stand,
            airport: userInfo.airport,
            timestamp: new Date().toLocaleTimeString(),
            mode: "system"
          });
        }
      }
    }
    
    connectedUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PTFS Ground Services System running on port ${PORT}`);
  console.log(`🔗 Access at: http://localhost:${PORT}`);
});
