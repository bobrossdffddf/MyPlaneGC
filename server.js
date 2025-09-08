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
let airportData = {}; // Structure: { airport: { stands: {}, requests: [], users: new Map(), atis: {}, groundCrewCallsigns: new Map() } }

// Initialize airport data when needed
const initializeAirportData = (airport) => {
  if (!airportData[airport]) {
    airportData[airport] = {
      stands: {},
      requests: [],
      users: new Map(),
      atis: {},
      groundCrewCallsigns: new Map()
    };
  }
};
// Store user data with callsigns
const connectedUsers = new Map();

// Function to get user counts for all airports
const getUserCounts = () => {
  const counts = {};

  // Initialize all airports with zero counts
  const allAirports = ["IRFD", "IZOL", "IPPH", "IGRV", "ISAU", "IBTH", "ISKP", "IGAR", "IBLT", "IMLR", "ITRC", "IDCS", "ITKO", "IJAF", "ISCM", "IHEN", "ILAR", "IIAB", "IPAP"];
  allAirports.forEach(airport => {
    counts[airport] = { pilots: 0, groundCrew: 0 };
  });

  // Count users by airport and mode
  for (const [socketId, userData] of connectedUsers) {
    if (userData.airport && userData.mode) {
      if (!counts[userData.airport]) {
        counts[userData.airport] = { pilots: 0, groundCrew: 0 };
      }

      if (userData.mode === 'pilot') {
        counts[userData.airport].pilots++;
      } else if (userData.mode === 'groundcrew') {
        counts[userData.airport].groundCrew++;
      }
    }
  }

  return counts;
};

// Function to broadcast user counts to all clients
const broadcastUserCounts = () => {
  const counts = getUserCounts();
  io.emit("userCountUpdate", counts);
};


let ptfsAtisData = {}; // Store real ATIS data from PTFS
let ptfsFlightPlans = []; // Store real flight plan data from PTFS
const claimedCallsigns = {}; // Store callsign data

// Parse ATIS content to extract useful information
// Ground crew callsign management
const assignGroundCrewCallsign = (airport, userId) => {
  if (!airportData[airport].groundCrewCallsigns) {
    airportData[airport].groundCrewCallsigns = new Map();
  }

  // Check if user already has a callsign
  for (const [callsign, assignedUserId] of airportData[airport].groundCrewCallsigns) {
    if (assignedUserId === userId) {
      return callsign;
    }
  }

  // Find the lowest available callsign number
  let callsignNumber = 1;
  while (airportData[airport].groundCrewCallsigns.has(`GROUND ${callsignNumber}`)) {
    callsignNumber++;
  }

  const newCallsign = `GROUND ${callsignNumber}`;
  airportData[airport].groundCrewCallsigns.set(newCallsign, userId);
  return newCallsign;
};

