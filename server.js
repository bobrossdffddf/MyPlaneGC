
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
let stands = {};
let serviceRequests = [];
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

  // Send current stands data
  socket.emit("standUpdate", stands);

  socket.on("userMode", (data) => {
    connectedUsers.set(socket.id, data);
  });

  socket.on("claimStand", (data) => {
    const { stand, flightNumber, aircraft, pilot, userId } = data;
    
    // Check if stand is available
    if (stands[stand] && stands[stand].occupied) {
      socket.emit("error", { message: "Stand already occupied" });
      return;
    }

    stands[stand] = {
      flight: flightNumber,
      aircraft: aircraft,
      pilot: pilot,
      userId: userId,
      occupied: true,
      claimedAt: new Date().toLocaleTimeString()
    };

    io.emit("standUpdate", stands);
    
    // Notify ground crew
    io.emit("chatUpdate", {
      text: `${pilot} has claimed ${stand} with flight ${flightNumber} (${aircraft})`,
      sender: "SYSTEM",
      stand: stand,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });
  });

  socket.on("chatMessage", (msg) => {
    // Only broadcast to users on the same stand
    io.emit("chatUpdate", msg);
  });

  socket.on("serviceRequest", (req) => {
    const requestId = serviceRequests.length;
    const serviceRequest = {
      ...req,
      id: requestId,
      requestedBy: socket.id
    };
    
    serviceRequests.push(serviceRequest);
    io.emit("serviceUpdate", serviceRequests);

    // Notify ground crew
    io.emit("chatUpdate", {
      text: `Service request: ${req.service} for ${req.flight} at ${req.stand}`,
      sender: "SYSTEM",
      stand: req.stand,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });
  });

  socket.on("serviceAction", (data) => {
    const { requestId, action, crewMember } = data;
    
    if (serviceRequests[requestId]) {
      serviceRequests[requestId].status = action;
      serviceRequests[requestId].handledBy = crewMember;
      serviceRequests[requestId].handledAt = new Date().toLocaleTimeString();
      
      io.emit("serviceUpdate", serviceRequests);
      
      // Notify all users
      const request = serviceRequests[requestId];
      io.emit("chatUpdate", {
        text: `${crewMember} has ${action.toLowerCase()} ${request.service} service for ${request.flight}`,
        sender: "SYSTEM",
        stand: request.stand,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    
    // Release any stands claimed by this user
    for (const [stand, info] of Object.entries(stands)) {
      if (info.requestedBy === socket.id) {
        delete stands[stand];
        io.emit("standUpdate", stands);
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
