
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
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
  const [activeMenu, setActiveMenu] = useState("main");
  const [customSvg, setCustomSvg] = useState("");
  const [checklists, setChecklists] = useState({
    preflight: [
      { item: "External Power Connected", checked: false },
      { item: "GPU Connected", checked: false },
      { item: "Fuel Quantity Check", checked: false },
      { item: "Control Surfaces Check", checked: false },
      { item: "Navigation Systems", checked: false }
    ],
    departure: [
      { item: "Cabin Secured", checked: false },
      { item: "Doors Armed", checked: false },
      { item: "Pushback Clearance", checked: false },
      { item: "Engine Start Clearance", checked: false },
      { item: "ATC Clearance", checked: false }
    ],
    arrival: [
      { item: "Landing Gear Down", checked: false },
      { item: "Flaps Set", checked: false },
      { item: "Parking Brake Set", checked: false },
      { item: "Engines Shutdown", checked: false },
      { item: "Chocks In Position", checked: false }
    ]
  });
  const [stats, setStats] = useState({
    totalFlights: 0,
    totalServices: 0,
    averageTime: "00:00",
    efficiency: 0
  });
  const [config, setConfig] = useState({
    theme: "dark",
    autoAccept: false,
    notifications: true,
    soundEnabled: true
  });
  const [logs, setLogs] = useState([]);

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    socket.on("chatUpdate", (msg) => {
      setMessages((prev) => [...prev, msg]);
      addLog(`Chat: ${msg.sender} - ${msg.text}`);
    });
    
    socket.on("serviceUpdate", (req) => {
      setRequests(req);
      setStats(prev => ({ ...prev, totalServices: req.length }));
    });
    
    socket.on("standUpdate", (standData) => {
      setStands(standData);
      setStats(prev => ({ ...prev, totalFlights: Object.keys(standData).length }));
    });

    return () => {
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
      socket.off("standUpdate");
    };
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), { timestamp, message }]);
  };

  const handleLogin = () => {
    window.location.href = "/auth/discord";
  };

  const selectMode = (mode, airport) => {
    setUserMode(mode);
    setSelectedAirport(airport);
    socket.emit("userMode", { mode, airport, userId: user?.id });
    addLog(`Mode selected: ${mode} at ${airport}`);
  };

  const claimStand = () => {
    if (selectedStand && flightNumber && aircraft && selectedAirport) {
      socket.emit("claimStand", {
        stand: selectedStand,
        flightNumber,
        aircraft,
        pilot: user?.username,
        userId: user?.id,
        airport: selectedAirport
      });
      addLog(`Stand claimed: ${selectedStand} for flight ${flightNumber}`);
    }
  };

  const sendMessage = () => {
    if (input.trim() === "" || !selectedStand) return;
    const message = {
      text: input,
      sender: user?.username,
      stand: selectedStand,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      mode: userMode
    };
    socket.emit("chatMessage", message);
    setInput("");
  };

  const requestService = (service) => {
    if (!selectedStand || !selectedAirport) {
      alert("Please claim a stand and select airport first");
      return;
    }
    socket.emit("serviceRequest", {
      service,
      stand: selectedStand,
      flight: flightNumber,
      pilot: user?.username,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      status: "REQUESTED"
    });
    addLog(`Service requested: ${service} for ${flightNumber} at ${selectedStand}`);
  };

  const handleServiceAction = (requestId, action) => {
    socket.emit("serviceAction", { requestId, action, crewMember: user?.username });
    addLog(`Service ${action.toLowerCase()}: Request #${requestId}`);
  };

  const toggleChecklistItem = (category, index) => {
    setChecklists(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) => 
        i === index ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    addLog(`Config updated: ${key} = ${value}`);
  };

  const renderAircraftSvg = () => {
    if (customSvg) {
      return <div dangerouslySetInnerHTML={{ __html: customSvg }} />;
    }

    return (
      <svg viewBox="0 0 500 300" className="aircraft-svg">
        <defs>
          <linearGradient id="fuselage" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e6f3ff" />
            <stop offset="50%" stopColor="#b3d9ff" />
            <stop offset="100%" stopColor="#80bfff" />
          </linearGradient>
        </defs>
        
        {/* Fuselage */}
        <ellipse cx="250" cy="150" rx="200" ry="25" fill="url(#fuselage)" stroke="#0066cc" strokeWidth="2"/>
        
        {/* Wings */}
        <path d="M150 150 L150 100 L200 90 L200 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M150 150 L150 200 L200 210 L200 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M300 150 L300 120 L350 110 L350 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M300 150 L300 180 L350 190 L350 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        
        {/* Engines */}
        <ellipse cx="175" cy="130" rx="15" ry="8" fill="#333" stroke="#000" strokeWidth="1"/>
        <ellipse cx="175" cy="170" rx="15" ry="8" fill="#333" stroke="#000" strokeWidth="1"/>
        
        {/* Nose */}
        <path d="M450 150 L480 145 L480 155 Z" fill="#b3d9ff" stroke="#0066cc" strokeWidth="2"/>
        
        {/* Tail */}
        <path d="M50 150 L20 130 L30 150 L20 170 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        
        {/* Windows */}
        <circle cx="400" cy="150" r="4" fill="#001a33" stroke="#0066cc"/>
        <circle cx="380" cy="150" r="3" fill="#001a33" stroke="#0066cc"/>
        <circle cx="360" cy="150" r="3" fill="#001a33" stroke="#0066cc"/>
        <circle cx="340" cy="150" r="3" fill="#001a33" stroke="#0066cc"/>
        <circle cx="320" cy="150" r="3" fill="#001a33" stroke="#0066cc"/>
        
        {/* Service Points */}
        <circle cx="120" cy="150" r="6" fill="#ff6600" stroke="#fff" strokeWidth="2"/>
        <circle cx="200" cy="150" r="6" fill="#00cc66" stroke="#fff" strokeWidth="2"/>
        <circle cx="280" cy="150" r="6" fill="#ffcc00" stroke="#fff" strokeWidth="2"/>
        <circle cx="360" cy="150" r="6" fill="#cc00ff" stroke="#fff" strokeWidth="2"/>
        
        {/* Landing Gear */}
        <rect x="240" y="175" width="4" height="20" fill="#666"/>
        <rect x="260" y="175" width="4" height="20" fill="#666"/>
        <circle cx="242" cy="198" r="3" fill="#333"/>
        <circle cx="262" cy="198" r="3" fill="#333"/>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-panel">
          <div className="aircraft-icon">✈️</div>
          <h2>INITIALIZING PTFS CONTROL SYSTEM</h2>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <p>Building professional aviation interface...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-panel">
          <div className="airline-logo">
            <h1>✈️ PTFS GROUND CONTROL</h1>
            <p>Professional Aircraft Ground Operations Management System</p>
            <div className="system-version">v3.0.1 | Build 3024 | A320 Interface</div>
          </div>
          <button onClick={handleLogin} className="discord-login-btn">
            🔐 AUTHENTICATE WITH DISCORD
          </button>
        </div>
      </div>
    );
  }

  if (!userMode || !selectedAirport) {
    return (
      <div className="mode-selection">
        <div className="mode-panel">
          <h2>ROLE & AIRPORT SELECTION</h2>
          <p>Welcome back, {user.username}</p>
          
          <div className="airport-selection">
            <h3>SELECT AIRPORT</h3>
            <div className="airport-grid">
              {ptfsAirports.map((airport) => (
                <button
                  key={airport}
                  className={`airport-btn ${selectedAirport === airport ? 'selected' : ''}`}
                  onClick={() => setSelectedAirport(airport)}
                >
                  {airport}
                </button>
              ))}
            </div>
          </div>

          {selectedAirport && (
            <div className="role-selection-section">
              <h3>SELECT ROLE</h3>
              <div className="mode-buttons">
                <button onClick={() => selectMode("pilot", selectedAirport)} className="mode-btn pilot-btn">
                  <div className="role-icon">👨‍✈️</div>
                  <div className="role-info">
                    <div className="role-title">FLIGHT CREW</div>
                    <div className="role-desc">Request ground services & manage flight operations</div>
                  </div>
                </button>
                <button onClick={() => selectMode("groundcrew", selectedAirport)} className="mode-btn crew-btn">
                  <div className="role-icon">👷‍♂️</div>
                  <div className="role-info">
                    <div className="role-title">GROUND OPERATIONS</div>
                    <div className="role-desc">Handle service requests & terminal management</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeMenu) {
      case "stats":
        return (
          <div className="stats-panel">
            <h3>OPERATIONAL STATISTICS</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">✈️</div>
                <div className="stat-value">{stats.totalFlights}</div>
                <div className="stat-label">Total Flights</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <div className="stat-value">{stats.totalServices}</div>
                <div className="stat-label">Services Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-value">{stats.averageTime}</div>
                <div className="stat-label">Avg Service Time</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{stats.efficiency}%</div>
                <div className="stat-label">Efficiency Rating</div>
              </div>
            </div>
            <div className="performance-chart">
              <h4>PERFORMANCE METRICS</h4>
              <div className="chart-placeholder">
                <div className="chart-bar" style={{height: '60%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '45%'}}></div>
                <div className="chart-bar" style={{height: '90%'}}></div>
                <div className="chart-bar" style={{height: '75%'}}></div>
              </div>
            </div>
          </div>
        );
      
      case "config":
        return (
          <div className="config-panel">
            <h3>SYSTEM CONFIGURATION</h3>
            <div className="config-sections">
              <div className="config-section">
                <h4>INTERFACE SETTINGS</h4>
                <div className="config-item">
                  <label>Theme</label>
                  <select value={config.theme} onChange={(e) => updateConfig('theme', e.target.value)} className="cockpit-input">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="blue">Blue</option>
                  </select>
                </div>
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.notifications}
                      onChange={(e) => updateConfig('notifications', e.target.checked)}
                    />
                    Enable Notifications
                  </label>
                </div>
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.soundEnabled}
                      onChange={(e) => updateConfig('soundEnabled', e.target.checked)}
                    />
                    Sound Effects
                  </label>
                </div>
              </div>
              
              <div className="config-section">
                <h4>OPERATIONAL SETTINGS</h4>
                <div className="config-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.autoAccept}
                      onChange={(e) => updateConfig('autoAccept', e.target.checked)}
                    />
                    Auto-accept service requests
                  </label>
                </div>
              </div>

              <div className="config-section">
                <h4>CUSTOM AIRCRAFT SVG</h4>
                <textarea
                  value={customSvg}
                  onChange={(e) => setCustomSvg(e.target.value)}
                  placeholder="Paste your custom SVG code here..."
                  className="cockpit-input svg-textarea"
                  rows="6"
                />
                <button onClick={() => setCustomSvg("")} className="clear-svg-btn">
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        );
      
      case "logs":
        return (
          <div className="logs-panel">
            <h3>SYSTEM LOGS</h3>
            <div className="logs-container">
              {logs.slice(-50).map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setLogs([])} className="clear-logs-btn">
              Clear Logs
            </button>
          </div>
        );
      
      case "checklists":
        return (
          <div className="checklists-panel">
            <h3>FLIGHT CHECKLISTS</h3>
            <div className="checklists-grid">
              {Object.entries(checklists).map(([category, items]) => (
                <div key={category} className="checklist-card">
                  <h4>{category.toUpperCase()} CHECKLIST</h4>
                  <div className="checklist-items">
                    {items.map((item, i) => (
                      <div key={i} className="checklist-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleChecklistItem(category, i)}
                          />
                          <span className={item.checked ? 'checked' : ''}>{item.item}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="checklist-progress">
                    Progress: {items.filter(item => item.checked).length}/{items.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return userMode === "pilot" ? (
          <>
            <div className="top-panels">
              <div className="flight-info-panel">
                <h3>FLIGHT INFORMATION</h3>
                <div className="flight-inputs">
                  <div className="input-row">
                    <div className="input-group">
                      <label>FLIGHT NO.</label>
                      <input
                        type="text"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                        placeholder="AA1234"
                        className="cockpit-input"
                      />
                    </div>
                    <div className="input-group">
                      <label>AIRCRAFT TYPE</label>
                      <select
                        value={aircraft}
                        onChange={(e) => setAircraft(e.target.value)}
                        className="cockpit-input"
                      >
                        <option value="">SELECT AIRCRAFT</option>
                        {aircraftTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>STAND</label>
                      <select
                        value={selectedStand}
                        onChange={(e) => setSelectedStand(e.target.value)}
                        className="cockpit-input"
                      >
                        <option value="">SELECT STAND</option>
                        {Array.from({length: 25}, (_, i) => i + 1).map(num => {
                          const standKey = `Gate ${num}`;
                          const isOccupied = stands[standKey];
                          return (
                            <option key={num} value={standKey} disabled={isOccupied}>
                              Gate {num} {isOccupied ? `(${isOccupied.flight})` : '(AVAILABLE)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="input-group">
                      <button 
                        onClick={claimStand} 
                        className="claim-stand-btn" 
                        disabled={!selectedStand || !flightNumber || !aircraft || stands[selectedStand]}
                      >
                        CLAIM STAND
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="aircraft-visual">
              <h3>AIRCRAFT DIAGRAM - {aircraft || "SELECT AIRCRAFT"}</h3>
              <div className="aircraft-diagram">
                {renderAircraftSvg()}
                <div className="service-points">
                  <div className="service-point gpu" style={{left: '120px', top: '140px'}}>GPU</div>
                  <div className="service-point fuel" style={{left: '200px', top: '140px'}}>FUEL</div>
                  <div className="service-point catering" style={{left: '280px', top: '140px'}}>CATERING</div>
                  <div className="service-point stairs" style={{left: '360px', top: '140px'}}>STAIRS</div>
                </div>
              </div>
            </div>

            <div className="services-grid">
              <h3>GROUND SERVICES AVAILABLE</h3>
              <div className="services-layout">
                {[
                  { name: "Ground Power", icon: "🔌", desc: "External Power Unit", code: "GPU", status: "AVAIL" },
                  { name: "Fuel Service", icon: "⛽", desc: "Aircraft Refueling", code: "FUEL", status: "AVAIL" },
                  { name: "Catering", icon: "🍽️", desc: "Food & Beverage Service", code: "CAT", status: "AVAIL" },
                  { name: "Pushback", icon: "🚛", desc: "Pushback Tug Service", code: "PUSH", status: "AVAIL" },
                  { name: "Passenger Stairs", icon: "🪜", desc: "Boarding Stairs", code: "STAIRS", status: "AVAIL" },
                  { name: "Cleaning", icon: "🧹", desc: "Cabin Cleaning", code: "CLEAN", status: "AVAIL" },
                  { name: "Baggage", icon: "🧳", desc: "Baggage Loading", code: "BAG", status: "AVAIL" },
                  { name: "Water Service", icon: "💧", desc: "Fresh Water Supply", code: "H2O", status: "AVAIL" },
                  { name: "Lavatory Service", icon: "🚽", desc: "Waste Removal", code: "LAV", status: "AVAIL" },
                  { name: "De-icing", icon: "❄️", desc: "Aircraft De-icing", code: "DEICE", status: "AVAIL" }
                ].map((service) => (
                  <div key={service.name} className="service-panel" onClick={() => requestService(service.name)}>
                    <div className="service-header">
                      <span className="service-code">{service.code}</span>
                      <span className={`service-status ${service.status.toLowerCase()}`}>{service.status}</span>
                    </div>
                    <div className="service-icon-large">{service.icon}</div>
                    <div className="service-title">{service.name}</div>
                    <div className="service-description">{service.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="crew-dashboard">
              <div className="active-requests">
                <h3>ACTIVE SERVICE REQUESTS</h3>
                <div className="requests-grid">
                  {requests.filter(r => r.status !== "COMPLETED").map((request, i) => (
                    <div key={i} className={`request-card ${request.status.toLowerCase()}`}>
                      <div className="request-header">
                        <div className="flight-details">
                          <span className="flight-code">{request.flight}</span>
                          <span className="stand-location">{request.stand} @ {request.airport}</span>
                        </div>
                        <div className={`priority-indicator ${request.status.toLowerCase()}`}>
                          {request.status}
                        </div>
                      </div>
                      <div className="service-details">
                        <div className="service-type">{request.service}</div>
                        <div className="request-time">{request.timestamp}</div>
                        <div className="pilot-name">Pilot: {request.pilot}</div>
                      </div>
                      <div className="action-buttons">
                        {request.status === "REQUESTED" && (
                          <button onClick={() => handleServiceAction(i, "ACCEPTED")} className="action-btn accept">
                            ACCEPT
                          </button>
                        )}
                        {request.status === "ACCEPTED" && (
                          <button onClick={() => handleServiceAction(i, "COMPLETED")} className="action-btn complete">
                            COMPLETE
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="terminal-layout">
                <h3>TERMINAL OVERVIEW - {selectedAirport}</h3>
                <div className="terminal-grid">
                  {Array.from({length: 25}, (_, i) => i + 1).map(num => {
                    const standKey = `Gate ${num}`;
                    const standInfo = stands[standKey];
                    return (
                      <div key={num} className={`terminal-stand ${standInfo ? 'occupied' : 'available'}`}>
                        <div className="stand-number">{num}</div>
                        <div className="stand-status">
                          {standInfo ? (
                            <>
                              <div className="flight-info">{standInfo.flight}</div>
                              <div className="aircraft-info">{standInfo.aircraft}</div>
                              <div className="pilot-info">{standInfo.pilot}</div>
                            </>
                          ) : (
                            <div className="available-text">AVAILABLE</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="cockpit-container">
      <header className="system-header">
        <div className="header-left">
          <h1>PTFS GROUND CONTROL - {selectedAirport}</h1>
          <div className="system-status">
            <span className="status-indicator active"></span>
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
        <div className="header-center">
          <div className="time-display">
            <div className="current-time">{currentTime.toLocaleTimeString()}</div>
            <div className="current-date">{currentTime.toDateString()}</div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.username}</span>
            <span className="user-role">{userMode.toUpperCase()} @ {selectedAirport}</span>
          </div>
          <button onClick={() => { setUserMode(null); setSelectedAirport(""); }} className="mode-switch-btn">
            SWITCH ROLE
          </button>
        </div>
      </header>

      <div className="main-dashboard">
        <div className="left-sidebar">
          <div className="system-menu">
            <h4>SYSTEM MENU</h4>
            <div className="menu-items">
              <div className={`menu-item ${activeMenu === 'main' ? 'active' : ''}`} onClick={() => setActiveMenu('main')}>
                <span className="menu-icon">🏠</span>
                <span>MAIN</span>
              </div>
              <div className={`menu-item ${activeMenu === 'stats' ? 'active' : ''}`} onClick={() => setActiveMenu('stats')}>
                <span className="menu-icon">📊</span>
                <span>STATS</span>
              </div>
              <div className={`menu-item ${activeMenu === 'config' ? 'active' : ''}`} onClick={() => setActiveMenu('config')}>
                <span className="menu-icon">⚙️</span>
                <span>CONFIG</span>
              </div>
              <div className={`menu-item ${activeMenu === 'logs' ? 'active' : ''}`} onClick={() => setActiveMenu('logs')}>
                <span className="menu-icon">📝</span>
                <span>LOGS</span>
              </div>
              <div className={`menu-item ${activeMenu === 'checklists' ? 'active' : ''}`} onClick={() => setActiveMenu('checklists')}>
                <span className="menu-icon">✅</span>
                <span>CHECKLISTS</span>
              </div>
            </div>
          </div>

          <div className="system-info">
            <h4>AIRPORT STATUS</h4>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">STANDS</span>
                <span className="status-value">{Object.keys(stands).length}/25</span>
              </div>
              <div className="status-item">
                <span className="status-label">REQUESTS</span>
                <span className="status-value">{requests.filter(r => r.status !== "COMPLETED").length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">ACTIVE</span>
                <span className="status-value">{selectedStand || "NONE"}</span>
              </div>
              <div className="status-item">
                <span className="status-label">AIRPORT</span>
                <span className="status-value">{selectedAirport}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="main-content">
          {renderMainContent()}
        </div>

        <div className="right-panel">
          <div className="communication-center">
            <div className="comm-header">
              <h4>GROUND CONTROL FREQ</h4>
              <div className="frequency-display">121.900 MHz</div>
            </div>

            <div className="chat-display">
              {messages
                .filter(m => !selectedStand || m.stand === selectedStand || m.mode === 'system')
                .slice(-8)
                .map((msg, i) => (
                  <div key={i} className={`comm-message ${msg.mode || 'system'}`}>
                    <div className="message-info">
                      <span className="sender-id">{msg.sender}</span>
                      <span className="transmission-time">{msg.timestamp}</span>
                    </div>
                    <div className="message-content">{msg.text}</div>
                  </div>
                ))}
            </div>

            <div className="transmission-controls">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder={selectedStand ? `Transmit to ${selectedStand}...` : "Select stand first..."}
                className="transmission-input"
                disabled={!selectedStand}
              />
              <button onClick={sendMessage} className="transmit-btn" disabled={!selectedStand}>
                TRANSMIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
