
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMode, setUserMode] = useState(null); // 'pilot' or 'groundcrew'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [requests, setRequests] = useState([]);
  const [stands, setStands] = useState({});
  const [selectedStand, setSelectedStand] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [aircraft, setAircraft] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    socket.on("chatUpdate", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("serviceUpdate", (req) => setRequests((prev) => [...prev, req]));
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
      <div className="login-container">
        <div className="login-panel">
          <h2>Loading PTFS System...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-panel">
          <div className="airline-logo">
            <h1>✈️ PTFS Ground Services</h1>
            <p>Professional Aircraft Ground Operations System</p>
          </div>
          <button onClick={handleLogin} className="discord-login-btn">
            🎮 Login with Discord
          </button>
        </div>
      </div>
    );
  }

  if (!userMode) {
    return (
      <div className="mode-selection">
        <div className="mode-panel">
          <h2>Welcome, {user.username}</h2>
          <p>Select your role:</p>
          <div className="mode-buttons">
            <button onClick={() => selectMode("pilot")} className="mode-btn pilot-btn">
              👨‍✈️ PILOT
            </button>
            <button onClick={() => selectMode("groundcrew")} className="mode-btn crew-btn">
              👷‍♂️ GROUND CREW
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
          <h1>PTFS Ground Control System</h1>
          <span className="user-info">{user.username} | {userMode.toUpperCase()}</span>
        </div>
        <div className="header-right">
          <button onClick={() => setUserMode(null)} className="mode-switch-btn">
            Switch Mode
          </button>
        </div>
      </header>

      <div className="main-interface">
        {userMode === "pilot" ? (
          <div className="pilot-panel">
            <div className="flight-info-section">
              <h3>FLIGHT INFORMATION</h3>
              <div className="input-group">
                <label>Flight Number:</label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  placeholder="e.g., AA1234"
                  className="flight-input"
                />
              </div>
              <div className="input-group">
                <label>Aircraft Type:</label>
                <select
                  value={aircraft}
                  onChange={(e) => setAircraft(e.target.value)}
                  className="flight-input"
                >
                  <option value="">Select Aircraft</option>
                  <option value="A320">Airbus A320</option>
                  <option value="A321">Airbus A321</option>
                  <option value="B737">Boeing 737</option>
                  <option value="B777">Boeing 777</option>
                  <option value="A380">Airbus A380</option>
                </select>
              </div>
              <div className="input-group">
                <label>Stand Number:</label>
                <select
                  value={selectedStand}
                  onChange={(e) => setSelectedStand(e.target.value)}
                  className="flight-input"
                >
                  <option value="">Select Stand</option>
                  {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                    <option key={num} value={`Gate ${num}`}>
                      Gate {num} {stands[`Gate ${num}`] ? `(${stands[`Gate ${num}`].flight})` : '(Available)'}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={claimStand} className="claim-btn" disabled={!selectedStand || !flightNumber || !aircraft}>
                CLAIM STAND
              </button>
            </div>

            <div className="services-section">
              <h3>GROUND SERVICES</h3>
              <div className="service-grid">
                {[
                  { name: "GPU", icon: "🔌", desc: "Ground Power Unit" },
                  { name: "Fuel", icon: "⛽", desc: "Fuel Service" },
                  { name: "Catering", icon: "🍽️", desc: "Catering Service" },
                  { name: "Pushback", icon: "🚛", desc: "Pushback Tug" },
                  { name: "Stairs", icon: "🪜", desc: "Passenger Stairs" },
                  { name: "Cleaning", icon: "🧹", desc: "Aircraft Cleaning" },
                  { name: "Baggage", icon: "🧳", desc: "Baggage Loading" },
                  { name: "Water", icon: "💧", desc: "Water Service" }
                ].map((service) => (
                  <button
                    key={service.name}
                    onClick={() => requestService(service.name)}
                    className="service-btn"
                    disabled={!selectedStand}
                  >
                    <span className="service-icon">{service.icon}</span>
                    <div className="service-info">
                      <div className="service-name">{service.name}</div>
                      <div className="service-desc">{service.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="crew-panel">
            <div className="requests-section">
              <h3>SERVICE REQUESTS</h3>
              <div className="requests-list">
                {requests.filter(r => r.status !== "COMPLETED").map((request, i) => (
                  <div key={i} className={`request-item ${request.status.toLowerCase()}`}>
                    <div className="request-header">
                      <span className="flight-info">{request.flight} - {request.stand}</span>
                      <span className={`status ${request.status.toLowerCase()}`}>{request.status}</span>
                    </div>
                    <div className="request-details">
                      <span className="service-type">{request.service}</span>
                      <span className="request-time">{request.timestamp}</span>
                    </div>
                    <div className="request-actions">
                      {request.status === "REQUESTED" && (
                        <button onClick={() => handleServiceAction(i, "ACCEPTED")} className="accept-btn">
                          ACCEPT
                        </button>
                      )}
                      {request.status === "ACCEPTED" && (
                        <button onClick={() => handleServiceAction(i, "COMPLETED")} className="complete-btn">
                          COMPLETE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stands-overview">
              <h3>STANDS OVERVIEW</h3>
              <div className="stands-grid">
                {Object.entries(stands).map(([stand, info]) => (
                  <div key={stand} className="stand-card">
                    <div className="stand-number">{stand}</div>
                    <div className="stand-info">
                      <div className="flight-number">{info.flight || "Available"}</div>
                      <div className="aircraft-type">{info.aircraft}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="communication-panel">
          <div className="chat-header">
            <h3>💬 GROUND CONTROL CHAT</h3>
            {selectedStand && <span className="active-stand">Active: {selectedStand}</span>}
          </div>
          <div className="chat-messages">
            {messages
              .filter(m => !selectedStand || m.stand === selectedStand)
              .map((msg, i) => (
                <div key={i} className={`message ${msg.mode}`}>
                  <div className="message-header">
                    <span className="sender">{msg.sender}</span>
                    <span className="timestamp">{msg.timestamp}</span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder={selectedStand ? `Message for ${selectedStand}...` : "Select a stand first..."}
              className="message-input"
              disabled={!selectedStand}
            />
            <button onClick={sendMessage} className="send-btn" disabled={!selectedStand}>
              SEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
