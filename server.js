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
let airportData = {}; // Structure: { airport: { stands: {}, requests: [], users: new Map(), atis: {} } }
let connectedUsers = new Map();

// Simulate ATIS updates every 5 minutes
const generateAtisData = (airport) => {
  const infoLetters = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT'];
  const windDirections = ['270', '280', '290', '260', '250'];
  const windSpeeds = ['08', '12', '15', '06', '10'];
  const qnhValues = ['1013', '1015', '1011', '1018', '1009'];
  const runways = ['27', '09', '18', '36'];
  
  return {
    airport: airport,
    info: infoLetters[Math.floor(Math.random() * infoLetters.length)],
    wind: `${windDirections[Math.floor(Math.random() * windDirections.length)]}°/${windSpeeds[Math.floor(Math.random() * windSpeeds.length)]}KT`,
    qnh: qnhValues[Math.floor(Math.random() * qnhValues.length)],
    runway: `${runways[Math.floor(Math.random() * runways.length)]} ACTIVE`,
    conditions: 'CAVOK',
    temperature: `${Math.floor(Math.random() * 10) + 10}°C`,
    timestamp: new Date().toLocaleTimeString()
  };
};

// Update ATIS every 5 minutes for all active airports
setInterval(() => {
  Object.keys(airportData).forEach(airport => {
    if (airportData[airport].users.size > 0) {
      const atisData = generateAtisData(airport);
      airportData[airport].atis = atisData;
      io.to(airport).emit("atisUpdate", atisData);
    }
  });
}, 300000); // 5 minutes

// Serve frontend build
app.use(express.static(path.join(__dirname, "dist")));

// Serve aircraft SVGs
app.use('/aircraft_svgs', express.static(path.join(__dirname, 'aircraft_svgs')));

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
        users: new Map(),
        atis: generateAtisData(data.airport)
      };
    }

    // Add user to airport-specific data
    if (data.airport) {
      airportData[data.airport].users.set(socket.id, data);
      socket.join(data.airport); // Join airport-specific room

      // Send airport-specific data
      socket.emit("standUpdate", airportData[data.airport].stands);
      socket.emit("serviceUpdate", airportData[data.airport].requests);
      socket.emit("atisUpdate", airportData[data.airport].atis);

      console.log(`User ${data.userId} joined ${data.airport} as ${data.mode}`);
    }
  });

  socket.on("claimStand", (data) => {
    const { stand, flightNumber, aircraft, pilot, userId, airport, allowSwitch } = data;

    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }

    // Check if stand is available or if user is switching their own stand
    if (airportData[airport].stands[stand] &&
        airportData[airport].stands[stand].occupied &&
        airportData[airport].stands[stand].userId !== userId) {
      socket.emit("error", { message: "Stand already occupied by another pilot" });
      return;
    }

    // Release any previous stands claimed by this user
    if (allowSwitch) {
      for (const [prevStand, standInfo] of Object.entries(airportData[airport].stands)) {
        if (standInfo.userId === userId) {
          delete airportData[airport].stands[prevStand];
          io.to(airport).emit("chatUpdate", {
            text: `${pilot} has released ${prevStand}`,
            sender: "SYSTEM",
            stand: prevStand,
            airport: airport,
            timestamp: new Date().toLocaleTimeString(),
            mode: "system"
          });
        }
      }
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
      text: `${pilot} has claimed ${stand} with flight ${flightNumber} (${aircraft})`,
      sender: "GROUND CONTROL",
      stand: stand,
      airport: airport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system",
      priority: "normal"
    });
  });

  socket.on("chatMessage", (msg) => {
    // Only broadcast to users at the same airport and ensure airport is set
    if (msg.airport && airportData[msg.airport]) {
      msg.airport = msg.airport; // Ensure airport is preserved in message
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

    // Notify users at the same airport with pilot color coding
    io.to(req.airport).emit("chatUpdate", {
      text: `Service request: ${req.service} for ${req.flight} at ${req.stand}`,
      sender: "PILOT REQUEST",
      stand: req.stand,
      airport: req.airport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "pilot",
      priority: "high"
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

      // Notify users at the same airport with ground crew color
      const request = airportData[airport].requests[requestId];
      io.to(airport).emit("chatUpdate", {
        text: `${crewMember} has ${action.toLowerCase()} ${request.service} service for ${request.flight}`,
        sender: "GROUND CREW",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "groundcrew",
        priority: "normal"
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