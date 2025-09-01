import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getAirportConfig } from "./airportConfig.js";
import "./App.css";

const socket = io();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMode, setUserMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [requests, setRequests] = useState([]);
  const [stands, setStands] = useState({});
  const [selectedStand, setSelectedStand] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAirport, setSelectedAirport] = useState("");
  const [activeTab, setActiveTab] = useState("main");
  const [activeChecklistPhase, setActiveChecklistPhase] = useState("preflight");
  const [aircraftSvg, setAircraftSvg] = useState("");
  const [aircraftData, setAircraftData] = useState(null);
  const [atisData, setAtisData] = useState({
    info: 'INFO BRAVO',
    wind: '270°/08KT',
    qnh: '1013',
    runway: '27 ACTIVE',
    conditions: 'CAVOK',
    temperature: '15°C'
  });
  
  const [weatherRadar, setWeatherRadar] = useState({
    visibility: '10+',
    clouds: 'FEW025 SCT080',
    precipitation: 'NONE',
    turbulence: 'LIGHT',
    windShear: 'NIL'
  });
  
  const [flightTracking, setFlightTracking] = useState({
    departure: null,
    arrival: null,
    route: 'DIRECT',
    estimatedTime: null,
    actualTime: null,
    delay: 0
  });
  const [checklists, setChecklists] = useState({
    preflight: [
      { item: "Aircraft Documents Review", checked: false, category: "Documentation" },
      { item: "Weather & NOTAM Brief", checked: false, category: "Documentation" },
      { item: "Flight Plan Filed", checked: false, category: "Documentation" },
      { item: "Weight & Balance Calculated", checked: false, category: "Documentation" },
      { item: "External Visual Inspection", checked: false, category: "External" },
      { item: "Fuel Quantity & Quality Check", checked: false, category: "External" },
      { item: "Control Surface Movement", checked: false, category: "External" },
      { item: "Tire & Landing Gear Inspection", checked: false, category: "External" },
      { item: "Engine Intake Inspection", checked: false, category: "External" },
      { item: "Cockpit Preparation", checked: false, category: "Cockpit" },
      { item: "Navigation Systems Test", checked: false, category: "Cockpit" },
      { item: "Communication Radio Check", checked: false, category: "Cockpit" },
      { item: "Instrument Panel Check", checked: false, category: "Cockpit" },
      { item: "Emergency Equipment Check", checked: false, category: "Cockpit" }
    ],
    beforestart: [
      { item: "Seat Belts & Harnesses", checked: false, category: "Safety" },
      { item: "Circuit Breakers Check", checked: false, category: "Electrical" },
      { item: "Fuel Pumps ON", checked: false, category: "Fuel" },
      { item: "Mixture Rich", checked: false, category: "Engine" },
      { item: "Propeller High RPM", checked: false, category: "Engine" },
      { item: "Landing Light ON", checked: false, category: "Lights" },
      { item: "Beacon Light ON", checked: false, category: "Lights" },
      { item: "Transponder STBY", checked: false, category: "Avionics" },
      { item: "Flaps Set for Takeoff", checked: false, category: "Controls" },
      { item: "Controls Free & Correct", checked: false, category: "Controls" }
    ],
    beforetakeoff: [
      { item: "Engine Parameters Check", checked: false, category: "Engine" },
      { item: "Flight Controls Check", checked: false, category: "Controls" },
      { item: "Engine Instruments Green", checked: false, category: "Engine" },
      { item: "Navigation Set", checked: false, category: "Navigation" },
      { item: "Autopilot Check", checked: false, category: "Navigation" },
      { item: "Transponder ALT", checked: false, category: "Avionics" },
      { item: "Takeoff Briefing Complete", checked: false, category: "Briefing" },
      { item: "Cabin Secured", checked: false, category: "Safety" },
      { item: "ATC Clearance Received", checked: false, category: "ATC" }
    ],
    cruise: [
      { item: "Cruise Power Set", checked: false, category: "Engine" },
      { item: "Fuel Flow Check", checked: false, category: "Fuel" },
      { item: "Navigation on Track", checked: false, category: "Navigation" },
      { item: "Weather Updates", checked: false, category: "Weather" },
      { item: "Fuel Calculation", checked: false, category: "Fuel" },
      { item: "Position Reports", checked: false, category: "ATC" },
      { item: "Systems Monitoring", checked: false, category: "Systems" }
    ],
    descent: [
      { item: "ATIS/Weather Check", checked: false, category: "Weather" },
      { item: "Approach Briefing", checked: false, category: "Briefing" },
      { item: "Descent Power Set", checked: false, category: "Engine" },
      { item: "Altimeter Set", checked: false, category: "Instruments" },
      { item: "Approach Navigation Set", checked: false, category: "Navigation" },
      { item: "Landing Light ON", checked: false, category: "Lights" },
      { item: "Fuel Quantity Check", checked: false, category: "Fuel" }
    ],
    beforelanding: [
      { item: "Landing Gear DOWN", checked: false, category: "Landing Gear" },
      { item: "Flaps Landing Position", checked: false, category: "Controls" },
      { item: "Propeller High RPM", checked: false, category: "Engine" },
      { item: "Mixture Rich", checked: false, category: "Engine" },
      { item: "Seat Belts Secure", checked: false, category: "Safety" },
      { item: "Final Approach Speed", checked: false, category: "Speed" },
      { item: "Landing Clearance", checked: false, category: "ATC" }
    ],
    afterlanding: [
      { item: "Flaps UP", checked: false, category: "Controls" },
      { item: "Transponder STBY", checked: false, category: "Avionics" },
      { item: "Landing Light OFF", checked: false, category: "Lights" },
      { item: "Strobe Light OFF", checked: false, category: "Lights" },
      { item: "Taxi Clearance", checked: false, category: "ATC" },
      { item: "Ground Frequency", checked: false, category: "ATC" }
    ],
    shutdown: [
      { item: "Parking Brake SET", checked: false, category: "Parking" },
      { item: "Mixture LEAN", checked: false, category: "Engine" },
      { item: "Engine SHUTDOWN", checked: false, category: "Engine" },
      { item: "Electrical OFF", checked: false, category: "Electrical" },
      { item: "Fuel Pumps OFF", checked: false, category: "Fuel" },
      { item: "Master Switch OFF", checked: false, category: "Electrical" },
      { item: "Beacon Light OFF", checked: false, category: "Lights" },
      { item: "Chocks IN", checked: false, category: "Ground" },
      { item: "Tie Downs Secure", checked: false, category: "Ground" },
      { item: "Flight Log Complete", checked: false, category: "Documentation" }
    ]
  });

  const ptfsAirports = [
    "IRFD", "IORE", "IZOL", "ICYP", "IPPH", "IGRV", "ISAU", "IBTH", "ISKP",
    "IGAR", "IBLT", "IMLR", "ITRC", "IDCS", "ITKO", "IJAF", "ISCM", "IBAR",
    "IHEN", "ILAR", "IIAB", "IPAP", "ILKL", "IUFO"
  ];

  const aircraftTypes = [
    "A318", "A319", "A320", "A321", "A330", "A340", "A350", "A380",
    "B737-700", "B737-800", "B737-900", "B747-400", "B747-8", "B777-200",
    "B777-300", "B787-8", "B787-9", "B787-10", "CRJ-200", "CRJ-700",
    "CRJ-900", "E170", "E175", "E190", "DHC-8", "ATR-72", "MD-80", "MD-90"
  ];

  const getCurrentAirportStands = () => {
    if (!selectedAirport) return [];
    return getAirportConfig(selectedAirport).stands;
  };

  // Load aircraft SVG and data when aircraft type changes
  useEffect(() => {
    if (aircraft) {
      // Fetch aircraft SVG
      fetch(`/aircraft_svgs/${aircraft}.svg`)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error('SVG not found');
        })
        .then(svgText => {
          setAircraftSvg(svgText);
        })
        .catch(() => {
          setAircraftSvg(""); // Use default if custom SVG not found
        });

      // Fetch aircraft data from API
      fetch(`/api/aircraft/${aircraft}`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Aircraft data not found');
        })
        .then(data => {
          setAircraftData(data);
        })
        .catch(() => {
          // Use default aircraft data
          setAircraftData({
            type: aircraft,
            manufacturer: aircraft.startsWith('A') ? 'Airbus' : 'Boeing',
            maxSeats: aircraft.includes('380') ? 850 : aircraft.includes('747') ? 660 : 180,
            range: aircraft.includes('787') ? 15750 : 6500,
            maxSpeed: 560,
            engines: aircraft.includes('A380') || aircraft.includes('747') ? 4 : 2,
            fuelCapacity: aircraft.includes('A380') ? 84535 : 26020
          });
        });
    } else {
      setAircraftSvg("");
      setAircraftData(null);
    }
  }, [aircraft]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll messages to bottom
  useEffect(() => {
    const messagesArea = document.querySelector('.messages-area');
    if (messagesArea) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    socket.on("chatUpdate", (msg) => {
      if (!selectedAirport || msg.airport === selectedAirport || (!msg.airport && msg.mode === 'system')) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("serviceUpdate", (req) => {
      setRequests(req);
    });

    socket.on("standUpdate", (standData) => {
      setStands(standData);
    });

    socket.on("atisUpdate", (atis) => {
      if (!selectedAirport || atis.airport === selectedAirport) {
        setAtisData(atis);
      }
    });

    return () => {
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
      socket.off("standUpdate");
      socket.off("atisUpdate");
    };
  }, [selectedAirport]);

  const handleLogin = () => {
    window.location.href = "/auth/discord";
  };

  const selectMode = (mode, airport) => {
    console.log('Selecting mode:', mode, 'for airport:', airport);
    setUserMode(mode);
    setSelectedAirport(airport);
    socket.emit("userMode", { mode, airport, userId: user?.id });
  };

  const claimStand = () => {
    if (selectedStand && flightNumber && aircraft && selectedAirport) {
      socket.emit("claimStand", {
        stand: selectedStand,
        flightNumber,
        aircraft,
        pilot: user?.username,
        userId: user?.id,
        airport: selectedAirport,
        allowSwitch: true
      });
    }
  };

  const sendMessage = () => {
    if (input.trim() === "") return;
    if (userMode === "pilot" && !selectedStand) {
      alert("Please select a stand first to send messages");
      return;
    }
    const message = {
      text: input,
      sender: user?.username,
      stand: userMode === "pilot" ? selectedStand : "GROUND",
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      mode: userMode,
      userId: user?.id
    };
    socket.emit("chatMessage", message);
    setInput("");
  };

  const requestService = (service) => {
    if (!selectedStand) {
      alert("Please select and claim a stand first to request services");
      return;
    }
    
    if (service === "Full Service") {
      // Request multiple services at once
      const fullServices = [
        "Ground Power", "Fuel Service", "Catering", "Passenger Stairs", 
        "Cleaning", "Baggage", "Water Service", "Lavatory Service"
      ];
      
      fullServices.forEach(individualService => {
        socket.emit("serviceRequest", {
          service: individualService,
          stand: selectedStand,
          flight: flightNumber,
          pilot: user?.username,
          airport: selectedAirport,
          timestamp: new Date().toLocaleTimeString(),
          status: "REQUESTED",
          isFullService: true
        });
      });
    } else {
      socket.emit("serviceRequest", {
        service,
        stand: selectedStand,
        flight: flightNumber,
        pilot: user?.username,
        airport: selectedAirport,
        timestamp: new Date().toLocaleTimeString(),
        status: "REQUESTED"
      });
    }
  };

  const handleServiceAction = (requestId, action) => {
    socket.emit("serviceAction", { requestId, action, crewMember: user?.username });
  };

  const toggleChecklistItem = (category, index) => {
    setChecklists(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    }));
    
    // Send system message when checklist item is completed
    const item = checklists[category][index];
    if (!item.checked && selectedStand) {
      socket.emit("chatMessage", {
        text: `✅ ${item.item} - ${category.toUpperCase()} completed`,
        sender: "CHECKLIST",
        stand: selectedStand,
        airport: selectedAirport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "checklist"
      });
    }
  };

  const renderAircraftDisplay = () => {
    if (aircraftSvg) {
      return (
        <div className="aircraft-display-3d">
          <div className="aircraft-3d-container">
            <div dangerouslySetInnerHTML={{ __html: aircraftSvg }} className="custom-aircraft-svg rotating-3d" />
            <div className="aircraft-shadow"></div>
          </div>
          {aircraftData && (
            <div className="aircraft-label">
              <div className="aircraft-type">{aircraftData.type}</div>
              <div className="aircraft-manufacturer">{aircraftData.manufacturer}</div>
              <div className="aircraft-category">{aircraftData.category.toUpperCase()}</div>
            </div>
          )}
        </div>
      );
    }

    // Enhanced 3D fallback SVG with realistic aircraft design
    return (
      <div className="aircraft-display-3d">
        <div className="aircraft-3d-container">
          <svg viewBox="0 0 600 350" className="aircraft-svg rotating-3d">
            <defs>
              <linearGradient id="fuselage3d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="20%" stopColor="#f0f8ff" />
                <stop offset="40%" stopColor="#e6f3ff" />
                <stop offset="60%" stopColor="#b3d9ff" />
                <stop offset="80%" stopColor="#80bfff" />
                <stop offset="100%" stopColor="#4d9fff" />
              </linearGradient>
              <linearGradient id="wing3d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8f9fa" />
                <stop offset="30%" stopColor="#e9ecef" />
                <stop offset="60%" stopColor="#dee2e6" />
                <stop offset="100%" stopColor="#adb5bd" />
              </linearGradient>
              <linearGradient id="engine3d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#495057" />
                <stop offset="50%" stopColor="#343a40" />
                <stop offset="100%" stopColor="#212529" />
              </linearGradient>
              <filter id="shadow3d" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="4" dy="6" stdDeviation="3" floodColor="#000000" floodOpacity="0.4"/>
              </filter>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff9500" floodOpacity="0.3"/>
              </filter>
            </defs>

            {/* Main Fuselage with 3D perspective */}
            <ellipse cx="300" cy="175" rx="180" ry="30" fill="url(#fuselage3d)" stroke="#0066cc" strokeWidth="2" filter="url(#shadow3d)"/>
            <ellipse cx="300" cy="170" rx="175" ry="25" fill="url(#fuselage3d)" stroke="#0088ff" strokeWidth="1"/>
            
            {/* Wings with 3D depth */}
            <path d="M180 175 L180 125 L250 115 L250 175 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            <path d="M180 175 L180 225 L250 235 L250 175 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            <path d="M350 175 L350 140 L420 130 L420 175 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            <path d="M350 175 L350 210 L420 220 L420 175 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            
            {/* Wing tips */}
            <path d="M250 115 L250 100 L260 102 L260 117 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="1"/>
            <path d="M250 235 L250 250 L260 248 L260 233 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="1"/>
            
            {/* Engines with 3D effects */}
            <ellipse cx="200" cy="145" rx="20" ry="12" fill="url(#engine3d)" stroke="#000" strokeWidth="2" filter="url(#shadow3d)"/>
            <ellipse cx="200" cy="205" rx="20" ry="12" fill="url(#engine3d)" stroke="#000" strokeWidth="2" filter="url(#shadow3d)"/>
            <circle cx="200" cy="145" r="8" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1"/>
            <circle cx="200" cy="205" r="8" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1"/>
            
            {/* Cockpit windows */}
            <ellipse cx="480" cy="175" rx="15" ry="10" fill="#000080" stroke="#0066cc" strokeWidth="2" opacity="0.8"/>
            <ellipse cx="465" cy="170" rx="8" ry="6" fill="#000080" stroke="#0066cc" strokeWidth="1" opacity="0.6"/>
            <ellipse cx="465" cy="180" rx="8" ry="6" fill="#000080" stroke="#0066cc" strokeWidth="1" opacity="0.6"/>
            
            {/* Passenger windows */}
            <circle cx="420" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="400" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="380" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="360" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="340" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="320" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="280" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="260" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="240" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            <circle cx="220" cy="165" r="4" fill="#87ceeb" stroke="#4682b4" strokeWidth="1" opacity="0.8"/>
            
            {/* Tail */}
            <path d="M120 175 L80 155 L85 175 L80 195 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            <path d="M110 175 L90 145 L100 175 L90 140 Z" fill="url(#wing3d)" stroke="#666" strokeWidth="2" filter="url(#shadow3d)"/>
            
            {/* Landing gear (if applicable) */}
            <rect x="280" y="200" width="8" height="15" fill="#333" stroke="#000" strokeWidth="1"/>
            <rect x="320" y="200" width="8" height="15" fill="#333" stroke="#000" strokeWidth="1"/>
            <circle cx="284" cy="220" r="6" fill="#222" stroke="#000" strokeWidth="1"/>
            <circle cx="324" cy="220" r="6" fill="#222" stroke="#000" strokeWidth="1"/>
            
            {/* Navigation lights */}
            <circle cx="250" cy="115" r="3" fill="#ff0000" filter="url(#glow)"/>
            <circle cx="250" cy="235" r="3" fill="#00ff00" filter="url(#glow)"/>
            <circle cx="480" cy="175" r="3" fill="#ffffff" filter="url(#glow)"/>
            <circle cx="80" cy="175" r="3" fill="#ffffff" filter="url(#glow)"/>
          </svg>
          <div className="aircraft-shadow"></div>
        </div>
        <div className="aircraft-label">
          <div className="aircraft-type">{aircraft || "SELECT AIRCRAFT"}</div>
          <div className="aircraft-manufacturer">
            {aircraftData ? aircraftData.manufacturer : "Select an aircraft type"}
          </div>
          <div className="aircraft-category">
            {aircraftData ? aircraftData.category.toUpperCase() : "AIRCRAFT TYPE"}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="tablet-loading">
        <div className="loading-content">
          <div className="airline-logo-loading">
            <div className="logo-icon">✈️</div>
            <h1>PTFS GROUND CONTROL</h1>
            <div className="system-info">Professional Aviation Ground Operations</div>
          </div>
          <div className="loading-progress">
            <div className="progress-bar"></div>
            <div className="progress-text">Initializing Systems...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="tablet-login">
        <div className="login-content">
          <div className="brand-header">
            <div className="brand-icon">✈️</div>
            <h1>PTFS GROUND CONTROL</h1>
            <div className="brand-subtitle">Professional Aviation Ground Operations Management</div>
            <div className="system-version">Version 3.1.0 | Build 2024</div>
          </div>
          <div className="auth-section">
            <button onClick={handleLogin} className="discord-auth-btn">
              <span className="auth-icon">🔐</span>
              <span className="auth-text">AUTHENTICATE WITH DISCORD</span>
            </button>
            <div className="security-note">Secure authentication required for access</div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAirport) {
    return (
      <div className="tablet-mode-select">
        <div className="mode-select-content">
          <div className="welcome-header">
            <h1>AIRPORT SELECTION</h1>
            <div className="user-welcome">Welcome, {user.username} - Select your airport</div>
          </div>

          <div className="airport-selector">
            <div className="airport-header">
              <div className="airport-header-icon">🛩️</div>
              <h2>PTFS AIRPORT NETWORK</h2>
              <div className="airport-header-subtitle">Select an airport to begin operations</div>
            </div>
            
            <div className="airport-status-bar">
              <div className="status-indicator online"></div>
              <span>ALL SYSTEMS OPERATIONAL</span>
              <div className="network-status">24 AIRPORTS ONLINE</div>
            </div>

            <div className="airport-grid-modern">
              {ptfsAirports.map((airport) => (
                <button
                  key={airport}
                  className="airport-card"
                  onClick={() => setSelectedAirport(airport)}
                >
                  <div className="airport-code">{airport}</div>
                  <div className="airport-info">
                    <div className="stands-count">{getAirportConfig(airport).stands.length} Stands</div>
                    <div className="frequency">121.{(Math.random() * 900 + 100).toFixed(0)}</div>
                  </div>
                  <div className="status-indicator active"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userMode) {
    return (
      <div className="tablet-mode-select">
        <div className="mode-select-content">
          <div className="welcome-header">
            <h1>ROLE SELECTION</h1>
            <div className="user-welcome">Airport: {selectedAirport} - Select your role</div>
          </div>

          <div className="airport-confirmation">
            <h3>AIRPORT CONFIRMED: {selectedAirport}</h3>
            <div className="confirmation-details">
              <span>Stands Available</span>
              <span>Ground Frequency Active</span>
              <span>Systems Operational</span>
            </div>
          </div>

          <div className="role-selector">
            <h2>SELECT ROLE</h2>
            <div className="role-cards">
              <button
                onClick={() => selectMode("pilot", selectedAirport)}
                className="role-card pilot"
              >
                <div className="role-icon">👨‍✈️</div>
                <div className="role-title">FLIGHT CREW</div>
                <div className="role-description">Request ground services & manage flight operations</div>
              </button>
              <button
                onClick={() => selectMode("groundcrew", selectedAirport)}
                className="role-card groundcrew"
              >
                <div className="role-icon">👷‍♂️</div>
                <div className="role-title">GROUND OPERATIONS</div>
                <div className="role-description">Handle service requests & manage ground operations</div>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              onClick={() => setSelectedAirport("")} 
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '10px 20px',
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              CHANGE AIRPORT
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (userMode === "pilot") {
      switch (activeTab) {
        case "checklists":
          return (
            <div className="checklists-container">
              <div className="checklist-header">
                <h2>FLIGHT CHECKLISTS</h2>
                <div className="phase-selector">
                  {Object.keys(checklists).map(phase => (
                    <button
                      key={phase}
                      className={`phase-btn ${activeChecklistPhase === phase ? 'active' : ''}`}
                      onClick={() => setActiveChecklistPhase(phase)}
                    >
                      {phase.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="checklist-content">
                <div className="checklist-progress">
                  {checklists[activeChecklistPhase].filter(item => item.checked).length} / {checklists[activeChecklistPhase].length} Complete
                </div>

                <div className="checklist-items">
                  {checklists[activeChecklistPhase].map((item, index) => (
                    <div key={index} className="checklist-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(activeChecklistPhase, index)}
                        />
                        <span className={item.checked ? 'checked' : ''}>{item.item}</span>
                        <span className="category-tag">{item.category}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

        case "weather":
          return (
            <div className="weather-container">
              <div className="weather-section">
                <h2>WEATHER RADAR & CONDITIONS</h2>
                <div className="weather-grid">
                  <div className="weather-card">
                    <h3>CURRENT CONDITIONS</h3>
                    <div className="weather-data">
                      <div className="weather-item">
                        <span className="weather-label">VISIBILITY:</span>
                        <span className="weather-value">{weatherRadar.visibility} km</span>
                      </div>
                      <div className="weather-item">
                        <span className="weather-label">CLOUDS:</span>
                        <span className="weather-value">{weatherRadar.clouds}</span>
                      </div>
                      <div className="weather-item">
                        <span className="weather-label">PRECIPITATION:</span>
                        <span className="weather-value">{weatherRadar.precipitation}</span>
                      </div>
                      <div className="weather-item">
                        <span className="weather-label">TURBULENCE:</span>
                        <span className="weather-value">{weatherRadar.turbulence}</span>
                      </div>
                      <div className="weather-item">
                        <span className="weather-label">WIND SHEAR:</span>
                        <span className="weather-value">{weatherRadar.windShear}</span>
                      </div>
                    </div>
                  </div>
                  <div className="weather-card">
                    <h3>ATIS INFORMATION</h3>
                    <div className="atis-display">
                      <div className="atis-code">{atisData.info}</div>
                      <div className="atis-details">
                        <div>Wind: {atisData.wind}</div>
                        <div>QNH: {atisData.qnh}</div>
                        <div>Runway: {atisData.runway}</div>
                        <div>Temp: {atisData.temperature}</div>
                        <div>Conditions: {atisData.conditions}</div>
                      </div>
                    </div>
                  </div>
                  <div className="weather-card">
                    <h3>RADAR DISPLAY</h3>
                    <div className="radar-screen">
                      <div className="radar-sweep"></div>
                      <div className="radar-grid">
                        <div className="radar-ring"></div>
                        <div className="radar-ring"></div>
                        <div className="radar-ring"></div>
                      </div>
                      <div className="weather-echo green" style={{top: '30%', left: '40%'}}></div>
                      <div className="weather-echo yellow" style={{top: '60%', left: '70%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        case "tracking":
          return (
            <div className="tracking-container">
              <div className="tracking-section">
                <h2>FLIGHT TRACKING & PERFORMANCE</h2>
                <div className="tracking-grid">
                  <div className="tracking-card">
                    <h3>FLIGHT PLAN</h3>
                    <div className="flight-plan-data">
                      <div className="route-display">
                        <div className="route-point">
                          <span className="point-label">DEPARTURE:</span>
                          <span className="point-value">{selectedAirport}</span>
                        </div>
                        <div className="route-line"></div>
                        <div className="route-point">
                          <span className="point-label">ARRIVAL:</span>
                          <span className="point-value">{flightTracking.arrival || 'NOT SET'}</span>
                        </div>
                      </div>
                      <div className="route-info">
                        <div>Route: {flightTracking.route}</div>
                        <div>Est. Time: {flightTracking.estimatedTime || 'CALCULATING'}</div>
                        <div>Delay: {flightTracking.delay} min</div>
                      </div>
                    </div>
                  </div>
                  <div className="tracking-card">
                    <h3>PERFORMANCE DATA</h3>
                    {aircraftData && (
                      <div className="performance-data">
                        <div className="perf-item">
                          <span className="perf-label">OPTIMAL CRUISE FL:</span>
                          <span className="perf-value">FL{Math.floor(aircraftData.serviceCeiling / 100)}</span>
                        </div>
                        <div className="perf-item">
                          <span className="perf-label">FUEL CONSUMPTION:</span>
                          <span className="perf-value">{Math.round(aircraftData.fuelCapacity / aircraftData.range * 100)} L/100NM</span>
                        </div>
                        <div className="perf-item">
                          <span className="perf-label">CLIMB PERFORMANCE:</span>
                          <span className="perf-value">{aircraftData.climbRate} ft/min</span>
                        </div>
                        <div className="perf-item">
                          <span className="perf-label">WEIGHT RATIO:</span>
                          <span className="perf-value">{Math.round((aircraftData.operatingEmptyWeight / aircraftData.maxTakeoffWeight) * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="tracking-card">
                    <h3>LIVE TRACKING</h3>
                    <div className="tracking-map">
                      <div className="map-display">
                        <div className="aircraft-position">
                          <div className="aircraft-icon">✈️</div>
                          <div className="position-info">
                            <div>ALT: FL000</div>
                            <div>SPD: 0 kt</div>
                            <div>HDG: 000°</div>
                          </div>
                        </div>
                        <div className="waypoint origin">{selectedAirport}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        default:
          return (
            <div className="pilot-main">
              <div className="airport-info-panel">
                <div className="airport-info-header">
                  <h2>{selectedAirport} TOWER CONTROL</h2>
                  <div className="weather-strip">
                    <div className="weather-item">
                      <span className="weather-label">ATIS:</span>
                      <span className="weather-value">{atisData.info || 'INFO BRAVO'}</span>
                    </div>
                    <div className="weather-item">
                      <span className="weather-label">WIND:</span>
                      <span className="weather-value">{atisData.wind || '270°/08KT'}</span>
                    </div>
                    <div className="weather-item">
                      <span className="weather-label">QNH:</span>
                      <span className="weather-value">{atisData.qnh || '1013'}</span>
                    </div>
                    <div className="weather-item">
                      <span className="weather-label">RWY:</span>
                      <span className="weather-value">{atisData.runway || '27 ACTIVE'}</span>
                    </div>
                  </div>
                  <div className="airport-stats">
                    <div className="stat-item available">
                      <span className="stat-value">{getCurrentAirportStands().filter(s => !stands[s.id]).length}</span>
                      <span className="stat-label">AVAILABLE</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item occupied">
                      <span className="stat-value">{getCurrentAirportStands().filter(s => stands[s.id]).length}</span>
                      <span className="stat-label">OCCUPIED</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item total">
                      <span className="stat-value">{getCurrentAirportStands().length}</span>
                      <span className="stat-label">TOTAL</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item requests">
                      <span className="stat-value">{requests.filter(r => r.status === "REQUESTED").length}</span>
                      <span className="stat-label">PENDING</span>
                      <div className="stat-indicator"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flight-setup">
                <h2>FLIGHT INFORMATION</h2>
                <div className="input-grid">
                  <div className="input-field">
                    <label>FLIGHT NUMBER</label>
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="AA1234"
                      className="modern-input"
                    />
                  </div>
                  <div className="input-field">
                    <label>AIRCRAFT TYPE</label>
                    <select
                      value={aircraft}
                      onChange={(e) => setAircraft(e.target.value)}
                      className="modern-select"
                    >
                      <option value="">SELECT AIRCRAFT</option>
                      {aircraftTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-field">
                    <label>STAND</label>
                    <select
                      value={selectedStand}
                      onChange={(e) => setSelectedStand(e.target.value)}
                      className="modern-select"
                    >
                      <option value="">SELECT STAND</option>
                      {getCurrentAirportStands().map(stand => {
                        const isOccupied = stands[stand.id];
                        return (
                          <option key={stand.id} value={stand.id} disabled={isOccupied}>
                            {stand.id} ({stand.type.toUpperCase()}) {isOccupied ? `- ${isOccupied.flight}` : '- AVAILABLE'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="input-field">
                    <button
                      onClick={claimStand}
                      className="claim-btn"
                      disabled={!selectedStand || !flightNumber || !aircraft || (stands[selectedStand] && stands[selectedStand].userId !== user?.id)}
                    >
                      {stands[selectedStand] && stands[selectedStand].userId === user?.id ? 'SWITCH STAND' : 'CLAIM STAND'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="aircraft-section">
                <h2>AIRCRAFT STATUS</h2>
                <div className="aircraft-display">
                  {renderAircraftDisplay()}
                </div>
                <div className="aircraft-data">
                  <div className="data-row">
                    <div className="data-item">
                      <span className="data-label">FUEL:</span>
                      <span className="data-value">{aircraftData ? `${Math.round(aircraftData.fuelCapacity * 0.85).toLocaleString()} L` : '85%'}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">PAX:</span>
                      <span className="data-value">{aircraftData ? `${Math.floor(aircraftData.maxSeats * 0.87)}/${aircraftData.maxSeats}` : '156/180'}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">CARGO:</span>
                      <span className="data-value">{aircraftData ? `${Math.round(aircraftData.cargoCapacity * 0.6)}m³` : '8.2T'}</span>
                    </div>
                    <div className="data-item">
                      <span className="data-label">STATUS:</span>
                      <span className="data-value status-ready">READY</span>
                    </div>
                  </div>
                  {aircraftData && (
                    <>
                      <div className="aircraft-specs">
                        <div className="spec-row">
                          <div className="spec-item">
                            <span className="spec-label">MANUFACTURER:</span>
                            <span className="spec-value">{aircraftData.manufacturer}</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">CATEGORY:</span>
                            <span className="spec-value">{aircraftData.category.toUpperCase()}</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">ENGINES:</span>
                            <span className="spec-value">{aircraftData.engines}x {aircraftData.engineType}</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">FIRST FLIGHT:</span>
                            <span className="spec-value">{aircraftData.firstFlight}</span>
                          </div>
                        </div>
                      </div>
                      <div className="aircraft-specs">
                        <div className="spec-row">
                          <div className="spec-item">
                            <span className="spec-label">MAX TAKEOFF WT:</span>
                            <span className="spec-value">{aircraftData.maxTakeoffWeight.toLocaleString()} kg</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">MAX LANDING WT:</span>
                            <span className="spec-value">{aircraftData.maxLandingWeight.toLocaleString()} kg</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">FUEL CAPACITY:</span>
                            <span className="spec-value">{aircraftData.fuelCapacity.toLocaleString()} L</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">CLIMB RATE:</span>
                            <span className="spec-value">{aircraftData.climbRate} ft/min</span>
                          </div>
                        </div>
                      </div>
                      <div className="aircraft-specs">
                        <div className="spec-row">
                          <div className="spec-item">
                            <span className="spec-label">LENGTH:</span>
                            <span className="spec-value">{aircraftData.length}m</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">WINGSPAN:</span>
                            <span className="spec-value">{aircraftData.wingspan}m</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">HEIGHT:</span>
                            <span className="spec-value">{aircraftData.height}m</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">SERVICE CEILING:</span>
                            <span className="spec-value">{aircraftData.serviceCeiling.toLocaleString()} ft</span>
                          </div>
                        </div>
                      </div>
                      <div className="aircraft-specs">
                        <div className="spec-row">
                          <div className="spec-item">
                            <span className="spec-label">CRUISE SPEED:</span>
                            <span className="spec-value">{aircraftData.cruiseSpeed} kt</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">MAX SPEED:</span>
                            <span className="spec-value">{aircraftData.maxSpeed} kt</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">RANGE:</span>
                            <span className="spec-value">{aircraftData.range.toLocaleString()} NM</span>
                          </div>
                          <div className="spec-item">
                            <span className="spec-label">VARIANTS:</span>
                            <span className="spec-value">{aircraftData.variants.length}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              

              <div className="services-section">
                <h2>GROUND SERVICES</h2>
                <div className="services-grid">
                  {[
                    { name: "Full Service", icon: "🛠️", code: "FULL", priority: "high", category: "complete" },
                    { name: "Ground Power", icon: "🔌", code: "GPU", priority: "high", category: "power" },
                    { name: "Fuel Service", icon: "⛽", code: "FUEL", priority: "high", category: "fuel" },
                    { name: "Pushback", icon: "🚛", code: "PUSH", priority: "high", category: "movement" },
                    { name: "De-icing", icon: "❄️", code: "DEICE", priority: "high", category: "safety" },
                    { name: "Catering", icon: "🍽️", code: "CAT", priority: "medium", category: "service" },
                    { name: "Passenger Stairs", icon: "🪜", code: "STAIRS", priority: "medium", category: "access" },
                    { name: "Baggage", icon: "🧳", code: "BAG", priority: "medium", category: "cargo" },
                    { name: "Cleaning", icon: "🧹", code: "CLEAN", priority: "low", category: "maintenance" },
                    { name: "Water Service", icon: "💧", code: "H2O", priority: "low", category: "maintenance" },
                    { name: "Lavatory Service", icon: "🚽", code: "LAV", priority: "low", category: "maintenance" },
                    { name: "Cargo Loading", icon: "📦", code: "CARGO", priority: "medium", category: "cargo" },
                    { name: "Aircraft Maintenance", icon: "🔧", code: "MAINT", priority: "high", category: "safety" },
                    { name: "Security Check", icon: "🛡️", code: "SEC", priority: "high", category: "safety" },
                    { name: "Documentation", icon: "📋", code: "DOC", priority: "medium", category: "admin" }
                  ].map((service) => (
                    <button
                      key={service.name}
                      className={`service-card ${service.priority} ${service.category}`}
                      onClick={() => requestService(service.name)}
                      disabled={!selectedStand}
                    >
                      <div className="service-icon">{service.icon}</div>
                      <div className="service-name">{service.name}</div>
                      <div className="service-details">
                        <div className="service-code">{service.code}</div>
                        <div className="service-priority">{service.priority.toUpperCase()}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
      }
    } else {
      // Ground Crew Interface - Comprehensive priority coverage
      const criticalPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["De-icing", "Aircraft Maintenance", "Security Check", "Pushback"].includes(r.service));
      const highPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Ground Power", "Fuel Service", "Documentation"].includes(r.service));
      const mediumPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Catering", "Baggage", "Passenger Stairs", "Cargo Loading"].includes(r.service));
      const lowPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Cleaning", "Water Service", "Lavatory Service"].includes(r.service));
      const inProgressRequests = requests.filter(r => r.status === "ACCEPTED");

      return (
        <div className="groundcrew-main">
          <div className="queue-header">
            <h2>SERVICE QUEUE - {selectedAirport}</h2>
            <div className="queue-stats">
              <div className="stat">
                <span className="stat-value">{requests.filter(r => r.status === "REQUESTED").length}</span>
                <span className="stat-label">PENDING</span>
              </div>
              <div className="stat">
                <span className="stat-value">{requests.filter(r => r.status === "ACCEPTED").length}</span>
                <span className="stat-label">IN PROGRESS</span>
              </div>
              <div className="stat">
                <span className="stat-value">{requests.filter(r => r.status === "COMPLETED").length}</span>
                <span className="stat-label">COMPLETED</span>
              </div>
            </div>
          </div>

          <div className="priority-columns">
            <div className="priority-column critical">
              <div className="column-header">
                <h3>CRITICAL</h3>
                <span className="count">{criticalPriorityRequests.length}</span>
              </div>
              <div className="requests-list">
                {criticalPriorityRequests.map((request, i) => (
                  <div key={i} className="request-card critical">
                    <div className="request-header">
                      <span className="flight">{request.flight}</span>
                      <span className="timer">{request.timestamp}</span>
                    </div>
                    <div className="request-details">
                      <div className="service">{request.service}</div>
                      <div className="stand">{request.stand}</div>
                    </div>
                    <button onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} className="accept-btn critical">
                      URGENT ACCEPT
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="priority-column high">
              <div className="column-header">
                <h3>HIGH PRIORITY</h3>
                <span className="count">{highPriorityRequests.length}</span>
              </div>
              <div className="requests-list">
                {highPriorityRequests.map((request, i) => (
                  <div key={i} className="request-card high">
                    <div className="request-header">
                      <span className="flight">{request.flight}</span>
                      <span className="timer">{request.timestamp}</span>
                    </div>
                    <div className="request-details">
                      <div className="service">{request.service}</div>
                      <div className="stand">{request.stand}</div>
                    </div>
                    <button onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} className="accept-btn">
                      ACCEPT
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="priority-column medium">
              <div className="column-header">
                <h3>MEDIUM PRIORITY</h3>
                <span className="count">{mediumPriorityRequests.length}</span>
              </div>
              <div className="requests-list">
                {mediumPriorityRequests.map((request, i) => (
                  <div key={i} className="request-card medium">
                    <div className="request-header">
                      <span className="flight">{request.flight}</span>
                      <span className="timer">{request.timestamp}</span>
                    </div>
                    <div className="request-details">
                      <div className="service">{request.service}</div>
                      <div className="stand">{request.stand}</div>
                    </div>
                    <button onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} className="accept-btn">
                      ACCEPT
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="priority-column low">
              <div className="column-header">
                <h3>LOW PRIORITY</h3>
                <span className="count">{lowPriorityRequests.length}</span>
              </div>
              <div className="requests-list">
                {lowPriorityRequests.map((request, i) => (
                  <div key={i} className="request-card low">
                    <div className="request-header">
                      <span className="flight">{request.flight}</span>
                      <span className="timer">{request.timestamp}</span>
                    </div>
                    <div className="request-details">
                      <div className="service">{request.service}</div>
                      <div className="stand">{request.stand}</div>
                    </div>
                    <button onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} className="accept-btn">
                      ACCEPT
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="priority-column progress">
              <div className="column-header">
                <h3>IN PROGRESS</h3>
                <span className="count">{inProgressRequests.length}</span>
              </div>
              <div className="requests-list">
                {inProgressRequests.map((request, i) => (
                  <div key={i} className="request-card progress">
                    <div className="request-header">
                      <span className="flight">{request.flight}</span>
                      <span className="timer">{request.timestamp}</span>
                    </div>
                    <div className="request-details">
                      <div className="service">{request.service}</div>
                      <div className="stand">{request.stand}</div>
                    </div>
                    <button onClick={() => handleServiceAction(requests.indexOf(request), "COMPLETED")} className="complete-btn">
                      COMPLETE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          
        </div>
      );
    }
  };

  return (
    <div className="tablet-interface">
      <div className="tablet-header">
        <div className="header-left">
          <div className="app-title">PTFS GROUND CONTROL</div>
          <div className="location-info">{selectedAirport} - {userMode.toUpperCase()}</div>
        </div>
        <div className="header-center">
          <div className="time-display">{currentTime.toLocaleTimeString()}</div>
          <div className="date-display">{currentTime.toDateString()}</div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="username">{user.username}</div>
            <div className="user-role">{userMode.toUpperCase()}</div>
          </div>
          <button onClick={() => { setUserMode(null); setSelectedAirport(""); }} className="logout-btn">
            SWITCH ROLE
          </button>
        </div>
      </div>

      <div className="tablet-content">
        <div className="main-area">
          {renderContent()}
        </div>

        <div className="comm-panel">
          <div className="comm-header">
            <h3>GROUND FREQ</h3>
            <div className="freq-display">121.900</div>
          </div>

          <div className="messages-area">
            {messages
              .filter(m => {
                // Only show messages from the current airport
                if (m.airport && m.airport !== selectedAirport) return false;
                // For pilots: show system messages and messages for the selected stand
                // For ground crew: show all messages at the airport
                if (userMode === "groundcrew") return true;
                return m.mode === 'system' || m.mode === 'checklist' || !selectedStand || m.stand === selectedStand || m.stand === "GROUND";
              })
              .slice(-20)
              .map((msg, i) => (
                <div key={i} className={`message ${msg.mode || 'system'}`}>
                  <div className="message-header">
                    <span className="sender">{msg.sender}</span>
                    <span className="time">{msg.timestamp}</span>
                  </div>
                  <div className="message-content">{msg.text}</div>
                </div>
              ))}
          </div>

          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                userMode === "groundcrew" 
                  ? "Message ground frequency..." 
                  : selectedStand 
                    ? `Message ${selectedStand}...` 
                    : "Select stand first..."
              }
              className="message-input"
              disabled={userMode === "pilot" && !selectedStand}
            />
            <button 
              onClick={sendMessage} 
              className="send-btn" 
              disabled={userMode === "pilot" && !selectedStand}
            >
              SEND
            </button>
          </div>
        </div>
      </div>

      {userMode === "pilot" && (
        <div className="bottom-nav">
          <button
            className={`nav-btn ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            <span className="nav-icon">🏠</span>
            <span>MAIN</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'checklists' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklists')}
          >
            <span className="nav-icon">✅</span>
            <span>CHECKLISTS</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveTab('weather')}
          >
            <span className="nav-icon">🌦️</span>
            <span>WEATHER</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracking')}
          >
            <span className="nav-icon">📡</span>
            <span>TRACKING</span>
          </button>
        </div>
      )}
    </div>
  );
}