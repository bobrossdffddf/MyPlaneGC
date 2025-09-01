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
  const [aircraftModel, setAircraftModel] = useState("");
  const [aircraftData, setAircraftData] = useState(null);
  const [trainingMode, setTrainingMode] = useState(false);
  const [passengerManifest, setPassengerManifest] = useState([]);
  const [currentTrainingStep, setCurrentTrainingStep] = useState(0);
  const [trainingScenario, setTrainingScenario] = useState("basic_atc");
  const [atcCurrentQuestion, setAtcCurrentQuestion] = useState(0);
  const [atcScore, setAtcScore] = useState(0);
  const [activeGuideCategory, setActiveGuideCategory] = useState("fueling");
  const [atisData, setAtisData] = useState({
    info: 'INFO BRAVO',
    wind: '270°/08KT',
    qnh: '1013',
    runway: '27 ACTIVE',
    conditions: 'CAVOK',
    temperature: '15°C'
  });
  const [checklists, setChecklists] = useState({
    preflight: [
      { item: "Aircraft Documents Review - Check airworthiness certificate, registration, weight & balance", checked: false, category: "Documentation" },
      { item: "Weather & NOTAM Brief - Review current and forecast weather, NOTAMs for departure and destination", checked: false, category: "Documentation" },
      { item: "Flight Plan Filed - Ensure flight plan is filed with ATC and route is loaded in FMS", checked: false, category: "Documentation" },
      { item: "Weight & Balance Calculated - Verify passenger/cargo loading within limits", checked: false, category: "Documentation" },
      { item: "External Visual Inspection - Walk around aircraft checking for damage, leaks, obstructions", checked: false, category: "External" },
      { item: "Fuel Quantity & Quality Check - Verify fuel quantity matches flight plan, check for contamination", checked: false, category: "External" },
      { item: "Control Surface Movement - Check ailerons, elevators, rudder move freely and correctly", checked: false, category: "External" },
      { item: "Tire & Landing Gear Inspection - Check tire condition, strut extension, gear pins removed", checked: false, category: "External" },
      { item: "Engine Intake Inspection - Check for foreign objects, cover removal, fan blade condition", checked: false, category: "External" },
      { item: "Static Port & Pitot Tube Check - Ensure covers removed and ports clear", checked: false, category: "External" },
      { item: "Navigation Light Test - Verify all exterior lights operational", checked: false, category: "External" },
      { item: "Cockpit Preparation - Seat adjustment, harness check, oxygen mask test", checked: false, category: "Cockpit" },
      { item: "Navigation Systems Test - Test GPS, VOR, ILS, autopilot systems", checked: false, category: "Cockpit" },
      { item: "Communication Radio Check - Test VHF, ATC, company frequency radios", checked: false, category: "Cockpit" },
      { item: "Instrument Panel Check - Verify all instruments operational and within limits", checked: false, category: "Cockpit" },
      { item: "Emergency Equipment Check - Locate and test emergency exits, life vests, oxygen", checked: false, category: "Cockpit" },
      { item: "Transponder & TCAS Check - Set squawk code and verify TCAS operational", checked: false, category: "Avionics" },
      { item: "Ground Proximity Warning Test - Test GPWS and terrain awareness systems", checked: false, category: "Avionics" }
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

  const atcTrainingQuestions = {
    basic_atc: [
      {
        scenario: "You're approaching IRFD airport and need to contact ground control.",
        atcMessage: "November Charlie Bravo Whiskey, taxi via Alpha Kilo, hold short runway 27.",
        question: "What's your correct response?",
        options: [
          "November Charlie Bravo Whiskey, taxi via Alpha Kilo, hold short runway 27",
          "Roger, taxi Alpha Kilo, hold short 27, November Charlie Bravo Whiskey",
          "Copy that, heading to runway 27",
          "Affirmative, proceeding to Alpha Kilo"
        ],
        correct: 1,
        explanation: "Always read back taxi instructions and your callsign for confirmation."
      },
      {
        scenario: "Ground control gives you pushback clearance.",
        atcMessage: "November Charlie Bravo Whiskey, pushback approved, face east.",
        question: "What's your response?",
        options: [
          "Pushback approved, November Charlie Bravo Whiskey",
          "Pushback approved, face east, November Charlie Bravo Whiskey",
          "Roger, pushing back",
          "Copy pushback"
        ],
        correct: 1,
        explanation: "Read back pushback clearance including direction and your callsign."
      },
      {
        scenario: "You're ready for takeoff.",
        atcMessage: "November Charlie Bravo Whiskey, runway 27, cleared for takeoff.",
        question: "What's your response?",
        options: [
          "Cleared for takeoff runway 27, November Charlie Bravo Whiskey",
          "Roger, taking off",
          "Copy that, departing",
          "Affirmative, runway 27"
        ],
        correct: 0,
        explanation: "Always read back takeoff clearance with runway number and callsign."
      },
      {
        scenario: "Tower asks you to contact departure.",
        atcMessage: "November Charlie Bravo Whiskey, contact departure 124.8, good day.",
        question: "What's your response?",
        options: [
          "Good day, November Charlie Bravo Whiskey",
          "124.8, November Charlie Bravo Whiskey, good day",
          "Roger, switching to departure",
          "Copy, going to 124.8"
        ],
        correct: 1,
        explanation: "Read back the frequency and include your callsign when switching."
      },
      {
        scenario: "You need to request taxi to the gate after landing.",
        atcMessage: "November Charlie Bravo Whiskey, turn left Bravo 3, contact ground 121.9.",
        question: "What's your correct response?",
        options: [
          "Left Bravo 3, ground 121.9, November Charlie Bravo Whiskey",
          "Roger, turning left",
          "Copy ground frequency",
          "Switching to ground"
        ],
        correct: 0,
        explanation: "Read back taxi instructions and frequency change with your callsign."
      }
    ],
    emergency_atc: [
      {
        scenario: "You have a medical emergency on board.",
        atcMessage: "All stations, all stations, November Charlie Bravo Whiskey declaring medical emergency.",
        question: "What information should you provide next?",
        options: [
          "Request immediate landing",
          "Souls on board, fuel remaining, nature of emergency",
          "Just the location",
          "Aircraft type only"
        ],
        correct: 1,
        explanation: "Always provide souls on board, fuel remaining, and nature of emergency."
      },
      {
        scenario: "Tower responds to your emergency.",
        atcMessage: "November Charlie Bravo Whiskey, emergency services alerted, runway 27 available, report souls and fuel.",
        question: "How do you respond?",
        options: [
          "November Charlie Bravo Whiskey, 156 souls, 2 hours fuel, requesting medical assistance on arrival",
          "We have emergency",
          "Landing runway 27",
          "Medical emergency confirmed"
        ],
        correct: 0,
        explanation: "Provide exact numbers and specific assistance needed."
      }
    ],
    ground_coordination: [
      {
        scenario: "You're at the gate and need ground power.",
        atcMessage: "Ground, November Charlie Bravo Whiskey at gate A12, requesting ground power.",
        question: "What's the appropriate way to make this request?",
        options: [
          "Ground power please",
          "November Charlie Bravo Whiskey, gate A12, requesting ground power connection",
          "We need power",
          "Connect ground power"
        ],
        correct: 1,
        explanation: "Use your callsign, state your position, and make specific requests."
      },
      {
        scenario: "Ground crew asks for passenger count.",
        atcMessage: "November Charlie Bravo Whiskey, ground crew requests passenger count for catering.",
        question: "How do you respond?",
        options: [
          "November Charlie Bravo Whiskey, 156 passengers on board",
          "Full load",
          "Normal capacity",
          "Check the manifest"
        ],
        correct: 0,
        explanation: "Provide exact passenger count for catering and ground services."
      }
    ]
  };

  const groundCrewGuides = {
    fueling: {
      title: "Aircraft Fueling Procedures",
      sections: [
        {
          title: "Safety First",
          image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=200&fit=crop",
          steps: [
            "Ensure aircraft engines are shut down",
            "Check for proper grounding equipment",
            "Verify no smoking signs are posted",
            "Confirm fire extinguisher is available",
            "Check fuel truck positioning"
          ]
        },
        {
          title: "Fuel Connection",
          image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=200&fit=crop",
          steps: [
            "Connect static grounding wire first",
            "Remove fuel cap carefully",
            "Insert fuel nozzle properly",
            "Secure all connections",
            "Begin fuel flow slowly"
          ]
        },
        {
          title: "Monitoring Process",
          image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop",
          steps: [
            "Monitor fuel quantity gauges",
            "Check for any leaks or spills",
            "Communicate with flight crew",
            "Watch for proper fuel distribution",
            "Stop at required quantity"
          ]
        }
      ]
    },
    pushback: {
      title: "Pushback Operations",
      sections: [
        {
          title: "Pre-Pushback Checks",
          image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=200&fit=crop",
          steps: [
            "Verify pushback clearance from ATC",
            "Check area is clear of obstacles",
            "Ensure tow bar is properly connected",
            "Test communication with cockpit",
            "Position safety cones if needed"
          ]
        },
        {
          title: "Pushback Execution",
          image: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=200&fit=crop",
          steps: [
            "Begin pushback slowly and smoothly",
            "Monitor aircraft nose wheel steering",
            "Communicate direction changes to pilots",
            "Watch for other aircraft and vehicles",
            "Stop at designated position"
          ]
        }
      ]
    },
    baggage: {
      title: "Baggage Handling",
      sections: [
        {
          title: "Loading Procedures",
          image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=200&fit=crop",
          steps: [
            "Check baggage compartment is clear",
            "Load heavy items first",
            "Distribute weight evenly",
            "Secure all containers properly",
            "Close and lock compartment doors"
          ]
        }
      ]
    },
    catering: {
      title: "Catering Services",
      sections: [
        {
          title: "Catering Setup",
          image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=200&fit=crop",
          steps: [
            "Position catering truck at correct door",
            "Raise platform to door level",
            "Open aircraft catering doors",
            "Remove old catering supplies",
            "Load new catering items systematically"
          ]
        }
      ]
    }
  };

  const generatePassengerManifest = (aircraftType) => {
    const maxSeats = aircraftData?.maxSeats || 180;
    const passengerCount = Math.floor(maxSeats * (0.7 + Math.random() * 0.25));
    const manifest = [];

    const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "Robert", "Anna", "James", "Maria"];
    const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Miller", "Moore", "Taylor", "Anderson", "Thomas"];
    const seatClasses = ["Economy", "Premium Economy", "Business", "First"];

    for (let i = 0; i < passengerCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const seatRow = Math.floor(Math.random() * 40) + 1;
      const seatLetter = String.fromCharCode(65 + Math.floor(Math.random() * 6));

      manifest.push({
        id: i + 1,
        name: `${firstName} ${lastName}`,
        seat: `${seatRow}${seatLetter}`,
        class: seatClasses[Math.floor(Math.random() * seatClasses.length)],
        checkedIn: Math.random() > 0.1,
        specialRequests: Math.random() > 0.8 ? ["Wheelchair", "Dietary", "Unaccompanied Minor"][Math.floor(Math.random() * 3)] : null,
        frequent: Math.random() > 0.7
      });
    }

    return manifest;
  };

  const getCurrentAirportStands = () => {
    if (!selectedAirport) return [];
    return getAirportConfig(selectedAirport).stands;
  };

  // Load aircraft 3D model and data when aircraft type changes
  useEffect(() => {
    if (aircraft) {
      // Check for 3D model files (GLB, GLTF, or OBJ)
      const modelFormats = ['glb', 'gltf', 'obj'];
      let modelFound = false;

      const tryLoadModel = async () => {
        for (const format of modelFormats) {
          try {
            const response = await fetch(`/aircraft_models/${aircraft}.${format}`);
            if (response.ok) {
              setAircraftModel(`/aircraft_models/${aircraft}.${format}`);
              modelFound = true;
              break;
            }
          } catch (error) {
            // Continue to next format
          }
        }

        if (!modelFound) {
          setAircraftModel(""); // Use default if no 3D model found
        }
      };

      tryLoadModel();

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
          // Generate passenger manifest when aircraft data is loaded
          const manifest = generatePassengerManifest(aircraft);
          setPassengerManifest(manifest);
        })
        .catch(() => {
          // Use default aircraft data
          const defaultData = {
            type: aircraft,
            manufacturer: aircraft.startsWith('A') ? 'Airbus' : 'Boeing',
            maxSeats: aircraft.includes('380') ? 850 : aircraft.includes('747') ? 660 : 180,
            range: aircraft.includes('787') ? 15750 : 6500,
            maxSpeed: 560,
            engines: aircraft.includes('A380') || aircraft.includes('747') ? 4 : 2,
            fuelCapacity: aircraft.includes('A380') ? 84535 : 26020
          };
          setAircraftData(defaultData);
          const manifest = generatePassengerManifest(aircraft);
          setPassengerManifest(manifest);
        });
    } else {
      setAircraftModel("");
      setAircraftData(null);
      setPassengerManifest([]);
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
    if (aircraftModel) {
      return (
        <div className="aircraft-display-3d">
          <div className="aircraft-3d-container">
            <div className="aircraft-3d-viewer">
              <model-viewer
                src={aircraftModel}
                alt={`${aircraft} 3D model`}
                auto-rotate
                camera-controls
                environment-image="neutral"
                shadow-intensity="1"
                style={{
                  width: '100%',
                  height: '400px',
                  background: 'transparent'
                }}
              ></model-viewer>
            </div>
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
            <div className="brand-subtitle">Professional Aviation Ground Operations</div>
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

        case "training":
          return (
            <div className="atc-training-container">
              <div className="atc-training-header">
                <h2>ATC COMMUNICATION TRAINING</h2>
                <div className="training-stats">
                  <div className="stat">Score: {atcScore}/{atcCurrentQuestion}</div>
                  <div className="stat">Question: {atcCurrentQuestion + 1}/{atcTrainingQuestions[trainingScenario]?.length || 0}</div>
                </div>
              </div>

              {!trainingMode ? (
                <div className="scenario-modules">
                  <h3>Choose Training Module</h3>
                  <button 
                    className={`module-btn ${trainingScenario === 'basic_atc' ? 'active' : ''}`}
                    onClick={() => setTrainingScenario('basic_atc')}
                  >
                    Basic ATC Communications
                  </button>
                  <button 
                    className={`module-btn ${trainingScenario === 'emergency_atc' ? 'active' : ''}`}
                    onClick={() => setTrainingScenario('emergency_atc')}
                  >
                    Emergency Procedures
                  </button>
                  <button 
                    className={`module-btn ${trainingScenario === 'ground_coordination' ? 'active' : ''}`}
                    onClick={() => setTrainingScenario('ground_coordination')}
                  >
                    Ground Coordination
                  </button>
                  <button 
                    className="start-training"
                    onClick={() => {
                      setTrainingMode(true);
                      setAtcCurrentQuestion(0);
                      setAtcScore(0);
                    }}
                  >
                    START TRAINING
                  </button>
                </div>
              ) : (
                <div className="atc-scenario-active">
                  {atcTrainingQuestions[trainingScenario] && atcCurrentQuestion < atcTrainingQuestions[trainingScenario].length ? (
                    <div className="current-question">
                      <div className="situation-panel">
                        <h4>Situation</h4>
                        <p>{atcTrainingQuestions[trainingScenario][atcCurrentQuestion].scenario}</p>
                      </div>
                      
                      <div className="atc-message">
                        <div className="atc-speaker">ATC:</div>
                        <div className="atc-text">"{atcTrainingQuestions[trainingScenario][atcCurrentQuestion].atcMessage}"</div>
                      </div>

                      <div className="question-section">
                        <h4>{atcTrainingQuestions[trainingScenario][atcCurrentQuestion].question}</h4>
                        <div className="multiple-choice">
                          {atcTrainingQuestions[trainingScenario][atcCurrentQuestion].options.map((option, index) => (
                            <button 
                              key={index}
                              className="choice-btn"
                              onClick={() => {
                                const isCorrect = index === atcTrainingQuestions[trainingScenario][atcCurrentQuestion].correct;
                                if (isCorrect) setAtcScore(atcScore + 1);
                                
                                socket.emit("chatMessage", {
                                  text: isCorrect ? 
                                    `✅ Correct! ${atcTrainingQuestions[trainingScenario][atcCurrentQuestion].explanation}` :
                                    `❌ Incorrect. ${atcTrainingQuestions[trainingScenario][atcCurrentQuestion].explanation}`,
                                  sender: "ATC TRAINING",
                                  stand: selectedStand || "TRAINING",
                                  airport: selectedAirport,
                                  timestamp: new Date().toLocaleTimeString(),
                                  mode: "system"
                                });
                                
                                setTimeout(() => {
                                  setAtcCurrentQuestion(atcCurrentQuestion + 1);
                                }, 2000);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="training-complete">
                      <h3>Training Complete!</h3>
                      <p>Final Score: {atcScore}/{atcTrainingQuestions[trainingScenario].length}</p>
                      <button 
                        className="restart-training"
                        onClick={() => {
                          setAtcCurrentQuestion(0);
                          setAtcScore(0);
                        }}
                      >
                        RESTART
                      </button>
                      <button 
                        className="exit-training"
                        onClick={() => setTrainingMode(false)}
                      >
                        EXIT TRAINING
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );

        case "manifest":
          return (
            <div className="manifest-container">
              <div className="manifest-header">
                <h2>PASSENGER MANIFEST</h2>
                <div className="manifest-stats">
                  <div className="stat">
                    <span className="stat-value">{passengerManifest.length}</span>
                    <span className="stat-label">TOTAL PAX</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{passengerManifest.filter(p => p.checkedIn).length}</span>
                    <span className="stat-label">CHECKED IN</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{passengerManifest.filter(p => p.specialRequests).length}</span>
                    <span className="stat-label">SPECIAL REQ</span>
                  </div>
                </div>
              </div>

              <div className="manifest-content">
                <div className="manifest-filters">
                  <select className="filter-select">
                    <option value="all">All Passengers</option>
                    <option value="checkedIn">Checked In</option>
                    <option value="notCheckedIn">Not Checked In</option>
                    <option value="special">Special Requests</option>
                  </select>
                </div>

                <div className="passenger-list">
                  {passengerManifest.map((passenger) => (
                    <div key={passenger.id} className={`passenger-item ${passenger.checkedIn ? 'checked-in' : 'not-checked-in'}`}>
                      <div className="passenger-info">
                        <div className="passenger-name">{passenger.name}</div>
                        <div className="passenger-details">
                          <span className="seat">{passenger.seat}</span>
                          <span className="class">{passenger.class}</span>
                          {passenger.frequent && <span className="frequent">FREQUENT</span>}
                        </div>
                      </div>
                      <div className="passenger-status">
                        <div className={`check-status ${passenger.checkedIn ? 'checked' : 'pending'}`}>
                          {passenger.checkedIn ? '✓' : '○'}
                        </div>
                        {passenger.specialRequests && (
                          <div className="special-req">{passenger.specialRequests}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

        case "guides":
          return (
            <div className="guides-container">
              <div className="guides-header">
                <h2>GROUND CREW OPERATIONS GUIDES</h2>
                <div className="guide-tabs">
                  {Object.keys(groundCrewGuides).map(category => (
                    <button
                      key={category}
                      className={`guide-tab ${activeGuideCategory === category ? 'active' : ''}`}
                      onClick={() => setActiveGuideCategory(category)}
                    >
                      {groundCrewGuides[category].title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="guide-content">
                <h3>{groundCrewGuides[activeGuideCategory].title}</h3>
                {groundCrewGuides[activeGuideCategory].sections.map((section, index) => (
                  <div key={index} className="guide-section">
                    <div className="guide-item">
                      <img 
                        src={section.image} 
                        alt={section.title}
                        className="guide-image"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+R3JvdW5kIE9wZXJhdGlvbnM8L3RleHQ+Cjwvc3ZnPgo=';
                        }}
                      />
                      <div className="guide-text">
                        <h4>{section.title}</h4>
                        <ol>
                          {section.steps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                ))}
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

      // Removed supervisor mode rendering as per instructions
      return (
        <div className="groundcrew-main">
          <div className="queue-header">
            <h2>GROUND OPERATIONS - {selectedAirport}</h2>
            <div className="operational-status">
              <div className="status-indicator active"></div>
              <span>ALL SYSTEMS OPERATIONAL</span>
            </div>
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
            <h3>GROUND COMMUNICATIONS</h3>
            <div className="comm-status">ONLINE</div>
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
            className={`nav-btn ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            <span className="nav-icon">🎓</span>
            <span>TRAINING</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'manifest' ? 'active' : ''}`}
            onClick={() => setActiveTab('manifest')}
          >
            <span className="nav-icon">👥</span>
            <span>MANIFEST</span>
          </button>
          <button
            className={`nav-btn ${activeTab === 'guides' ? 'active' : ''}`}
            onClick={() => setActiveTab('guides')}
          >
            <span className="nav-icon">📖</span>
            <span>GUIDES</span>
          </button>
        </div>
      )}
    </div>
  );
}