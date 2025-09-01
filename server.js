import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import dotenv from "dotenv";
import WebSocket from "ws";

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
let ptfsAtisData = {}; // Store real ATIS data from PTFS

// Parse ATIS content to extract useful information
const parseAtisContent = (atisInfo) => {
  const lines = atisInfo.lines || [];
  const content = atisInfo.content || '';
  
  let wind = 'CALM';
  let qnh = '1013';
  let runway = 'UNKNOWN';
  let conditions = 'CAVOK';
  let temperature = 'N/A';
  
  // Parse wind information (format: 094/12)
  const windMatch = content.match(/(\d{3})\/(\d{2,3})/);
  if (windMatch) {
    const windDir = windMatch[1];
    const windSpeed = windMatch[2];
    wind = `${windDir}°/${windSpeed}KT`;
  }
  
  // Parse QNH (format: Q1013)
  const qnhMatch = content.match(/Q(\d{4})/);
  if (qnhMatch) {
    qnh = qnhMatch[1];
  }
  
  // Parse runway information
  const runwayMatch = content.match(/(?:DEP RWY|ARR RWY|RWY)\s+(\d{2}[LRC]?)/);
  if (runwayMatch) {
    runway = `${runwayMatch[1]} ACTIVE`;
  }
  
  // Parse temperature (format: 13/11 where first is temp, second is dewpoint)
  const tempMatch = content.match(/(\d{2})\/\d{2}/);
  if (tempMatch) {
    temperature = `${tempMatch[1]}°C`;
  }
  
  return {
    airport: atisInfo.airport,
    info: `INFO ${atisInfo.letter}`,
    wind: wind,
    qnh: qnh,
    runway: runway,
    conditions: conditions,
    temperature: temperature,
    timestamp: new Date().toLocaleTimeString(),
    raw: content
  };
};

// Connect to PTFS WebSocket for real ATIS data
const connectToPTFSWebSocket = () => {
  console.log('🔌 Connecting to PTFS WebSocket...');
  
  const ws = new WebSocket('wss://24data.ptfs.app/wss', {
    headers: {
      'Origin': '' // Empty origin as required by PTFS API
    }
  });
  
  ws.on('open', () => {
    console.log('✅ Connected to PTFS WebSocket');
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.t === 'ATIS') {
        const atisInfo = message.d;
        const parsedAtis = parseAtisContent(atisInfo);
        
        // Store the ATIS data
        ptfsAtisData[atisInfo.airport] = parsedAtis;
        
        // Update connected users at this airport
        if (airportData[atisInfo.airport]) {
          airportData[atisInfo.airport].atis = parsedAtis;
          io.to(atisInfo.airport).emit("atisUpdate", parsedAtis);
        }
        
        console.log(`📡 ATIS update for ${atisInfo.airport}: INFO ${atisInfo.letter}`);
      }
    } catch (error) {
      console.error('Error parsing PTFS WebSocket message:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ PTFS WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 PTFS WebSocket closed, attempting to reconnect in 10 seconds...');
    setTimeout(connectToPTFSWebSocket, 10000);
  });
};

// Initialize PTFS WebSocket connection
connectToPTFSWebSocket();

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
        atis: ptfsAtisData[data.airport] || {
          airport: data.airport,
          info: 'INFO ALPHA',
          wind: 'CALM',
          qnh: '1013',
          runway: 'UNKNOWN',
          conditions: 'CAVOK',
          temperature: 'N/A',
          timestamp: new Date().toLocaleTimeString()
        }
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