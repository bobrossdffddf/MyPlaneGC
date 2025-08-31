import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io();

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    socket.on("chatUpdate", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("serviceUpdate", (req) => setRequests((prev) => [...prev, req]));

    return () => {
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() === "") return;
    socket.emit("chatMessage", input);
    setInput("");
  };

  const requestService = (service) => {
    socket.emit("serviceRequest", { service, time: new Date().toLocaleTimeString() });
  };

  return (
    <div style={{ display: "flex", height: "100vh", color: "white", background: "#111" }}>
      <div style={{ flex: 2, padding: 20 }}>
        <h2>Ground Services</h2>
        {["GPU", "Fuel", "Catering", "Pushback"].map((s) => (
          <button
            key={s}
            onClick={() => requestService(s)}
            style={{ display: "block", margin: "10px 0", padding: "10px", background: "#333" }}
          >
            Request {s}
          </button>
        ))}
        <h3>Requests</h3>
        <ul>
          {requests.map((r, i) => (
            <li key={i}>{r.service} requested at {r.time}</li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, padding: 20, borderLeft: "1px solid gray" }}>
        <h2>Chat</h2>
        <div style={{ height: "70%", overflowY: "scroll", border: "1px solid gray", padding: 10 }}>
          {messages.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "80%", padding: 5 }}
        />
        <button onClick={sendMessage} style={{ padding: 5, marginLeft: 5 }}>
          Send
        </button>
      </div>
    </div>
  );
}
