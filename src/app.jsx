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
  const [weatherData, setWeatherData] = useState({
    temperature: "22°C",
    wind: "270/10",
    visibility: "10km",
    qnh: "1013"
  });
  const [selectedAirport, setSelectedAirport] = useState("");

  const ptfsAirports = [
    "IRFD", "IORE", "IZOL", "ICYP", "IPPH", "IGRV", "ISAU", "IBTH", "ISKP",
    "IGAR", "IBLT", "IMLR", "ITRC", "IDCS", "ITKO", "IJAF", "ISCM", "IBAR",
    "IHEN", "ILAR", "IIAB", "IPAP", "ILKL", "IGRV", "IBTH", "IUFO", "ISKP"
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

    socket.on("chatUpdate", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("serviceUpdate", (req) => setRequests(req));
    socket.on("standUpdate", (standData) => setStands(standData));

    return () => {
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
      socket.off("standUpdate");
    };
  }, []);

  const handleLogin = () => {
    window.location.href = "/auth/discord";
  };

  const selectMode = (mode) => {
    setUserMode(mode);
    socket.emit("userMode", { mode, userId: user?.id });
  };

  const claimStand = () => {
    if (selectedStand && flightNumber && aircraft) {
      socket.emit("claimStand", {
        stand: selectedStand,
        flightNumber,
        aircraft,
        pilot: user?.username,
        userId: user?.id
      });
    }
  };

  const sendMessage = () => {
    if (input.trim() === "" || !selectedStand) return;
    const message = {
      text: input,
      sender: user?.username,
      stand: selectedStand,
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
      timestamp: new Date().toLocaleTimeString(),
      status: "REQUESTED"
    });
  };

  const handleServiceAction = (requestId, action) => {
    socket.emit("serviceAction", { requestId, action, crewMember: user?.username });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-panel">
          <div className="aircraft-icon">✈️</div>
          <h2>INITIALIZING PTFS SYSTEM</h2>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
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
            <div className="system-version">v2.4.1 | Build 2847</div>
          </div>
          <button onClick={handleLogin} className="discord-login-btn">
            🔐 AUTHENTICATE WITH DISCORD
          </button>
        </div>
      </div>
    );
  }

  if (!userMode) {
    return (
      <div className="mode-selection">
        <div className="mode-panel">
          <h2>ROLE SELECTION</h2>
          <p>Welcome back, {user.username}</p>
          <div className="mode-buttons">
            <button onClick={() => selectMode("pilot")} className="mode-btn pilot-btn">
              <div className="role-icon">👨‍✈️</div>
              <div className="role-info">
                <div className="role-title">FLIGHT CREW</div>
                <div className="role-desc">Request ground services</div>
              </div>
            </button>
            <button onClick={() => selectMode("groundcrew")} className="mode-btn crew-btn">
              <div className="role-icon">👷‍♂️</div>
              <div className="role-info">
                <div className="role-title">GROUND OPERATIONS</div>
                <div className="role-desc">Manage service requests</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cockpit-container">
      <header className="system-header">
        <div className="header-left">
          <h1>PTFS GROUND CONTROL</h1>
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
            <span className="user-role">{userMode.toUpperCase()}</span>
          </div>
          <button onClick={() => setUserMode(null)} className="mode-switch-btn">
            SWITCH ROLE
          </button>
        </div>
      </header>

      <div className="main-dashboard">
        <div className="left-sidebar">
          <div className="weather-panel">
            <h4>WEATHER INFO</h4>
            <div className="weather-grid">
              <div className="weather-item">
                <span className="weather-label">TEMP</span>
                <span className="weather-value">{weatherData.temperature}</span>
              </div>
              <div className="weather-item">
                <span className="weather-label">WIND</span>
                <span className="weather-value">{weatherData.wind}</span>
              </div>
              <div className="weather-item">
                <span className="weather-label">VIS</span>
                <span className="weather-value">{weatherData.visibility}</span>
              </div>
              <div className="weather-item">
                <span className="weather-label">QNH</span>
                <span className="weather-value">{weatherData.qnh}</span>
              </div>
            </div>
          </div>

          <div className="system-menu">
            <h4>SYSTEM MENU</h4>
            <div className="menu-items">
              <div className="menu-item active">
                <span className="menu-icon">🏠</span>
                <span>MAIN</span>
              </div>
              <div className="menu-item">
                <span className="menu-icon">📊</span>
                <span>STATS</span>
              </div>
              <div className="menu-item">
                <span className="menu-icon">⚙️</span>
                <span>CONFIG</span>
              </div>
              <div className="menu-item">
                <span className="menu-icon">📝</span>
                <span>LOGS</span>
              </div>
            </div>
          </div>

          <div className="airport-filter">
            <h4>AIRPORT FILTER</h4>
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="cockpit-input"
            >
              <option value="">ALL PTFS AIRPORTS</option>
              {ptfsAirports.map((airport) => (
                <option key={airport} value={airport}>
                  {airport}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="main-content">
          {userMode === "pilot" ? (
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
                        <label>AIRCRAFT</label>
                        <select
                          value={aircraft}
                          onChange={(e) => setAircraft(e.target.value)}
                          className="cockpit-input"
                        >
                          <option value="">SELECT</option>
                          <option value="A320">A320</option>
                          <option value="A321">A321</option>
                          <option value="A330">A330</option>
                          <option value="A340">A340</option>
                          <option value="A380">A380</option>
                          <option value="B737">B737</option>
                          <option value="B747">B747</option>
                          <option value="B777">B777</option>
                          <option value="B787">B787</option>
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
                          {Array.from({length: 25}, (_, i) => i + 1).map(num => (
                            <option key={num} value={`Gate ${num}`}>
                              Gate {num} {stands[`Gate ${num}`] ? `(${stands[`Gate ${num}`].flight})` : '(AVAILABLE)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        <button onClick={claimStand} className="claim-stand-btn" disabled={!selectedStand || !flightNumber || !aircraft}>
                          CLAIM STAND
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="aircraft-visual">
                <div className="aircraft-diagram">
                  <svg viewBox="0 0 400 200" className="aircraft-svg">
                    <path d="M50 100 L350 100 L340 90 L340 110 Z" stroke="#00d4ff" strokeWidth="2" fill="none"/>
                    <path d="M100 100 L100 60 L120 60 L120 100" stroke="#00d4ff" strokeWidth="2" fill="none"/>
                    <path d="M100 100 L100 140 L120 140 L120 100" stroke="#00d4ff" strokeWidth="2" fill="none"/>
                    <path d="M300 100 L300 80 L320 80 L320 100" stroke="#00d4ff" strokeWidth="2" fill="none"/>
                    <path d="M300 100 L300 120 L320 120 L320 100" stroke="#00d4ff" strokeWidth="2" fill="none"/>
                    <circle cx="80" cy="100" r="3" fill="#00d4ff"/>
                    <circle cx="150" cy="100" r="3" fill="#00d4ff"/>
                    <circle cx="250" cy="100" r="3" fill="#00d4ff"/>
                    <circle cx="320" cy="100" r="3" fill="#00d4ff"/>
                  </svg>
                  <div className="service-points">
                    <div className="service-point gpu" style={{left: '80px', top: '80px'}}>GPU</div>
                    <div className="service-point fuel" style={{left: '150px', top: '80px'}}>FUEL</div>
                    <div className="service-point catering" style={{left: '250px', top: '80px'}}>CATERING</div>
                    <div className="service-point stairs" style={{left: '320px', top: '80px'}}>STAIRS</div>
                  </div>
                </div>
              </div>

              <div className="services-grid">
                <h3>GROUND SERVICES</h3>
                <div className="services-layout">
                  {[
                    { name: "Ground Power", icon: "🔌", desc: "External Power", code: "GPU", status: "AVAIL" },
                    { name: "Fuel Service", icon: "⛽", desc: "Refueling", code: "FUEL", status: "AVAIL" },
                    { name: "Catering", icon: "🍽️", desc: "Food Service", code: "CAT", status: "AVAIL" },
                    { name: "Pushback", icon: "🚛", desc: "Tug Service", code: "PUSH", status: "AVAIL" },
                    { name: "Passenger Stairs", icon: "🪜", desc: "Boarding", code: "STAIRS", status: "AVAIL" },
                    { name: "Cleaning", icon: "🧹", desc: "Cabin Clean", code: "CLEAN", status: "AVAIL" },
                    { name: "Baggage", icon: "🧳", desc: "Loading", code: "BAG", status: "AVAIL" },
                    { name: "Water Service", icon: "💧", desc: "Fresh Water", code: "H2O", status: "AVAIL" }
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
                            <span className="stand-location">{request.stand}</span>
                          </div>
                          <div className={`priority-indicator ${request.status.toLowerCase()}`}>
                            {request.status}
                          </div>
                        </div>
                        <div className="service-details">
                          <div className="service-type">{request.service}</div>
                          <div className="request-time">{request.timestamp}</div>
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
                  <h3>TERMINAL OVERVIEW</h3>
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
          )}
        </div>

        <div className="right-panel">
          <div className="communication-center">
            <div className="comm-header">
              <h4>GROUND CONTROL FREQUENCY</h4>
              <div className="frequency-display">121.900 MHz</div>
            </div>

            <div className="chat-display">
              {messages
                .filter(m => !selectedStand || m.stand === selectedStand)
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
                disabled={!selectedStand || !selectedAirport}
              />
              <button onClick={sendMessage} className="transmit-btn" disabled={!selectedStand || !selectedAirport}>
                TRANSMIT
              </button>
            </div>
          </div>

          <div className="system-info">
            <h4>SYSTEM STATUS</h4>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}