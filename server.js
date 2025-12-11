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

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Discord Strategy - Dynamic callback URL based on environment
const getCallbackURL = () => {
  if (process.env.DISCORD_CALLBACK_URL) {
    return process.env.DISCORD_CALLBACK_URL;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/auth/discord/callback`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    // Remove any port from the domain
    const domain = process.env.REPLIT_DEV_DOMAIN.split(':')[0];
    return `https://${domain}/auth/discord/callback`;
  }
  if (process.env.REPLIT_DOMAINS) {
    // Remove any port from the domain
    const domain = process.env.REPLIT_DOMAINS.split(',')[0].split(':')[0];
    return `https://${domain}/auth/discord/callback`;
  }
  // Fallback for local development
  return 'http://localhost:5000/auth/discord/callback';
};

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID || 'your-discord-client-id',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || 'your-discord-client-secret',
  callbackURL: getCallbackURL(),
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

console.log('🔐 Discord OAuth callback URL:', getCallbackURL());

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

  // Initialize all airports with zero counts (including atc)
  const allAirports = ["IRFD", "IZOL", "IPPH", "IGRV", "ISAU", "IBTH", "ISKP", "IGAR", "IBLT", "IMLR", "ITRC", "IDCS", "ITKO", "IJAF", "ISCM", "IHEN", "ILAR", "IIAB", "IPAP"];
  allAirports.forEach(airport => {
    counts[airport] = { pilots: 0, groundCrew: 0, atc: 0 };
  });

  // Count users by airport and mode
  for (const [socketId, userData] of connectedUsers) {
    if (userData.airport && userData.mode) {
      if (!counts[userData.airport]) {
        counts[userData.airport] = { pilots: 0, groundCrew: 0, atc: 0 };
      }

      if (userData.mode === 'pilot') {
        counts[userData.airport].pilots++;
      } else if (userData.mode === 'groundcrew') {
        counts[userData.airport].groundCrew++;
      } else if (userData.mode === 'atc') {
        counts[userData.airport].atc++;
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
const claimedCallsigns = {}; // Store callsign data

// ATC Mode data storage
let ptfsAtcData = {}; // Store ATC data per airport { airport: { callsign, username, ... } }
let ptfsFlightPlans = {}; // Store flight plans per airport { airport: [flightPlans] }
const OWNER_DISCORD_ID = "848356730256883744"; // Owner has full access to all ATC modes

// Initialize flight strips storage for ATC mode
const atcFlightStrips = {}; // { airport: { waiting: [], cleared: [], taxi: [] } }

const initializeAtcData = (airport) => {
  if (!atcFlightStrips[airport]) {
    atcFlightStrips[airport] = {
      waiting: [],
      cleared: [],
      taxi: []
    };
  }
  if (!ptfsFlightPlans[airport]) {
    ptfsFlightPlans[airport] = [];
  }
};

// Parse ATIS content to extract useful information
// Ground crew callsign management with sequential numbering
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

  // Get current assignments and sort by number to maintain order
  const currentAssignments = Array.from(airportData[airport].groundCrewCallsigns.entries())
    .sort((a, b) => {
      const numA = parseInt(a[0].split(' ')[1]);
      const numB = parseInt(b[0].split(' ')[1]);
      return numA - numB;
    });

  // Assign the next sequential number
  const nextNumber = currentAssignments.length + 1;
  const newCallsign = `Ground ${nextNumber}`;
  airportData[airport].groundCrewCallsigns.set(newCallsign, userId);
  
  return newCallsign;
};

const releaseGroundCrewCallsign = (airport, userId) => {
  if (!airportData[airport].groundCrewCallsigns) return;

  // Find and remove the user's callsign
  let removedCallsign = null;
  for (const [callsign, assignedUserId] of airportData[airport].groundCrewCallsigns) {
    if (assignedUserId === userId) {
      airportData[airport].groundCrewCallsigns.delete(callsign);
      removedCallsign = callsign;
      break;
    }
  }

  if (!removedCallsign) return;

  // Get remaining assignments and sort by current number
  const remainingAssignments = Array.from(airportData[airport].groundCrewCallsigns.entries())
    .sort((a, b) => {
      const numA = parseInt(a[0].split(' ')[1]);
      const numB = parseInt(b[0].split(' ')[1]);
      return numA - numB;
    });

  // Clear all current assignments
  airportData[airport].groundCrewCallsigns.clear();

  // Reassign with sequential numbers starting from 1
  remainingAssignments.forEach(([oldCallsign, assignedUserId], index) => {
    const newCallsign = `Ground ${index + 1}`;
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
      }

      // Handle Controllers data (Position[])
      if (message.t === 'CONTROLLERS') {
        const positions = message.d;
        if (Array.isArray(positions)) {
          // Group positions by airport for processing
          const airportsUpdated = new Set();
          
          // Process each controller position
          positions.forEach(position => {
            const airport = position.airport;
            if (airport) {
              // Initialize airport ATC data structure if needed
              if (!ptfsAtcData[airport]) {
                ptfsAtcData[airport] = {
                  positions: {},
                  timestamp: new Date().toISOString()
                };
              }
              
              // Store data per position type (GND, TWR, CTR)
              const positionType = position.position || 'GND';
              ptfsAtcData[airport].positions[positionType] = {
                holder: position.holder,
                claimable: position.claimable,
                queue: position.queue || []
              };
              ptfsAtcData[airport].timestamp = new Date().toISOString();
              
              // Set primary controller info (prefer TWR over GND)
              if (position.holder) {
                if (!ptfsAtcData[airport].username || positionType === 'TWR') {
                  ptfsAtcData[airport].callsign = position.holder;
                  ptfsAtcData[airport].username = position.holder;
                  ptfsAtcData[airport].position = positionType;
                }
              }
              
              airportsUpdated.add(airport);
            }
          });
          
          // Emit updates to all affected airports
          airportsUpdated.forEach(airport => {
            io.to(`atc-${airport}`).emit("atcDataUpdate", ptfsAtcData[airport]);
          });
          
          console.log(`🎧 Controllers update received: ${positions.length} positions for ${airportsUpdated.size} airports`);
        }
      }

      // Handle Flight Plan data - using correct event type and field names per API docs
      if (message.t === 'FLIGHT_PLAN' || message.t === 'EVENT_FLIGHT_PLAN') {
        const fpInfo = message.d;
        // API uses 'departing' field for departure airport
        const airport = fpInfo.departing;
        
        if (airport) {
          initializeAtcData(airport);
          
          const flightStrip = {
            id: `FP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            callsign: fpInfo.callsign || fpInfo.realcallsign,
            aircraft: fpInfo.aircraft,
            departure: fpInfo.departing,
            destination: fpInfo.arriving,
            route: fpInfo.route || 'N/A',
            altitude: fpInfo.flightlevel ? `FL${fpInfo.flightlevel}` : '',
            flightRules: fpInfo.flightrules || 'IFR',
            robloxName: fpInfo.robloxName,
            notes: '',
            status: 'waiting',
            timestamp: new Date().toISOString(),
            filedAt: new Date().toLocaleTimeString()
          };

          // Add to waiting column
          atcFlightStrips[airport].waiting.push(flightStrip);
          
          // Emit to ATC mode users at the departure airport
          io.to(`atc-${airport}`).emit("flightStripUpdate", atcFlightStrips[airport]);
          console.log(`✈️ Flight plan filed for ${airport}: ${flightStrip.callsign} -> ${flightStrip.destination}`);
        }
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

// Retry logic with exponential backoff for rate limiting
const authenticateWithRetry = (req, res, next, retryCount = 0, maxRetries = 3) => {
  passport.authenticate("discord", (err, user, info) => {
    console.log("==== DISCORD OAUTH RAW ERROR ====");
    console.log(err);
    console.log("=================================");

    // Check if it's a rate limit error (429)
    if (err && err.oauthError && err.oauthError.statusCode === 429) {
      if (retryCount < maxRetries) {
        // Calculate exponential backoff: 2^retryCount seconds
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Rate limited (429). Retrying in ${delayMs / 1000}s (attempt ${retryCount + 1}/${maxRetries})`);

        // Show a user-friendly retry page with auto-redirect
        const retryUrl = `/auth/discord/callback?code=${req.query.code}&state=${req.query.state}&retry=${retryCount + 1}`;
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Discord Authentication - Retrying...</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 400px; margin: 0 auto; }
                .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Discord Authentication</h2>
                <p>Server is being rate-limited. Retrying...</p>
                <p>Attempt ${retryCount + 1} of ${maxRetries}</p>
                <div class="spinner"></div>
                <p>Please wait. You'll be redirected shortly.</p>
              </div>
              <script>
                setTimeout(() => {
                  window.location.href = '${retryUrl}';
                }, ${delayMs});
              </script>
            </body>
          </html>
        `);
      } else {
        console.log(`❌ Rate limit persisted after ${maxRetries} retries`);
        return res.status(429).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Discord Authentication Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 400px; margin: 0 auto; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Authentication Failed</h2>
                <p>Discord is rate-limiting requests. This is a temporary issue.</p>
                <p><strong>Please try again in 1-2 minutes.</strong></p>
                <p><a href="/">Back to Home</a></p>
              </div>
            </body>
          </html>
        `);
      }
    }

    if (err) {
      return res.status(500).send("DISCORD ERROR: " + JSON.stringify(err, null, 2));
    }

    if (!user) {
      return res.status(401).send("No user returned");
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/");
    });
  })(req, res, next);
};

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get("/auth/discord/callback", (req, res, next) => {
  const retryCount = parseInt(req.query.retry || 0);
  authenticateWithRetry(req, res, next, retryCount);
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Helper function to check if a Discord user is currently a controller using PTFS API
const checkIsController = async (discordId) => {
  try {
    const response = await fetch(`https://24data.ptfs.app/is-controller/${discordId}`);
    if (response.ok) {
      const result = await response.json();
      return result === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking controller status:', error);
    return false;
  }
};

// ATC Mode access check - uses PTFS /is-controller API and local WebSocket data
app.get('/api/atc-access/:airport', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated', hasAccess: false });
  }
  
  const { airport } = req.params;
  const userId = req.user.id;
  
  // Owner always has access
  if (userId === OWNER_DISCORD_ID) {
    return res.json({ 
      hasAccess: true, 
      reason: 'owner',
      atcData: ptfsAtcData[airport] || null
    });
  }
  
  // Check using PTFS /is-controller API to verify this Discord user is a controller
  const isController = await checkIsController(userId);
  
  if (isController) {
    // User is verified as an active controller via PTFS API
    // Now check if they're controlling the specific airport requested
    const atcForAirport = ptfsAtcData[airport];
    
    if (atcForAirport) {
      // Check if the user's Discord username matches the ATC for this airport
      const userMatches = req.user.username && 
        (req.user.username.toLowerCase() === atcForAirport.username?.toLowerCase() ||
         req.user.username.toLowerCase() === atcForAirport.callsign?.toLowerCase());
      
      if (userMatches) {
        return res.json({ 
          hasAccess: true, 
          reason: 'active_atc_verified',
          atcData: atcForAirport
        });
      }
    }
    
    // User is a controller but not for this specific airport
    return res.json({ 
      hasAccess: false, 
      reason: 'controller_different_airport',
      currentAtc: atcForAirport?.callsign || atcForAirport?.username || null
    });
  }
  
  // Check local WebSocket data as fallback
  const atcForAirport = ptfsAtcData[airport];
  
  if (atcForAirport) {
    // Check if the user's Discord username matches the ATC username
    const userMatches = req.user.username && 
      (req.user.username.toLowerCase() === atcForAirport.username?.toLowerCase() ||
       req.user.username.toLowerCase() === atcForAirport.callsign?.toLowerCase());
    
    if (userMatches) {
      return res.json({ 
        hasAccess: true, 
        reason: 'active_atc',
        atcData: atcForAirport
      });
    }
    
    return res.json({ 
      hasAccess: false, 
      reason: 'not_authorized',
      currentAtc: atcForAirport?.callsign || atcForAirport?.username
    });
  }
  
  // No active ATC detected for this airport
  return res.json({ 
    hasAccess: true, 
    reason: 'no_active_atc',
    atcData: null
  });
});

// Get ATC data for an airport
app.get('/api/atc-data/:airport', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { airport } = req.params;
  initializeAtcData(airport);
  
  res.json({
    atcInfo: ptfsAtcData[airport] || null,
    flightStrips: atcFlightStrips[airport] || { waiting: [], cleared: [], taxi: [] },
    stands: airportData[airport]?.stands || {},
    requests: airportData[airport]?.requests || []
  });
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

  socket.on("userMode", ({ mode, airport, userId }) => {
    // Initialize airport data if needed
    initializeAirportData(airport);
    
    const userData = connectedUsers.get(socket.id) || {};
    userData.mode = mode;
    userData.airport = airport;
    userData.userId = userId;
    connectedUsers.set(socket.id, userData);

    // Join the airport room
    socket.join(airport);

    console.log(`User ${userData.username || userId} set mode to ${mode} at ${airport}`);

    // Send current airport data to the user
    socket.emit("standUpdate", airportData[airport].stands);
    socket.emit("serviceUpdate", airportData[airport].requests);

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

    // Emit to users at the same airport and ATC
    io.to(airport).emit("standUpdate", airportData[airport].stands);
    io.to(`atc-${airport}`).emit("standUpdate", airportData[airport].stands);

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
      
      // Broadcast only to the airport room - ATC users are also in this room
      // so they'll receive messages without needing a separate emit
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

    const serviceRequest = {
      ...req,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      requestedBy: socket.id
    };

    airportData[req.airport].requests.push(serviceRequest);
    io.to(req.airport).emit("serviceUpdate", airportData[req.airport].requests);
    io.to(`atc-${req.airport}`).emit("serviceUpdate", airportData[req.airport].requests);

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
    const { requestId, action, crewMember, airport: dataAirport } = data;
    const userInfo = connectedUsers.get(socket.id);

    // Use airport from data payload, fallback to user's airport (for ATC mode compatibility)
    const airport = dataAirport || userInfo?.airport || userInfo?.atcAirport;

    if (!airport || !airportData[airport]) {
      // Initialize airport data if needed
      if (airport) {
        initializeAirportData(airport);
      } else {
        socket.emit("error", { message: "Invalid airport or user not properly connected" });
        return;
      }
    }

    const request = airportData[airport].requests.find(r => r.id === requestId);
    if (request) {
      request.status = action;
      request.handledBy = crewMember;
      request.handledAt = new Date().toLocaleTimeString();

      io.to(airport).emit("serviceUpdate", airportData[airport].requests);
      io.to(`atc-${airport}`).emit("serviceUpdate", airportData[airport].requests);

      io.to(airport).emit("chatUpdate", {
        text: `${crewMember} has ${action.toLowerCase()} ${request.service} service for ${request.flight}`,
        sender: "GROUND CREW",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "groundcrew",
        priority: "normal"
      });
    } else {
      console.log(`Service action failed: Request ${requestId} not found at ${airport}`);
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
      io.to(`atc-${airport}`).emit("standUpdate", airportData[airport].stands);

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

    const request = airportData[airport].requests.find(r => r.id === requestId);
    if (request) {
      request.assignedCrew = assignedCrew;
      request.assignedBy = assignedBy;
      request.assignedAt = new Date().toLocaleTimeString();

      io.to(airport).emit("serviceUpdate", airportData[airport].requests);
      io.to(`atc-${airport}`).emit("serviceUpdate", airportData[airport].requests);

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

  socket.on("requestGroundCallsign", (data) => {
    const { userId, airport } = data;
    
    if (airport && airportData[airport]) {
      const callsign = assignGroundCrewCallsign(airport, userId);
      socket.emit("callsignAssigned", { callsign });
      
      console.log(`Ground callsign ${callsign} assigned to user ${userId} at ${airport}`);
    }
  });

  // ATC Mode socket events
  // ATC mode allows users to view and manage the airport from a controller perspective
  // We preserve the user's original mode/airport and restore it when leaving ATC
  socket.on("joinAtcMode", (data) => {
    const { airport, userId, username } = data;
    
    if (airport) {
      initializeAirportData(airport);
      initializeAtcData(airport);
      
      const currentUserInfo = connectedUsers.get(socket.id);
      
      // Leave any previous ATC rooms if switching airports in ATC mode
      if (currentUserInfo && currentUserInfo.atcAirport && currentUserInfo.atcAirport !== airport) {
        socket.leave(`atc-${currentUserInfo.atcAirport}`);
        // Leave the old ATC airport room if we had joined it
        if (currentUserInfo.atcAirport !== currentUserInfo.originalAirport) {
          socket.leave(currentUserInfo.atcAirport);
        }
      }
      
      // Join the ATC-specific room
      socket.join(`atc-${airport}`);
      
      // Join the main airport room for the ATC airport (if different from original)
      const originalAirport = currentUserInfo?.airport || currentUserInfo?.originalAirport;
      if (airport !== originalAirport) {
        socket.join(airport);
      }
      
      if (currentUserInfo) {
        // User has existing mode - save original state if not already saved
        if (!currentUserInfo.originalMode) {
          currentUserInfo.originalMode = currentUserInfo.mode;
          currentUserInfo.originalAirport = currentUserInfo.airport;
        }
        currentUserInfo.inAtcMode = true;
        currentUserInfo.atcAirport = airport;
      } else {
        // User entered ATC directly without prior mode selection
        connectedUsers.set(socket.id, {
          userId,
          username,
          airport,
          mode: 'atc',
          inAtcMode: true,
          atcAirport: airport,
          originalMode: null, // No original mode - pure ATC user
          originalAirport: null
        });
        broadcastUserCounts();
      }
      
      // Send initial data
      socket.emit("atcInitialData", {
        flightStrips: atcFlightStrips[airport],
        stands: airportData[airport]?.stands || {},
        requests: airportData[airport]?.requests || [],
        atcInfo: ptfsAtcData[airport] || null
      });
      
      console.log(`🎧 ${username} joined ATC mode for ${airport}`);
    }
  });

  socket.on("leaveAtcMode", (data) => {
    const { airport, username } = data;
    if (airport) {
      // Leave the ATC-specific room
      socket.leave(`atc-${airport}`);
      
      const currentUserInfo = connectedUsers.get(socket.id);
      if (currentUserInfo) {
        // Leave the ATC airport room if it's different from our original airport
        if (currentUserInfo.originalAirport && airport !== currentUserInfo.originalAirport) {
          socket.leave(airport);
        }
        
        // Restore original state or clean up
        if (currentUserInfo.originalMode) {
          // User had an original mode - restore it
          currentUserInfo.mode = currentUserInfo.originalMode;
          currentUserInfo.airport = currentUserInfo.originalAirport;
          currentUserInfo.inAtcMode = false;
          currentUserInfo.atcAirport = null;
          currentUserInfo.originalMode = null;
          currentUserInfo.originalAirport = null;
        } else {
          // Pure ATC user - remove them entirely
          connectedUsers.delete(socket.id);
          broadcastUserCounts();
        }
      }
      
      console.log(`🎧 ${username} left ATC mode for ${airport}`);
    }
  });

  socket.on("moveFlightStrip", (data) => {
    const { airport, stripId, fromColumn, toColumn } = data;
    
    if (!airport || !atcFlightStrips[airport]) return;
    
    const strips = atcFlightStrips[airport];
    const fromArray = strips[fromColumn];
    const toArray = strips[toColumn];
    
    if (!fromArray || !toArray) return;
    
    const stripIndex = fromArray.findIndex(s => s.id === stripId);
    if (stripIndex === -1) return;
    
    const [strip] = fromArray.splice(stripIndex, 1);
    strip.status = toColumn;
    strip.movedAt = new Date().toLocaleTimeString();
    toArray.push(strip);
    
    io.to(`atc-${airport}`).emit("flightStripUpdate", atcFlightStrips[airport]);
    console.log(`✈️ Flight strip ${strip.callsign} moved to ${toColumn} at ${airport}`);
  });

  socket.on("updateFlightStripNotes", (data) => {
    const { airport, stripId, notes } = data;
    
    if (!airport || !atcFlightStrips[airport]) return;
    
    const strips = atcFlightStrips[airport];
    for (const column of ['waiting', 'cleared', 'taxi']) {
      const strip = strips[column].find(s => s.id === stripId);
      if (strip) {
        strip.notes = notes;
        io.to(`atc-${airport}`).emit("flightStripUpdate", atcFlightStrips[airport]);
        break;
      }
    }
  });

  socket.on("deleteFlightStrip", (data) => {
    const { airport, stripId } = data;
    
    if (!airport || !atcFlightStrips[airport]) return;
    
    const strips = atcFlightStrips[airport];
    for (const column of ['waiting', 'cleared', 'taxi']) {
      const index = strips[column].findIndex(s => s.id === stripId);
      if (index !== -1) {
        const deleted = strips[column].splice(index, 1)[0];
        io.to(`atc-${airport}`).emit("flightStripUpdate", atcFlightStrips[airport]);
        console.log(`🗑️ Flight strip ${deleted.callsign} deleted at ${airport}`);
        break;
      }
    }
  });

  socket.on("atcServiceRequest", (data) => {
    const { airport, stand, service, flight, requestedBy } = data;
    
    if (!airport || !airportData[airport]) {
      initializeAirportData(airport);
    }
    
    const serviceRequest = {
      id: Date.now(),
      stand,
      service,
      flight,
      status: "REQUESTED",
      timestamp: new Date().toLocaleTimeString(),
      requestedBy,
      source: 'atc'
    };
    
    airportData[airport].requests.push(serviceRequest);
    io.to(airport).emit("serviceUpdate", airportData[airport].requests);
    io.to(`atc-${airport}`).emit("serviceUpdate", airportData[airport].requests);
    
    io.to(airport).emit("chatUpdate", {
      text: `ATC requested ${service} service for ${flight} at ${stand}`,
      sender: "ATC CONTROL",
      stand: stand,
      airport: airport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system",
      priority: "high"
    });
  });

  socket.on("atcRemoveServiceRequest", (data) => {
    const { airport, requestId, removedBy } = data;
    
    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport" });
      return;
    }
    
    const requestIndex = airportData[airport].requests.findIndex(r => r.id === requestId);
    if (requestIndex !== -1) {
      const request = airportData[airport].requests[requestIndex];
      airportData[airport].requests.splice(requestIndex, 1);
      
      io.to(airport).emit("serviceUpdate", airportData[airport].requests);
      io.to(`atc-${airport}`).emit("serviceUpdate", airportData[airport].requests);
      
      io.to(airport).emit("chatUpdate", {
        text: `${removedBy} removed ${request.service} request for ${request.flight}`,
        sender: "ATC CONTROL",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }
  });

  socket.on("atcCompleteServiceRequest", (data) => {
    const { airport, requestId, completedBy } = data;
    
    if (!airport || !airportData[airport]) {
      socket.emit("error", { message: "Invalid airport" });
      return;
    }
    
    const request = airportData[airport].requests.find(r => r.id === requestId);
    if (request) {
      request.status = "COMPLETED";
      request.completedBy = completedBy;
      request.completedAt = new Date().toLocaleTimeString();
      
      io.to(airport).emit("serviceUpdate", airportData[airport].requests);
      io.to(`atc-${airport}`).emit("serviceUpdate", airportData[airport].requests);
      
      io.to(airport).emit("chatUpdate", {
        text: `${completedBy} marked ${request.service} for ${request.flight} as completed`,
        sender: "ATC CONTROL",
        stand: request.stand,
        airport: airport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }
  });

  // Add a blank flight strip for manual entry
  socket.on("addBlankFlightStrip", (data) => {
    const { airport } = data;
    
    if (!airport) return;
    initializeAtcData(airport);
    
    const blankStrip = {
      id: `STRIP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      callsign: '',
      aircraft: '',
      departure: airport,
      destination: '',
      route: '',
      altitude: '',
      squawk: '',
      remarks: '',
      notes: '',
      status: 'waiting',
      timestamp: new Date().toISOString(),
      filedAt: new Date().toLocaleTimeString()
    };
    
    atcFlightStrips[airport].waiting.push(blankStrip);
    io.to(`atc-${airport}`).emit("flightStripUpdate", atcFlightStrips[airport]);
    console.log(`✈️ Blank flight strip added for ${airport}`);
  });

  socket.on("atcAddPlane", (data) => {
    const { airport, stand, flight, aircraft, addedBy } = data;
    
    if (!airport || !stand) return;
    initializeAirportData(airport);
    
    const standData = {
      flight,
      aircraft,
      pilot: addedBy,
      userId: `atc-${Date.now()}`,
      claimedAt: new Date().toLocaleTimeString(),
      addedByAtc: true
    };
    
    airportData[airport].stands[stand] = standData;
    io.to(airport).emit("standUpdate", airportData[airport].stands);
    io.to(`atc-${airport}`).emit("standUpdate", airportData[airport].stands);
    console.log(`✈️ ATC added plane ${flight} to ${stand} at ${airport}`);
  });

  socket.on("atcRemovePlane", (data) => {
    const { airport, stand, removedBy } = data;
    
    if (!airport || !stand) return;
    if (!airportData[airport]) return;
    
    delete airportData[airport].stands[stand];
    io.to(airport).emit("standUpdate", airportData[airport].stands);
    io.to(`atc-${airport}`).emit("standUpdate", airportData[airport].stands);
    console.log(`❌ ATC removed plane from ${stand} at ${airport}`);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PTFS Ground Services System running on port ${PORT}`);
  console.log(`🔗 Access at: http://localhost:${PORT}`);
});