

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

  // Load aircraft SVG when aircraft type changes
  useEffect(() => {
    if (aircraft) {
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
    } else {
      setAircraftSvg("");
    }
  }, [aircraft]);

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

    return () => {
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
      socket.off("standUpdate");
    };
  }, [selectedAirport]);

  const handleLogin = () => {
    window.location.href = "/auth/discord";
  };

  const selectMode = (mode, airport) => {
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
    if (!selectedStand) {
      alert("Please claim a stand first");
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
  };

  const renderAircraftDisplay = () => {
    if (aircraftSvg) {
      return <div dangerouslySetInnerHTML={{ __html: aircraftSvg }} className="custom-aircraft-svg" />;
    }
    
    // Fallback to default SVG
    return (
      <svg viewBox="0 0 500 300" className="aircraft-svg">
        <defs>
          <linearGradient id="fuselage" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e6f3ff" />
            <stop offset="50%" stopColor="#b3d9ff" />
            <stop offset="100%" stopColor="#80bfff" />
          </linearGradient>
        </defs>
        
        <ellipse cx="250" cy="150" rx="200" ry="25" fill="url(#fuselage)" stroke="#0066cc" strokeWidth="2"/>
        <path d="M150 150 L150 100 L200 90 L200 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M150 150 L150 200 L200 210 L200 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M300 150 L300 120 L350 110 L350 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <path d="M300 150 L300 180 L350 190 L350 150 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <ellipse cx="175" cy="130" rx="15" ry="8" fill="#333" stroke="#000" strokeWidth="1"/>
        <ellipse cx="175" cy="170" rx="15" ry="8" fill="#333" stroke="#000" strokeWidth="1"/>
        <path d="M450 150 L480 145 L480 155 Z" fill="#b3d9ff" stroke="#0066cc" strokeWidth="2"/>
        <path d="M50 150 L20 130 L30 150 L20 170 Z" fill="#cccccc" stroke="#666" strokeWidth="2"/>
        <text x="250" y="280" textAnchor="middle" fill="#0066cc" fontSize="14" fontWeight="bold">
          {aircraft || "SELECT AIRCRAFT"}
        </text>
      </svg>
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

  if (!userMode || !selectedAirport) {
    return (
      <div className="tablet-mode-select">
        <div className="mode-select-content">
          <div className="welcome-header">
            <h1>ROLE & AIRPORT SELECTION</h1>
            <div className="user-welcome">Welcome, {user.username}</div>
          </div>
          
          <div className="airport-selector">
            <h2>SELECT AIRPORT</h2>
            <div className="airport-grid-modern">
              {ptfsAirports.map((airport) => (
                <button
                  key={airport}
                  className={`airport-card ${selectedAirport === airport ? 'selected' : ''}`}
                  onClick={() => setSelectedAirport(airport)}
                >
                  <div className="airport-code">{airport}</div>
                  <div className="airport-status">OPERATIONAL</div>
                </button>
              ))}
            </div>
          </div>

          {selectedAirport && (
            <div className="role-selector">
              <h2>SELECT ROLE</h2>
              <div className="role-cards">
                <button onClick={() => selectMode("pilot", selectedAirport)} className="role-card pilot">
                  <div className="role-icon">👨‍✈️</div>
                  <div className="role-title">FLIGHT CREW</div>
                  <div className="role-description">Request ground services & manage flight operations</div>
                </button>
                <button onClick={() => selectMode("groundcrew", selectedAirport)} className="role-card groundcrew">
                  <div className="role-icon">👷‍♂️</div>
                  <div className="role-title">GROUND OPERATIONS</div>
                  <div className="role-description">Handle service requests & manage ground operations</div>
                </button>
              </div>
            </div>
          )}
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
        
        default:
          return (
            <div className="pilot-main">
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
                <h2>AIRCRAFT DIAGRAM</h2>
                <div className="aircraft-display">
                  {renderAircraftDisplay()}
                </div>
              </div>

              <div className="services-section">
                <h2>GROUND SERVICES</h2>
                <div className="services-grid">
                  {[
                    { name: "Ground Power", icon: "🔌", code: "GPU" },
                    { name: "Fuel Service", icon: "⛽", code: "FUEL" },
                    { name: "Catering", icon: "🍽️", code: "CAT" },
                    { name: "Pushback", icon: "🚛", code: "PUSH" },
                    { name: "Passenger Stairs", icon: "🪜", code: "STAIRS" },
                    { name: "Cleaning", icon: "🧹", code: "CLEAN" },
                    { name: "Baggage", icon: "🧳", code: "BAG" },
                    { name: "Water Service", icon: "💧", code: "H2O" },
                    { name: "Lavatory Service", icon: "🚽", code: "LAV" },
                    { name: "De-icing", icon: "❄️", code: "DEICE" }
                  ].map((service) => (
                    <button 
                      key={service.name} 
                      className="service-card" 
                      onClick={() => requestService(service.name)}
                      disabled={!selectedStand}
                    >
                      <div className="service-icon">{service.icon}</div>
                      <div className="service-name">{service.name}</div>
                      <div className="service-code">{service.code}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
      }
    } else {
      // Ground Crew Interface
      const lowPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Cleaning", "Water Service", "Lavatory Service"].includes(r.service));
      const mediumPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Catering", "Baggage", "Passenger Stairs"].includes(r.service));
      const highPriorityRequests = requests.filter(r => r.status === "REQUESTED" && ["Ground Power", "Fuel Service", "Pushback", "De-icing"].includes(r.service));
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

          <div className="terminal-overview">
            <h3>TERMINAL STATUS</h3>
            <div className="stands-grid">
              {getCurrentAirportStands().map(stand => {
                const standInfo = stands[stand.id];
                return (
                  <div key={stand.id} className={`stand-display ${standInfo ? 'occupied' : 'available'} ${stand.type}`}>
                    <div className="stand-id">{stand.id}</div>
                    <div className="stand-type">{stand.type.toUpperCase()}</div>
                    {standInfo && (
                      <div className="stand-info">
                        <div className="flight">{standInfo.flight}</div>
                        <div className="aircraft">{standInfo.aircraft}</div>
                      </div>
                    )}
                  </div>
                );
              })}
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
              .filter(m => !selectedStand || m.stand === selectedStand || m.mode === 'system')
              .slice(-10)
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
              placeholder={selectedStand ? `Message ${selectedStand}...` : "Select stand first..."}
              className="message-input"
              disabled={!selectedStand}
            />
            <button onClick={sendMessage} className="send-btn" disabled={!selectedStand}>
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
        </div>
      )}
    </div>
  );
}