const releaseGroundCrewCallsign = (airport, userId) => {
  if (!airportData[airport].groundCrewCallsigns) return;

  // Find and remove the user's callsign
  for (const [callsign, assignedUserId] of airportData[airport].groundCrewCallsigns) {
    if (assignedUserId === userId) {
      airportData[airport].groundCrewCallsigns.delete(callsign);
      break;
    }
  }

  // Reassign callsigns to maintain sequential numbering
  const remainingAssignments = Array.from(airportData[airport].groundCrewCallsigns.entries())
    .sort((a, b) => {
      const numA = parseInt(a[0].split(' ')[1]);
      const numB = parseInt(b[0].split(' ')[1]);
      return numA - numB;
    });

  airportData[airport].groundCrewCallsigns.clear();

  remainingAssignments.forEach(([oldCallsign, assignedUserId], index) => {
    const newCallsign = `GROUND ${index + 1}`;
    airportData[airport].groundCrewCallsigns.set(newCallsign, assignedUserId);

    // Notify the user of their new callsign if it changed
    if (oldCallsign !== newCallsign) {
      const userSocket = Array.from(io.sockets.sockets.values())
        .find(socket => connectedUsers.get(socket.id)?.userId === assignedUserId);

      if (userSocket) {
        userSocket.emit("callsignUpdate", { newCallsign });
      }
    }
  });
};

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

  // Parse runway information (multiple patterns)
  const runwayMatch = content.match(/(?:DEP RWY|ARR RWY|RWY|RUNWAY)\s+(\d{2}[LRC]?)/i) ||
                     content.match(/(\d{2}[LRC]?)\s+(?:IN USE|ACTIVE)/i) ||
                     content.match(/LAND\s+RWY\s+(\d{2}[LRC]?)/i);
  if (runwayMatch) {
    runway = `${runwayMatch[1]} ACTIVE`;
  } else {
    // Try to extract any two-digit runway number
    const anyRunway = content.match(/\b(\d{2}[LRC]?)\b/);
    if (anyRunway) {
      runway = `${anyRunway[1]} ACTIVE`;
    }
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
      } else if (message.t === 'FLIGHT_PLAN' || message.t === 'EVENT_FLIGHT_PLAN') {
        const flightPlan = message.d;
        
        // Store flight plan and broadcast to all connected ATC controllers
        ptfsFlightPlans.push({
          ...flightPlan,
          timestamp: new Date().toISOString(),
          id: `${flightPlan.callsign}-${Date.now()}`
        });

        // Keep only last 100 flight plans to prevent memory issues
        if (ptfsFlightPlans.length > 100) {
          ptfsFlightPlans = ptfsFlightPlans.slice(-100);
        }

        // Broadcast to all ATC controllers
        io.emit("flightPlanUpdate", ptfsFlightPlans);

        console.log(`✈️ Flight Plan: ${flightPlan.callsign} ${flightPlan.departing} → ${flightPlan.arriving}`);
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

// Serve aircraft SVGs and 3D models
app.use('/aircraft_svgs', express.static(path.join(__dirname, 'aircraft_svgs')));
app.use('/aircraft_models', express.static(path.join(__dirname, 'aircraft_models')));

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

// Aircraft data API with comprehensive realistic data
const aircraftDatabase = {
  "A318": { 
    type: "A318", manufacturer: "Airbus", maxSeats: 132, range: 3100, maxSpeed: 500, cruiseSpeed: 447, 
    engines: 2, fuelCapacity: 24210, maxTakeoffWeight: 68000, maxLandingWeight: 57500, 
    wingspan: 34.1, length: 31.4, height: 12.6, serviceCeiling: 39100, engineType: "V2500/CFM56",
    category: "narrow-body", firstFlight: "2002", variants: ["A318-100"], cargoCapacity: 21.21,
    maxZeroFuelWeight: 57000, operatingEmptyWeight: 39000, maxFuelWeight: 24210, climbRate: 2500
  },
  "A319": { 
    type: "A319", manufacturer: "Airbus", maxSeats: 156, range: 3700, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 24210, maxTakeoffWeight: 75500, maxLandingWeight: 62500,
    wingspan: 35.8, length: 33.8, height: 11.8, serviceCeiling: 39100, engineType: "V2500/CFM56",
    category: "narrow-body", firstFlight: "1995", variants: ["A319-100", "A319neo"], cargoCapacity: 27.62,
    maxZeroFuelWeight: 61000, operatingEmptyWeight: 40800, maxFuelWeight: 24210, climbRate: 2500
  },
  "A320": { 
    type: "A320", manufacturer: "Airbus", maxSeats: 180, range: 3300, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 26020, maxTakeoffWeight: 78000, maxLandingWeight: 66000,
    wingspan: 35.8, length: 37.6, height: 11.8, serviceCeiling: 39100, engineType: "V2500/CFM56",
    category: "narrow-body", firstFlight: "1987", variants: ["A320-200", "A320neo"], cargoCapacity: 37.41,
    maxZeroFuelWeight: 62800, operatingEmptyWeight: 42600, maxFuelWeight: 26020, climbRate: 2500
  },
  "A321": { 
    type: "A321", manufacturer: "Airbus", maxSeats: 220, range: 3200, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 32940, maxTakeoffWeight: 93500, maxLandingWeight: 77800,
    wingspan: 35.8, length: 44.5, height: 11.8, serviceCeiling: 39100, engineType: "V2500/CFM56",
    category: "narrow-body", firstFlight: "1993", variants: ["A321-200", "A321neo", "A321XLR"], cargoCapacity: 51.7,
    maxZeroFuelWeight: 73800, operatingEmptyWeight: 48500, maxFuelWeight: 32940, climbRate: 2500
  },
  "A330": { 
    type: "A330", manufacturer: "Airbus", maxSeats: 440, range: 7250, maxSpeed: 560, cruiseSpeed: 520,
    engines: 2, fuelCapacity: 139090, maxTakeoffWeight: 242000, maxLandingWeight: 187000,
    wingspan: 60.3, length: 63.7, height: 16.9, serviceCeiling: 41000, engineType: "Trent 700/CF6-80E",
    category: "wide-body", firstFlight: "1992", variants: ["A330-200", "A330-300", "A330-900neo"], cargoCapacity: 162,
    maxZeroFuelWeight: 175000, operatingEmptyWeight: 120500, maxFuelWeight: 139090, climbRate: 2000
  },
  "A340": { 
    type: "A340", manufacturer: "Airbus", maxSeats: 440, range: 9000, maxSpeed: 560, cruiseSpeed: 520,
    engines: 4, fuelCapacity: 195300, maxTakeoffWeight: 380000, maxLandingWeight: 265000,
    wingspan: 63.5, length: 75.4, height: 17.1, serviceCeiling: 41000, engineType: "Trent 500/CFM56",
    category: "wide-body", firstFlight: "1991", variants: ["A340-200", "A340-300", "A340-500", "A340-600"], cargoCapacity: 190,
    maxZeroFuelWeight: 250000, operatingEmptyWeight: 170400, maxFuelWeight: 195300, climbRate: 1800
  },
  "A350": { 
    type: "A350", manufacturer: "Airbus", maxSeats: 440, range: 8100, maxSpeed: 560, cruiseSpeed: 520,
    engines: 2, fuelCapacity: 138000, maxTakeoffWeight: 316000, maxLandingWeight: 213000,
    wingspan: 64.8, length: 66.8, height: 17.1, serviceCeiling: 43000, engineType: "Trent XWB",
    category: "wide-body", firstFlight: "2013", variants: ["A350-900", "A350-1000"], cargoCapacity: 162,
    maxZeroFuelWeight: 218000, operatingEmptyWeight: 142400, maxFuelWeight: 138000, climbRate: 2200
  },
  "A380": { 
    type: "A380", manufacturer: "Airbus", maxSeats: 850, range: 8000, maxSpeed: 560, cruiseSpeed: 520,
    engines: 4, fuelCapacity: 84535, maxTakeoffWeight: 575000, maxLandingWeight: 394000,
    wingspan: 79.8, length: 72.7, height: 24.1, serviceCeiling: 43000, engineType: "Trent 900/GP7200",
    category: "double-decker", firstFlight: "2005", variants: ["A380-800"], cargoCapacity: 858,
    maxZeroFuelWeight: 361000, operatingEmptyWeight: 276800, maxFuelWeight: 84535, climbRate: 1500
  },
  "B737-700": { 
    type: "B737-700", manufacturer: "Boeing", maxSeats: 149, range: 3365, maxSpeed: 514, cruiseSpeed: 453,
    engines: 2, fuelCapacity: 26020, maxTakeoffWeight: 70080, maxLandingWeight: 58060,
    wingspan: 35.8, length: 33.6, height: 12.5, serviceCeiling: 41000, engineType: "CFM56-7B",
    category: "narrow-body", firstFlight: "1997", variants: ["B737-700", "B737-700ER"], cargoCapacity: 30.2,
    maxZeroFuelWeight: 54660, operatingEmptyWeight: 38147, maxFuelWeight: 26020, climbRate: 2500
  },
  "B737-800": { 
    type: "B737-800", manufacturer: "Boeing", maxSeats: 189, range: 2935, maxSpeed: 514, cruiseSpeed: 453,
    engines: 2, fuelCapacity: 26020, maxTakeoffWeight: 79010, maxLandingWeight: 66360,
    wingspan: 35.8, length: 39.5, height: 12.5, serviceCeiling: 41000, engineType: "CFM56-7B",
    category: "narrow-body", firstFlight: "1997", variants: ["B737-800", "B737-800BCF"], cargoCapacity: 44.3,
    maxZeroFuelWeight: 61690, operatingEmptyWeight: 41413, maxFuelWeight: 26020, climbRate: 2500
  },
  "B737-900": { 
    type: "B737-900", manufacturer: "Boeing", maxSeats: 220, range: 2800, maxSpeed: 514, cruiseSpeed: 453,
    engines: 2, fuelCapacity: 26020, maxTakeoffWeight: 85130, maxLandingWeight: 71210,
    wingspan: 35.8, length: 42.1, height: 12.5, serviceCeiling: 41000, engineType: "CFM56-7B",
    category: "narrow-body", firstFlight: "2000", variants: ["B737-900", "B737-900ER"], cargoCapacity: 52.5,
    maxZeroFuelWeight: 67130, operatingEmptyWeight: 44676, maxFuelWeight: 26020, climbRate: 2500
  },
  "B747-400": { 
    type: "B747-400", manufacturer: "Boeing", maxSeats: 660, range: 7260, maxSpeed: 570, cruiseSpeed: 533,
    engines: 4, fuelCapacity: 216840, maxTakeoffWeight: 412775, maxLandingWeight: 295745,
    wingspan: 64.4, length: 70.7, height: 19.4, serviceCeiling: 43000, engineType: "CF6-80C2/PW4000",
    category: "wide-body", firstFlight: "1988", variants: ["B747-400", "B747-400ER", "B747-400F"], cargoCapacity: 858,
    maxZeroFuelWeight: 295742, operatingEmptyWeight: 183380, maxFuelWeight: 216840, climbRate: 1800
  },
  "B747-8": { 
    type: "B747-8", manufacturer: "Boeing", maxSeats: 700, range: 7730, maxSpeed: 570, cruiseSpeed: 533,
    engines: 4, fuelCapacity: 238610, maxTakeoffWeight: 447700, maxLandingWeight: 346091,
    wingspan: 68.4, length: 76.3, height: 19.4, serviceCeiling: 43000, engineType: "GEnx-2B67",
    category: "wide-body", firstFlight: "2010", variants: ["B747-8I", "B747-8F"], cargoCapacity: 858,
    maxZeroFuelWeight: 322050, operatingEmptyWeight: 220128, maxFuelWeight: 238610, climbRate: 1800
  },
  "B777-200": { 
    type: "B777-200", manufacturer: "Boeing", maxSeats: 440, range: 5240, maxSpeed: 560, cruiseSpeed: 493,
    engines: 2, fuelCapacity: 117348, maxTakeoffWeight: 297550, maxLandingWeight: 201840,
    wingspan: 60.9, length: 63.7, height: 18.5, serviceCeiling: 43100, engineType: "GE90/PW4000/Trent 800",
    category: "wide-body", firstFlight: "1994", variants: ["B777-200", "B777-200ER", "B777-200LR"], cargoCapacity: 162,
    maxZeroFuelWeight: 181000, operatingEmptyWeight: 138100, maxFuelWeight: 117348, climbRate: 2000
  },
  "B777-300": { 
    type: "B777-300", manufacturer: "Boeing", maxSeats: 550, range: 5845, maxSpeed: 560, cruiseSpeed: 493,
    engines: 2, fuelCapacity: 181280, maxTakeoffWeight: 351500, maxLandingWeight: 251290,
    wingspan: 64.8, length: 73.9, height: 18.5, serviceCeiling: 43100, engineType: "GE90-115B/Trent 800",
    category: "wide-body", firstFlight: "1997", variants: ["B777-300", "B777-300ER"], cargoCapacity: 202,
    maxZeroFuelWeight: 215000, operatingEmptyWeight: 167829, maxFuelWeight: 181280, climbRate: 2000
  },
  "B787-8": { 
    type: "B787-8", manufacturer: "Boeing", maxSeats: 330, range: 7355, maxSpeed: 560, cruiseSpeed: 488,
    engines: 2, fuelCapacity: 126206, maxTakeoffWeight: 227930, maxLandingWeight: 172365,
    wingspan: 60.1, length: 56.7, height: 16.9, serviceCeiling: 43000, engineType: "GEnx-1B/Trent 1000",
    category: "wide-body", firstFlight: "2009", variants: ["B787-8"], cargoCapacity: 137,
    maxZeroFuelWeight: 161000, operatingEmptyWeight: 119950, maxFuelWeight: 126206, climbRate: 2200
  },
  "B787-9": { 
    type: "B787-9", manufacturer: "Boeing", maxSeats: 420, range: 7635, maxSpeed: 560, cruiseSpeed: 488,
    engines: 2, fuelCapacity: 126206, maxTakeoffWeight: 254011, maxLandingWeight: 192776,
    wingspan: 60.1, length: 62.8, height: 16.9, serviceCeiling: 43000, engineType: "GEnx-1B/Trent 1000",
    category: "wide-body", firstFlight: "2013", variants: ["B787-9"], cargoCapacity: 162,
    maxZeroFuelWeight: 181000, operatingEmptyWeight: 128850, maxFuelWeight: 126206, climbRate: 2200
  },
  "B787-10": { 
    type: "B787-10", manufacturer: "Boeing", maxSeats: 440, range: 6430, maxSpeed: 560, cruiseSpeed: 488,
    engines: 2, fuelCapacity: 126206, maxTakeoffWeight: 254011, maxLandingWeight: 192776,
    wingspan: 60.1, length: 68.3, height: 16.9, serviceCeiling: 43000, engineType: "GEnx-1B/Trent 1000",
    category: "wide-body", firstFlight: "2017", variants: ["B787-10"], cargoCapacity: 172,
    maxZeroFuelWeight: 181000, operatingEmptyWeight: 135400, maxFuelWeight: 126206, climbRate: 2200
  },
  "CRJ-200": {
    type: "CRJ-200", manufacturer: "Bombardier", maxSeats: 50, range: 1650, maxSpeed: 490, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 5888, maxTakeoffWeight: 23133, maxLandingWeight: 21319,
    wingspan: 21.2, length: 26.8, height: 6.2, serviceCeiling: 41000, engineType: "CF34-3A1",
    category: "regional", firstFlight: "1991", variants: ["CRJ-200ER", "CRJ-200LR"], cargoCapacity: 8.5,
    maxZeroFuelWeight: 19500, operatingEmptyWeight: 14500, maxFuelWeight: 5888, climbRate: 3000
  },
  "CRJ-700": {
    type: "CRJ-700", manufacturer: "Bombardier", maxSeats: 78, range: 2100, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 9200, maxTakeoffWeight: 34019, maxLandingWeight: 30844,
    wingspan: 23.2, length: 32.3, height: 7.6, serviceCeiling: 41000, engineType: "CF34-8C1",
    category: "regional", firstFlight: "1999", variants: ["CRJ-700", "CRJ-700ER"], cargoCapacity: 15.8,
    maxZeroFuelWeight: 28100, operatingEmptyWeight: 20200, maxFuelWeight: 9200, climbRate: 2800
  },
  "CRJ-900": {
    type: "CRJ-900", manufacturer: "Bombardier", maxSeats: 90, range: 2100, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 9200, maxTakeoffWeight: 38329, maxLandingWeight: 34473,
    wingspan: 24.9, length: 36.4, height: 7.6, serviceCeiling: 41000, engineType: "CF34-8C5",
    category: "regional", firstFlight: "2001", variants: ["CRJ-900", "CRJ-900ER"], cargoCapacity: 21.1,
    maxZeroFuelWeight: 31800, operatingEmptyWeight: 22200, maxFuelWeight: 9200, climbRate: 2800
  },
  "E170": {
    type: "E170", manufacturer: "Embraer", maxSeats: 80, range: 2150, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 9387, maxTakeoffWeight: 37200, maxLandingWeight: 33600,
    wingspan: 26.0, length: 29.9, height: 9.9, serviceCeiling: 41000, engineType: "CF34-8E",
    category: "regional", firstFlight: "2002", variants: ["E170", "E170-STD"], cargoCapacity: 20.1,
    maxZeroFuelWeight: 31000, operatingEmptyWeight: 21800, maxFuelWeight: 9387, climbRate: 2800
  },
  "E175": {
    type: "E175", manufacturer: "Embraer", maxSeats: 88, range: 2200, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 9387, maxTakeoffWeight: 38790, maxLandingWeight: 35300,
    wingspan: 26.0, length: 31.7, height: 9.9, serviceCeiling: 41000, engineType: "CF34-8E",
    category: "regional", firstFlight: "2003", variants: ["E175", "E175-E2"], cargoCapacity: 22.5,
    maxZeroFuelWeight: 32400, operatingEmptyWeight: 22400, maxFuelWeight: 9387, climbRate: 2800
  },
  "E190": {
    type: "E190", manufacturer: "Embraer", maxSeats: 114, range: 2400, maxSpeed: 500, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 13100, maxTakeoffWeight: 51800, maxLandingWeight: 45000,
    wingspan: 28.7, length: 36.2, height: 10.6, serviceCeiling: 41000, engineType: "CF34-10E",
    category: "regional", firstFlight: "2004", variants: ["E190", "E190-E2"], cargoCapacity: 30.1,
    maxZeroFuelWeight: 40800, operatingEmptyWeight: 28200, maxFuelWeight: 13100, climbRate: 2600
  },
  "DHC-8": {
    type: "DHC-8", manufacturer: "De Havilland Canada", maxSeats: 78, range: 1200, maxSpeed: 360, cruiseSpeed: 315,
    engines: 2, fuelCapacity: 2400, maxTakeoffWeight: 29574, maxLandingWeight: 28009,
    wingspan: 27.4, length: 32.8, height: 8.3, serviceCeiling: 25000, engineType: "PW150A",
    category: "turboprop", firstFlight: "1983", variants: ["DHC-8-100", "DHC-8-200", "DHC-8-300", "DHC-8-400"], cargoCapacity: 15.6,
    maxZeroFuelWeight: 25855, operatingEmptyWeight: 17120, maxFuelWeight: 2400, climbRate: 1500
  },
  "ATR-72": {
    type: "ATR-72", manufacturer: "ATR", maxSeats: 78, range: 825, maxSpeed: 320, cruiseSpeed: 275,
    engines: 2, fuelCapacity: 4920, maxTakeoffWeight: 23000, maxLandingWeight: 22500,
    wingspan: 27.1, length: 27.2, height: 7.6, serviceCeiling: 25000, engineType: "PW127",
    category: "turboprop", firstFlight: "1988", variants: ["ATR-72-200", "ATR-72-500", "ATR-72-600"], cargoCapacity: 7.8,
    maxZeroFuelWeight: 20000, operatingEmptyWeight: 13500, maxFuelWeight: 4920, climbRate: 1200
  },
  "MD-80": {
    type: "MD-80", manufacturer: "McDonnell Douglas", maxSeats: 172, range: 2504, maxSpeed: 504, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 20900, maxTakeoffWeight: 67812, maxLandingWeight: 58967,
    wingspan: 32.9, length: 45.1, height: 9.0, serviceCeiling: 37000, engineType: "JT8D-217",
    category: "narrow-body", firstFlight: "1979", variants: ["MD-81", "MD-82", "MD-83", "MD-88"], cargoCapacity: 38.6,
    maxZeroFuelWeight: 52163, operatingEmptyWeight: 35560, maxFuelWeight: 20900, climbRate: 2200
  },
  "MD-90": {
    type: "MD-90", manufacturer: "McDonnell Douglas", maxSeats: 172, range: 2400, maxSpeed: 504, cruiseSpeed: 447,
    engines: 2, fuelCapacity: 20900, maxTakeoffWeight: 70760, maxLandingWeight: 58967,
    wingspan: 32.9, length: 46.5, height: 9.0, serviceCeiling: 37000, engineType: "V2525-D5",
    category: "narrow-body", firstFlight: "1993", variants: ["MD-90-30", "MD-90-30ER"], cargoCapacity: 40.2,
    maxZeroFuelWeight: 54430, operatingEmptyWeight: 39020, maxFuelWeight: 20900, climbRate: 2200
  }
};

app.get('/api/aircraft/:type', (req, res) => {
  const aircraftType = req.params.type;
  const aircraftInfo = aircraftDatabase[aircraftType];

  if (aircraftInfo) {
    res.json(aircraftInfo);
  } else {
    res.status(404).json({ error: 'Aircraft type not found' });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Socket.io handling
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Send current state to new client
  socket.emit("standUpdate", airportData);
  // Send empty array initially as serviceRequests will be handled per airport
  socket.emit("serviceUpdate", []);

  // Send current user counts
  socket.emit("userCountUpdate", getUserCounts());

  socket.on("userMode", ({ mode, airport, userId, position }) => {
    // Initialize airport data if needed
    initializeAirportData(airport);
    
    const userData = connectedUsers.get(socket.id) || {};
    userData.mode = mode;
    userData.airport = airport;
    userData.userId = userId;
    userData.position = position;
    connectedUsers.set(socket.id, userData);

    // Join the airport room
    socket.join(airport);

    console.log(`User ${userData.username || userId} set mode to ${mode} at ${airport}${position ? ` (${position})` : ''}`);

    // Send current airport data to the user
    socket.emit("standUpdate", airportData[airport].stands);
    socket.emit("serviceUpdate", airportData[airport].requests);

    // Send flight plans if user is ATC
    if (mode === 'atc') {
      socket.emit("flightPlanUpdate", ptfsFlightPlans);
    }

    // Broadcast updated user counts
    broadcastUserCounts();
  });

  socket.on("claimStand", (data) => {
    const { stand, flightNumber, aircraft, pilot, userId, airport, allowSwitch } = data;

    if (!airport) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }

    // Initialize airport data if needed
    initializeAirportData(airport);

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

      // Log chat messages to console
      console.log(`💬 [${msg.airport}] ${msg.sender} (${msg.stand || 'GROUND'}): ${msg.text}`);
    }
  });

  socket.on("serviceRequest", (req) => {
    if (!req.airport) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }

    // Initialize airport data if needed
    initializeAirportData(req.airport);

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

  socket.on("removeFromStand", (data) => {
    const { stand, removedBy, airport } = data;

    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }

    const standData = airportData[airport].stands[stand];
    if (standData) {
      const flightNumber = standData.flight;
      const pilot = standData.pilot;

      delete airportData[airport].stands[stand];
      io.to(airport).emit("standUpdate", airportData[airport].stands);

      io.to(airport).emit("chatUpdate", {
        text: `${removedBy} has removed ${flightNumber} from ${stand} (was piloted by ${pilot})`,
        sender: "GROUND CONTROL",
        stand: stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }
  });

  socket.on("assignCrewToTask", (data) => {
    const { requestId, assignedCrew, assignedBy, airport } = data;

    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport selected" });
      return;
    }

    if (airportData[airport].requests[requestId]) {
      airportData[airport].requests[requestId].assignedCrew = assignedCrew;
      airportData[airport].requests[requestId].assignedBy = assignedBy;
      airportData[airport].requests[requestId].assignedAt = new Date().toLocaleTimeString();

      io.to(airport).emit("serviceUpdate", airportData[airport].requests);

      const request = airportData[airport].requests[requestId];
      io.to(airport).emit("chatUpdate", {
        text: `${assignedBy} assigned ${request.service} for ${request.flight} to ${assignedCrew}`,
        sender: "GROUND SUPERVISOR",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "groundcrew"
      });
    }
  });

  // ATC-specific socket handlers
  socket.on("efsUpdate", (updateData) => {
    const { flightPlanId, updates, updatedBy, airport } = updateData;
    
    // Broadcast EFS update to all ATC controllers at the same airport
    io.to(airport).emit("efsUpdate", {
      flightPlanId,
      updates,
      updatedBy,
      timestamp: new Date().toISOString()
    });

    console.log(`📋 EFS Update: ${flightPlanId} by ${updatedBy} at ${airport}`);
  });

  socket.on("efsTransfer", (transferData) => {
    const { flightPlanId, fromPosition, toPosition, transferredBy, airport } = transferData;
    
    // Broadcast EFS transfer to all ATC controllers at the same airport
    io.to(airport).emit("efsTransfer", {
      flightPlanId,
      fromPosition,
      toPosition,
      transferredBy,
      timestamp: new Date().toISOString()
    });

    console.log(`📋 EFS Transfer: ${flightPlanId} from ${fromPosition} to ${toPosition} by ${transferredBy} at ${airport}`);
  });

  socket.on("efsRemove", (removeData) => {
    const { flightPlanId, removedBy, airport } = removeData;
    
    // Broadcast EFS removal to all ATC controllers at the same airport
    io.to(airport).emit("efsRemove", {
      flightPlanId,
      removedBy,
      timestamp: new Date().toISOString()
    });

    console.log(`📋 EFS Removed: ${flightPlanId} by ${removedBy} at ${airport}`);
  });

  socket.on("atcAnnouncement", (announcement) => {
    const { message, from, airport } = announcement;
    
    // Broadcast announcement to all ground crew at the airport
    io.to(airport).emit("atcAnnouncement", {
      message,
      from,
      timestamp: new Date().toISOString(),
      airport
    });

    console.log(`📢 ATC Announcement from ${from} at ${airport}: ${message}`);
  });

  socket.on("disconnect", () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      // Release ground crew callsign if assigned
      if (userInfo.airport && userInfo.mode === 'groundcrew') {
        releaseGroundCrewCallsign(userInfo.airport, userInfo.userId);
      }

      connectedUsers.delete(socket.id);
      console.log(`User ${userInfo.username || 'Unknown'} disconnected`);

      // Broadcast updated user counts
      broadcastUserCounts();
    } else {
      console.log("❌ Unknown user disconnected:", socket.id);
    }

    // Release any stands claimed by this user
    if (userInfo && userInfo.airport && airportData[userInfo.airport]) {
      for (const [stand, info] of Object.entries(airportData[userInfo.airport].stands)) {
        if (info.userId === userInfo.userId) {
          delete airportData[userInfo.airport].stands[stand];
          io.to(userInfo.airport).emit("standUpdate", airportData[userInfo.airport].stands);

          io.to(userInfo.airport).emit("chatUpdate", {
            text: `${info.pilot} has disconnected. ${stand} is now available.`,
            sender: "SYSTEM",
            stand: stand,
            airport: userInfo.airport,
            timestamp: new Date().toLocaleTimeString(),
            mode: "system"
          });

          console.log(`🏢 Stand released: ${stand} at ${userInfo.airport} (was ${info.pilot})`);
        }
      }

      // Remove user from airport data
      airportData[userInfo.airport].users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PTFS Ground Services System running on port ${PORT}`);
  console.log(`🔗 Access at: http://localhost:${PORT}`);
});