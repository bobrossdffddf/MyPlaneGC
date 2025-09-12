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
  const [passengerManifest, setPassengerManifest] = useState([]);
  const [permits, setPermits] = useState([]);
  const [activePermitForm, setActivePermitForm] = useState(null);
  const [permitFormData, setPermitFormData] = useState({});
  const [flightDocuments, setFlightDocuments] = useState({
    flightPlan: { filed: false, route: "", altitude: "", departure: "", destination: "" },
    weightBalance: { completed: false, totalWeight: 0, cg: 0, fuel: 0 },
    weatherBrief: { obtained: false, conditions: "", visibility: "", winds: "" },
    notams: { reviewed: false, count: 0, critical: [] },
    permits: { special: [], diplomatic: [], overweight: [] }
  });
  const [groundCallsignCounter, setGroundCallsignCounter] = useState(1);
  const [assignedCallsign, setAssignedCallsign] = useState("");
  const [groundCrewCallsign, setGroundCrewCallsign] = useState(""); // State for ground crew callsign
  const [activeGuideCategory, setActiveGuideCategory] = useState("fueling");
  const [mcduDisplay, setMcduDisplay] = useState({
    currentPage: "INIT",
    lines: [],
    scratchpad: "",
    activeLineSelect: null,
    fromAirport: "",
    toAirport: "",
    flightNumberMcdu: "",
    grossWeight: ""
  });

  const [groundCrewSchedule, setGroundCrewSchedule] = useState([]);
  const [equipmentStatus, setEquipmentStatus] = useState({});
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [standManagementMode, setStandManagementMode] = useState(true); // Always enabled
  const [selectedStandForManagement, setSelectedStandForManagement] = useState("");
  const [quickFlightNumber, setQuickFlightNumber] = useState("");
  const [quickAircraft, setQuickAircraft] = useState("");
  const [activeServiceRequests, setActiveServiceRequests] = useState({});
  const [commMinimized, setCommMinimized] = useState(false);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [mouseTimer, setMouseTimer] = useState(null);
  const [chatFilter, setChatFilter] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [badWordsFilter, setBadWordsFilter] = useState(true);
  const [lastServiceRequest, setLastServiceRequest] = useState({});
  const [airportUserCounts, setAirportUserCounts] = useState({});
  const [showPushbackForm, setShowPushbackForm] = useState(false);
  const [pushbackFormData, setPushbackFormData] = useState({
    tugSize: '',
    clearedByGround: false,
    tailDirection: ''
  });

  // Partnership carousel state
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0);
  const [showPartnerships, setShowPartnerships] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogData, setChangelogData] = useState(null);

  // Partnership data - you can customize this
  const partnerships = [
    {
      image: "https://cdn.discordapp.com/attachments/1414069423077200004/1415592919615672320/image-aircraft-design.jpg?ex=68c5bf64&is=68c46de4&hm=1911586f9fbedffd2f786c145ca264007e2276e9c851316538f383f4be059a48&r",
      title: "Hawaiian Airlines",
      description: "Hawaii Starts Here "
    },
    {
      image: "https://images.ext-1.discordapp.net/external/I8JsnA0Z92V7xbG1qnkSN0Ia6qqWQEJ3l7t-bqK1qJw/https/cdn.discordapp.com/icons/1369593726262972487/1921ab8dd4fc249951595e42ba8fd9e0.png?format=webp&quality=lossless&width=102&height=102",
      title: "24Academy.com",
      description: "ATC24 Academy helps controllers and pilots improve their skills, learn tips and tricks for controlling or piloting."
    }
  ];

  // Static permit document ID to prevent it from changing
  const [permitDocumentId] = useState(() => `DOC${Date.now().toString().slice(-6)}`);

  // Bad words list for filtering
  const badWords = [
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap', 'piss', 'cock', 'dick', 'pussy', 'tits', 'boobs', 'sex', 'porn', 'nude', 'naked', 'kill', 'die', 'murder', 'suicide', 'rape', 'nazi', 'hitler', 'terrorist', 'bomb', 'gun', 'weapon', 'drug', 'cocaine', 'weed', 'marijuana', 'alcohol', 'beer', 'wine', 'drunk', 'stupid', 'idiot', 'moron', 'retard', 'gay', 'lesbian', 'homo', 'faggot', 'nigger', 'nigga', 'spic', 'chink', 'kike', 'wetback', 'towelhead', 'sand nigger', 'cracker', 'honkey', 'whitey', 'blackie'
  ];

  const containsBadWords = (text) => {
    if (!badWordsFilter) return false;
    const lowerText = text.toLowerCase();
    return badWords.some(word => {
      const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'gi');
      return regex.test(lowerText);
    });
  };

  const filterBadWords = (text) => {
    if (!badWordsFilter) return text;
    let filteredText = text;
    badWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    return filteredText;
  };

  // Helper function to add messages and filter bad words
  const addChatMessage = (message) => {
    const filteredMessage = {
      ...message,
      text: filterBadWords(message.text)
    };
    setMessages((prev) => [...prev, filteredMessage]);
  };

  const handleMcduKey = (key) => {
    setMcduDisplay(prev => {
      let newState = { ...prev };

      if (key >= 'A' && key <= 'Z') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + key;
        }
      } else if (key >= '0' && key <= '9') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + key;
        }
      } else if (key === 'CLR') {
        if (prev.scratchpad.length > 0) {
          newState.scratchpad = prev.scratchpad.slice(0, -1);
        }
      } else if (key === 'SP') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + ' ';
        }
      } else if (key === '/') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + '/';
        }
      } else if (key === '.') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + '.';
        }
      } else if (key === '-') {
        if (prev.scratchpad.length < 12) {
          newState.scratchpad = prev.scratchpad + '-';
        }
      } else if (key.startsWith('LSK')) {
        const lineNumber = parseInt(key.replace(/LSK(\d+)[LR]/, '$1'));
        const side = key.includes('L') ? 'L' : 'R';
        return handleLineSelect(lineNumber, side, prev);
      } else if (key === 'INIT') {
        newState.currentPage = 'INIT';
        newState.scratchpad = '';
      } else if (key === 'F-PLN') {
        newState.currentPage = 'FPLN';
        newState.scratchpad = '';
      } else if (key === 'PERF') {
        newState.currentPage = 'PERF';
        newState.scratchpad = '';
      } else if (key === 'DATA') {
        newState.currentPage = 'DATA';
        newState.scratchpad = '';
      } else if (key === 'MENU') {
        newState.currentPage = 'MENU';
        newState.scratchpad = '';
      }

      return updateMcduDisplayState(newState);
    });
  };

  const handleLineSelect = (lineNumber, side, currentState) => {
    if (currentState.scratchpad) {
      let newState = { ...currentState };

      switch (currentState.currentPage) {
        case 'INIT':
          if (lineNumber === 2 && side === 'L') {
            // FROM airport
            if (currentState.scratchpad.length === 4) {
              newState.fromAirport = currentState.scratchpad;
              newState.scratchpad = '';
            }
          } else if (lineNumber === 2 && side === 'R') {
            // TO airport
            if (currentState.scratchpad.length === 4) {
              newState.toAirport = currentState.scratchpad;
              newState.scratchpad = '';
            }
          } else if (lineNumber === 3 && side === 'L') {
            // Flight number
            newState.flightNumberMcdu = currentState.scratchpad;
            newState.scratchpad = '';
          }
          break;
        case 'PERF':
          if (lineNumber === 1 && side === 'L') {
            // Gross weight input
            if (!isNaN(parseFloat(currentState.scratchpad))) {
              newState.grossWeight = currentState.scratchpad;
              newState.scratchpad = '';
            }
          }
          break;
      }

      return updateMcduDisplayState(newState);
    }
    return currentState;
  };

  const updateMcduDisplayState = (state) => {
    let newLines = [];

    switch (state.currentPage) {
      case 'INIT':
        newLines = [
          "     A320 INIT      ",
          "",
          "FROM/TO",
          `${state.fromAirport || selectedAirport || "----"}/${state.toAirport || "----"}`,
          "",
          "FLT NBR        COST INDEX",
          `${state.flightNumberMcdu || flightNumber || "----"}              085`,
          "",
          "ALTN         CRZ FL/TEMP",
          "----         FL350/-45C",
          "",
          "<INDEX       INIT>"
        ];
        break;
      case 'FPLN':
        newLines = [
          "    A320 F-PLN     1/1",
          "",
          `FROM         ${state.fromAirport || selectedAirport || "----"}`,
          `TO           ${state.toAirport || "----"}`,
          "",
          "VIA          DIRECT",
          "",
          "DIST         ---NM",
          "TIME         --:--",
          "",
          "<AIRWAYS     NAV>",
          "<PRINT       PRINT>"
        ];
        break;
      case 'PERF':
        newLines = [
          "   A320 PERF INIT   1/3",
          "",
          "GW           " + (state.grossWeight || "---.-") + "T",
          `PAX          ${passengerManifest.length}/180`,
          "",
          "V1           147KT",
          "VR           152KT",
          "V2           159KT",
          "",
          "TRANS ALT    18000FT",
          "",
          "<TAKEOFF     APPR>"
        ];
        break;
      case 'DATA':
        newLines = [
          "    A320 DATA       ",
          "",
          "GPS PRIMARY      GPS",
          "IRS1 PRIMARY     IRS",
          "",
          "PRINT FUNCTION",
          "",
          "ACARS FUNCTION",
          "",
          "AIDS",
          "",
          "<REQUEST     PRINT>"
        ];
        break;
      case 'MENU':
        newLines = [
          "    A320 MCDU MENU  ",
          "",
          "<FMGC        ATSU>",
          "",
          "<AIDS        CFDS>",
          "",
          "<MAINTENANCE     >",
          "",
          "<SYS REPORT/TEST>",
          "",
          "",
          "<RETURN"
        ];
        break;
      default:
        newLines = state.lines || [];
    }

    return { ...state, lines: newLines };
  };

  const updateMcduDisplay = () => {
    setMcduDisplay(prev => updateMcduDisplayState(prev));
  };

  useEffect(() => {
    updateMcduDisplay();
  }, [mcduDisplay.currentPage, selectedAirport, flightNumber, passengerManifest.length]);

  // Auto-hide bottom navigation logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      const bottomThreshold = windowHeight - 80; // Show when mouse is within 80px of bottom

      // Clear existing timer
      if (mouseTimer) {
        clearTimeout(mouseTimer);
      }

      if (mouseY >= bottomThreshold) {
        // Mouse is near bottom, show nav
        setBottomNavHidden(false);
      } else {
        // Mouse is away from bottom, hide after delay
        const timer = setTimeout(() => {
          setBottomNavHidden(true);
        }, 2000); // Hide after 2 seconds
        setMouseTimer(timer);
      }
    };

    const handleMouseEnterNav = () => {
      // Keep nav visible when hovering over it
      if (mouseTimer) {
        clearTimeout(mouseTimer);
      }
      setBottomNavHidden(false);
    };

    const handleMouseLeaveNav = () => {
      // Hide nav when leaving it
      const timer = setTimeout(() => {
        setBottomNavHidden(true);
      }, 1000); // Hide after 1 second
      setMouseTimer(timer);
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Add event listeners to nav when it exists
    const navElement = document.querySelector('.bottom-nav');
    if (navElement) {
      navElement.addEventListener('mouseenter', handleMouseEnterNav);
      navElement.addEventListener('mouseleave', handleMouseLeaveNav);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (navElement) {
        navElement.removeEventListener('mouseenter', handleMouseEnterNav);
        navElement.removeEventListener('mouseleave', handleMouseLeaveNav);
      }
      if (mouseTimer) {
        clearTimeout(mouseTimer);
      }
    };
  }, [mouseTimer]);
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
      { item: "Flight Documents - Review flight plan, weather, NOTAMs, MEL", checked: false, category: "Documentation" },
      { item: "Weight & Balance - Verify loadsheet and CG within limits", checked: false, category: "Documentation" },
      { item: "Performance Data - Calculate V-speeds, runway analysis complete", checked: false, category: "Documentation" },
      { item: "External Inspection - Complete walk-around inspection", checked: false, category: "External" },
      { item: "Fuel Quantity - Verify fuel quantity and quality", checked: false, category: "External" },
      { item: "Oxygen - Check quantity and pressure", checked: false, category: "Cockpit" },
      { item: "Circuit Breakers - All in and no flags", checked: false, category: "Cockpit" },
      { item: "Emergency Equipment - Check location and serviceability", checked: false, category: "Cockpit" },
      { item: "Flight Controls - Check freedom and correct movement", checked: false, category: "Systems" },
      { item: "Navigation Equipment - IRS align, GPS, radios set", checked: false, category: "Systems" },
      { item: "Transponder - Set to STBY, code entered", checked: false, category: "Systems" },
      { item: "Weather Radar - Test and set to appropriate range", checked: false, category: "Systems" }
    ],
    beforestart: [
      { item: "Parking Brake - SET", checked: false, category: "Safety" },
      { item: "Seat Belts - FASTENED", checked: false, category: "Safety" },
      { item: "Fuel Pumps - ON", checked: false, category: "Systems" },
      { item: "Beacon - ON", checked: false, category: "Lights" },
      { item: "APU - START (if required)", checked: false, category: "Power" },
      { item: "Engine Start Switches - OFF", checked: false, category: "Engine" },
      { item: "Thrust Levers - IDLE", checked: false, category: "Engine" },
      { item: "Speed Brake - DOWN", checked: false, category: "Controls" },
      { item: "Parking Brake - RELEASE", checked: false, category: "Controls" }
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
    "IRFD", "IZOL", "IPPH", "IGRV", "ISAU", "IBTH", "ISKP",
    "IGAR", "IBLT", "IMLR", "ITRC", "IDCS", "ITKO", "IJAF", "ISCM",
    "IHEN", "ILAR", "IIAB", "IPAP"
  ];

  const [airportSearchTerm, setAirportSearchTerm] = useState("");

  const aircraftTypes = [
    "A-10 Warthog", "A6M Zero", "Airbus A220", "Airbus A320", "Airbus A330", "Airbus A340",
    "Airbus A350", "Airbus A380", "Airbus Beluga", "Airbus H135", "Antonov An-22", "Antonov AN-225",
    "ATR-72", "Avro Vulcan", "B-1 Lancer", "B-2 Spirit", "B29", "Beechcraft King Air 260",
    "Bell 412", "Blimp", "Boeing 707", "Boeing 727", "Boeing 737", "Boeing 747", "Boeing 757",
    "Boeing 767", "Boeing 777", "Boeing 787", "Boeing C-17 Globemaster III", "Boeing Dreamlifter",
    "Bombardier CRJ700", "Bombardier Learjet", "Bombardier Q400", "C-130 Hercules", "Caproni Stipa",
    "Cessna 172", "Cessna 182", "Cessna 402", "Cessna Caravan", "Chinook", "Cirrus Vision SF50",
    "Concorde", "Derek's Creation", "DHC-6 Twin Otter", "Diamond DA50", "Embraer E190",
    "English Electric Lightning", "Eurofighter Typhoon", "Extra 300s", "F-14 Tomcat",
    "F-15E Strike Eagle", "F-16 Fighting Falcon", "F-22 Raptor", "F-35B", "F-4 Phantom",
    "F/A-18 Super Hornet", "F4U Corsair", "Fokker Dr1", "Hawk T1", "Hawker Harrier",
    "Hawker Hurricane", "Hot Air Balloon", "Lockheed L-1011 Tristar", "McDonnell Douglas MD-11",
    "McDonnell Douglas MD-90", "Mig-15", "Military UFO", "P-38 Lightning", "P-51 Mustang",
    "Paratrike", "Piper Cub", "Piper PA-28", "Saab JAS 39 Gripen", "Santa's Sled",
    "Sikorsky S-92", "SR-71 Blackbird", "Sukhoi Su-27", "Sukhoi Su-57", "UH-60 Black Hawk",
    "Walrus", "Wright Brothers Plane"
  ];

  const atcTrainingQuestions = {
    basic_atc: [
      {
        scenario: "You're a Boeing 737-800 approaching IRFD and need to contact ground control after landing.",
        atcMessage: "American 1234, contact ground 121.9, good day.",
        question: "What's your correct response?",
        options: [
          "Ground 121.9, American 1234, good day",
          "American 1234, switching to ground",
          "Roger, American 1234",
          "Copy, 121.9"
        ],
        correct: 0,
        explanation: "Always read back the frequency, state your callsign, and acknowledge the controller."
      },
      {
        scenario: "You've contacted ground control after landing and need taxi instructions.",
        atcMessage: "American 1234, taxi to gate B12 via taxiway Charlie, hold short of runway 09.",
        question: "What's your correct readback?",
        options: [
          "Taxi to gate B12 via Charlie, hold short runway 09, American 1234",
          "Roger, going to B12",
          "Copy Charlie to gate B12",
          "American 1234, taxi via Charlie"
        ],
        correct: 0,
        explanation: "Read back ALL taxi instructions including gate, taxiway route, and hold short instructions."
      },
      {
        scenario: "You're ready for pushback from gate A5.",
        atcMessage: "American 1234, pushback approved, face south, contact ground when ready to taxi.",
        question: "What's your response?",
        options: [
          "Pushback approved, American 1234",
          "Pushback approved, face south, will contact ground for taxi, American 1234",
          "Roger, pushing back",
          "Copy pushback, facing south"
        ],
        correct: 1,
        explanation: "Read back the pushback clearance, direction, and acknowledge the instruction to contact ground."
      },
      {
        scenario: "You're holding short of runway 27 and ready for takeoff.",
        atcMessage: "American 1234, runway 27, wind 270 at 8, cleared for takeoff.",
        question: "What's your response?",
        options: [
          "Cleared for takeoff runway 27, American 1234",
          "American 1234, cleared for takeoff",
          "Roger, taking off",
          "Runway 27, cleared for takeoff, American 1234"
        ],
        correct: 3,
        explanation: "Always read back runway number first, then the clearance, followed by your callsign."
      },
      {
        scenario: "Tower is transferring you to departure control.",
        atcMessage: "American 1234, contact departure 124.35, good day.",
        question: "What's your correct response?",
        options: [
          "124.35, American 1234, good day",
          "American 1234, switching to departure",
          "Roger, 124.35",
          "Contact departure, American 1234"
        ],
        correct: 0,
        explanation: "Read back the frequency, state your callsign, and acknowledge courteously."
      },
      {
        scenario: "You need to request a different gate due to ground equipment at your assigned gate.",
        atcMessage: "Ground, American 1234, requesting gate change from A5, equipment blocking assigned gate.",
        question: "How should ground control respond and what should you do?",
        options: [
          "Wait for new gate assignment and taxi instructions",
          "Proceed to any available gate",
          "Return to the ramp and park anywhere",
          "Contact operations directly"
        ],
        correct: 0,
        explanation: "Always wait for ground control to assign a new gate and provide taxi instructions."
      }
    ],
    emergency_atc: [
      {
        scenario: "You have an engine failure during climb out.",
        atcMessage: "MAYDAY MAYDAY MAYDAY, American 1234, engine failure, requesting immediate return to field.",
        question: "What information should ATC request from you?",
        options: [
          "Only your intentions",
          "Aircraft type, souls on board, fuel remaining, assistance required",
          "Just your position",
          "Engine number that failed"
        ],
        correct: 1,
        explanation: "ATC needs aircraft type, souls on board, fuel in hours/minutes, and what assistance you need."
      },
      {
        scenario: "ATC responds to your engine failure emergency.",
        atcMessage: "American 1234, roger your MAYDAY, turn left heading 090, descend and maintain 3000, report souls and fuel.",
        question: "How do you respond?",
        options: [
          "American 1234, left 090, descend 3000, 142 souls, 1 hour 45 minutes fuel",
          "Roger, turning left",
          "Emergency descent to 3000",
          "American 1234, emergency acknowledged"
        ],
        correct: 0,
        explanation: "Read back heading and altitude, then immediately provide souls and fuel information."
      },
      {
        scenario: "You have a cabin pressurization problem at FL350.",
        atcMessage: "American 1234, requesting emergency descent due to cabin pressurization failure.",
        question: "What should you declare and request?",
        options: [
          "PAN PAN and request descent to 10,000 feet",
          "MAYDAY and request immediate descent to 10,000 feet or below",
          "Just request lower altitude",
          "Declare minimum fuel emergency"
        ],
        correct: 1,
        explanation: "Pressurization failure is life-threatening - declare MAYDAY and request immediate descent below 10,000 feet."
      },
      {
        scenario: "You have a medical emergency passenger requiring immediate landing.",
        atcMessage: "PAN PAN PAN PAN, American 1234, medical emergency on board, requesting priority handling and medical assistance on arrival.",
        question: "What should ATC provide you?",
        options: [
          "Just medical assistance",
          "Priority vectors to nearest suitable airport and medical coordination",
          "Only frequency changes",
          "Weather information"
        ],
        correct: 1,
        explanation: "ATC should provide priority handling, vectors to appropriate airport, and coordinate medical assistance."
      }
    ],
    ground_coordination: [
      {
        scenario: "You're at the gate and your ground power unit has failed.",
        atcMessage: "Ramp, American 1234 at gate B12, ground power unit failed, requesting replacement GPU.",
        question: "What's the appropriate way to make this request?",
        options: [
          "American 1234, gate B12, GPU failed, need replacement",
          "Need new ground power",
          "GPU not working at B12",
          "Request maintenance"
        ],
        correct: 0,
        explanation: "State your callsign, position, problem, and specific request clearly and concisely."
      },
      {
        scenario: "Ground operations asks for your passenger count for catering verification.",
        atcMessage: "American 1234, ops, confirm passenger count for catering verification.",
        question: "How do you respond professionally?",
        options: [
          "American 1234, confirming 142 passengers on board for catering",
          "Full load today",
          "142 passengers",
          "Check the manifest"
        ],
        correct: 0,
        explanation: "Always include your callsign and be specific with numbers for operational coordination."
      },
      {
        scenario: "You need to coordinate a fuel truck for additional fuel.",
        atcMessage: "Ops, American 1234 at gate C8, requesting fuel truck for additional 2000 pounds fuel.",
        question: "What information should operations confirm?",
        options: [
          "Just the fuel amount",
          "Aircraft position, fuel amount, and estimated time for fueling",
          "Only the gate number",
          "Flight number only"
        ],
        correct: 1,
        explanation: "Operations needs to confirm location, exact fuel amount, and coordinate timing with other ground services."
      }
    ]
  };

  const groundCrewGuides = {
    marshalling: {
      title: "Aircraft Marshalling & Ground Signals",
      sections: [
        {
          title: "Standard Marshalling Positions",
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop&crop=center",
          steps: [
            "Marshaller positions directly in front of aircraft nose, minimum 15 feet",
            "Wing walkers position at wingtips during taxi operations in congested areas",
            "Maintain constant visual contact with pilot throughout operation",
            "Use only standardized ICAO hand signals - no improvisation",
            "Wear high-visibility reflective vest and carry backup lighting equipment",
            "Always plan and maintain clear escape route in case of emergency",
            "Ensure all ground crew vehicles remain outside aircraft movement envelope"
          ]
        },
        {
          title: "Hand Signals - Movement Control",
          image: "https://images.unsplash.com/photo-1569629698899-7a9a8b5e4e89?w=400&h=300&fit=crop&crop=center",
          steps: [
            "COME FORWARD: Both arms raised above head, palms facing forward, wave toward your body with deliberate motion",
            "MOVE BACK: Both arms raised above head, palms facing outward, wave aircraft away from you",
            "TURN LEFT (aircraft's left): Right arm down at side, left arm extended horizontally pointing left",
            "TURN RIGHT (aircraft's right): Left arm down at side, right arm extended horizontally pointing right",
            "NORMAL STOP: Arms crossed above head forming clear X formation, hold steady",
            "EMERGENCY STOP: Arms crossed above head with rapid, urgent waving motion",
            "SLOW DOWN: Arms extended downward at 45°, palms down, gentle rhythmic up/down motion"
          ]
        },
        {
          title: "Engine and System Signals",
          image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop&crop=center",
          steps: [
            "START ENGINES: Circular motion with right hand above head, pointing to specific engine",
            "SHUT DOWN ENGINES: Hand drawn across throat in decisive cutting motion",
            "CHOCKS IN: Both hands at waist level moving toward each other",
            "CHOCKS OUT: Both hands at waist level moving away from each other",
            "CONNECT GROUND POWER: Point to ground power receptacle, then clear thumbs up",
            "DISCONNECT GROUND POWER: Point to ground power unit, then slashing motion across body",
            "ALL CLEAR: Both arms extended outward horizontally, then swept downward"
          ]
        },
        {
          title: "Gate Positioning and Final Parking",
          image: "https://images.unsplash.com/photo-1544705503-49a2a6f9ae0e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Use precise, deliberate hand movements during final 50 feet of approach",
            "Continuously monitor wingtip clearance and jetbridge alignment",
            "Give clear STOP signal when aircraft nose gear reaches parking position marker",
            "Verify nose gear is precisely on gate centerline before final parking approval",
            "Check jetbridge can be safely positioned before final parking approval",
            "Signal SET PARKING BRAKE with both hands pushing down motion",
            "Wait for pilot acknowledgment before approaching aircraft or signaling ground crew"
          ]
        }
      ]
    },
    fueling: {
      title: "Aircraft Fueling Procedures",
      sections: [
        {
          title: "Pre-Fueling Safety Protocol",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Verify aircraft engines completely shut down and cooled (minimum 15 minutes)",
            "Establish proper grounding bond between fuel truck and aircraft",
            "Check wind conditions - maximum 25 knots for safe fueling operations",
            "Post 'NO SMOKING' signs and establish 50-foot safety perimeter",
            "Confirm fire extinguisher (minimum 150lb CO2 or equivalent) is present",
            "Test all fuel equipment for leaks and proper operation",
            "Check fuel truck positioning allows safe escape routes",
            "Check for any hot work or sources of ignition in area"
          ]
        },
        {
          title: "Narrow Body Aircraft (A320, B737) Fueling",
          image: "https://images.unsplash.com/photo-1585956048631-7a1d3b07cdb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Locate fuel panel on right side of fuselage (typically behind wing)",
            "Open fuel panel and identify fuel connections (overwing or pressure)",
            "Connect grounding cable first, then fuel line to appropriate connection",
            "Set fuel flow rate to maximum 300 gallons per minute for narrow body",
            "Monitor fuel gauges - typical capacity: A320 (6,400 gal), B737 (6,875 gal)",
            "Check for fuel distribution between left and right wing tanks",
            "Maintain communication with flight crew throughout fueling process",
            "Stop fueling at required amount minus 50 gallons, then top off slowly"
          ]
        },
        {
          title: "Wide Body Aircraft (A330, B777, B747) Fueling",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Position multiple fuel trucks for larger aircraft (up to 3 trucks for B747)",
            "Locate fuel panels on both sides of aircraft - typically 2-3 connections per side",
            "Connect fuel lines to underwing pressure refueling connections",
            "Set flow rate up to 600 gallons per minute for wide body aircraft",
            "Monitor multiple tank systems: Main tanks, center tank, trim tank (if equipped)",
            "Fuel capacity examples: A330 (25,000 gal), B777 (45,000 gal), B747 (57,000 gal)",
            "Coordinate fuel distribution to maintain proper aircraft balance",
            "Monitor fuel temperature - must be between -40°C and +50°C"
          ]
        },
        {
          title: "Fuel Quality Control & Documentation",
          image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Take fuel sample from each fuel truck before connecting",
            "Test fuel for water contamination using water detection paste",
            "Verify fuel type matches aircraft requirements (Jet A, Jet A-1)",
            "Check fuel color and clarity - should be clear to straw colored",
            "Record fuel batch numbers and quality test results",
            "Document exact fuel quantity added and final fuel load",
            "Obtain pilot signature on fuel slip confirming quantity",
            "Report any fuel quality issues immediately to operations"
          ]
        }
      ]
    },
    pushback: {
      title: "Pushback and Towing Operations",
      sections: [
        {
          title: "Equipment Selection by Aircraft Type",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Light aircraft (up to 50,000 lbs): Standard tow bar pushback tractor",
            "Medium aircraft (50,000-200,000 lbs): Heavy duty tow bar or towbarless tractor",
            "Heavy aircraft (200,000+ lbs): Towbarless pushback tractor required",
            "Verify tractor capacity exceeds aircraft weight by minimum 25%",
            "Check tow bar compatibility with aircraft nose gear type",
            "For towbarless: Verify cradle fits aircraft tire size and gear configuration",
            "Inspect all hydraulic systems and emergency release mechanisms",
            "Test radio communication equipment before operation"
          ]
        },
        {
          title: "Pre-Pushback Safety Checklist",
          image: "https://images.unsplash.com/photo-1585956048631-7a1d3b07cdb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Obtain ATC pushback clearance and confirm pushback direction",
            "Verify aircraft parking brake is SET and engines are shut down",
            "Check area clear of ground equipment, personnel, and other aircraft",
            "Position wing walkers at wingtips if required by airport procedures",
            "Establish positive radio contact with flight crew on intercom",
            "Verify ground power is connected if engines not running",
            "Check weather conditions - wind limits and visibility minimums",
            "Ensure emergency stops and disconnect procedures are understood"
          ]
        },
        {
          title: "Pushback Execution Procedures",
          image: "https://images.unsplash.com/photo-1544705503-49a2a6f9ae0e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Begin pushback slowly - maximum 5 mph initial movement",
            "Announce 'Pushback commencing' to flight crew",
            "Monitor nose wheel steering - pilot maintains directional control",
            "Call out obstacles, other aircraft, or hazards immediately",
            "For straight pushback: maintain constant slow speed throughout",
            "For turn during pushback: announce direction and pause before turning",
            "Stop smoothly when reaching designated position or ATC instruction",
            "Announce 'Pushback complete, set parking brake' to flight crew"
          ]
        },
        {
          title: "Post-Pushback Disconnect Procedures",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Verify aircraft parking brake is set before disconnecting",
            "Announce 'Disconnecting tow bar, remain on brakes' to flight crew",
            "For tow bar: Remove safety pins, disconnect from nose gear",
            "For towbarless: Lower aircraft, retract cradle arms slowly",
            "Perform final visual inspection of nose gear area for damage",
            "Remove any ground equipment from aircraft path",
            "Signal 'All clear' to flight crew when area is clear",
            "Monitor aircraft taxi until clear of gate area"
          ]
        }
      ]
    },
    baggage: {
      title: "Baggage and Cargo Operations",
      sections: [
        {
          title: "Weight and Balance Calculations",
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop&crop=center",
          steps: [
            "Verify total baggage weight does not exceed aircraft cargo limits",
            "Calculate center of gravity based on baggage compartment loading",
            "Front compartment (forward of wing): affects nose-down moment",
            "Aft compartment (behind wing): affects nose-up moment",
            "Distribute heavy items evenly between compartments",
            "Consider passenger loading - heavy baggage in rear if passengers in front",
            "Maximum baggage per compartment: varies by aircraft type",
            "Document final weight distribution on load sheet"
          ]
        },
        {
          title: "Baggage Compartment Configuration",
          image: "https://images.unsplash.com/photo-1585956048631-7a1d3b07cdb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Load heavy items first - place against compartment walls",
            "Use cargo nets and tie-down straps to secure all items",
            "Pack items tightly to prevent shifting during flight",
            "Separate fragile items and mark clearly",
            "Load connecting flight baggage in accessible areas",
            "Place priority/first-class baggage for easy identification",
            "Ensure emergency equipment access is not blocked",
            "Check compartment door seals and locking mechanisms"
          ]
        },
        {
          title: "Special Cargo Handling Procedures",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Live animals: Load last, unload first, maintain temperature control",
            "Hazardous materials: Follow IATA dangerous goods regulations",
            "Medical supplies: Maintain cold chain for temperature-sensitive items",
            "Valuable cargo: Security escort required, locked compartments",
            "Oversized items: May require special loading equipment",
            "Diplomatic pouches: Chain of custody documentation required",
            "Human remains: Specific handling protocols and documentation",
            "Sports equipment: Secure properly to prevent damage"
          ]
        }
      ]
    },
    catering: {
      title: "Catering and Cabin Services",
      sections: [
        {
          title: "Catering Truck Positioning and Setup",
          image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Position catering truck at designated catering door (typically forward left)",
            "Extend truck platform to match aircraft door sill height exactly",
            "Test platform stability and weight capacity before loading",
            "Establish communication with cabin crew before opening doors",
            "Check catering door operation - verify hydraulic pressure if applicable",
            "Position bridge between truck and aircraft doorway",
            "Set up safety barriers around elevated work area",
            "Verify electrical power for refrigeration units during service"
          ]
        },
        {
          title: "Service Flow by Aircraft Configuration",
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop&crop=center",
          steps: [
            "Single-aisle aircraft: Service through forward galley door only",
            "Wide-body aircraft: Multiple service doors - coordinate timing",
            "Remove used catering equipment first - trolleys, ovens, coffee makers",
            "Clean galley areas and dispose of waste properly",
            "Load fresh catering supplies by class of service (First, Business, Economy)",
            "Verify meal counts match passenger manifest numbers",
            "Check special meals are properly labeled and positioned",
            "Reload galley equipment and test operation before departure"
          ]
        },
        {
          title: "Water and Waste Service Procedures",
          image: "https://images.unsplash.com/photo-1585956048631-7a1d3b07cdb9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Locate potable water service panel (typically right side of aircraft)",
            "Connect waste service truck to lavatory waste drain valve first",
            "Pump out all waste tanks completely - verify tank empty indicators",
            "Flush waste system with fresh water and biocide solution",
            "Connect potable water truck to aircraft water fill connection",
            "Fill water tanks slowly to prevent air locks in system",
            "Test water system pressure and verify proper flow to lavatories",
            "Check water tank quantity indicators show proper fill levels"
          ]
        },
        {
          title: "Cabin Cleaning and Preparation",
          image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=300",
          steps: [
            "Remove all trash and debris from seat pockets and floor areas",
            "Vacuum all carpeted areas including aisles and seat rows",
            "Clean and disinfect tray tables, armrests, and seat surfaces",
            "Replace headrest covers and seat pocket materials as required",
            "Clean and stock lavatories with supplies (soap, towels, tissue)",
            "Check emergency equipment placement and expiration dates",
            "Verify cabin lighting, air conditioning, and entertainment systems",
            "Final inspection with cabin crew before passenger boarding"
          ]
        }
      ]
    }
  };




  // Comprehensive aircraft database with detailed specifications
  const aircraftDatabase = {
    "A-10 Warthog": { wingspan: 17.5, length: 16.3, category: "military", doors: 1, maxSeats: 2, weightClass: "medium" },
    "A6M Zero": { wingspan: 12.0, length: 9.1, category: "military", doors: 1, maxSeats: 1, weightClass: "light" },
    "Airbus A220": { wingspan: 35.1, length: 35.0, category: "narrow-body", doors: 3, maxSeats: 130, weightClass: "medium" },
    "Airbus A320": { wingspan: 35.8, length: 37.6, category: "narrow-body", doors: 4, maxSeats: 180, weightClass: "medium" },
    "Airbus A330": { wingspan: 60.3, length: 58.8, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "Airbus A340": { wingspan: 63.5, length: 63.7, category: "wide-body", doors: 6, maxSeats: 380, weightClass: "heavy" },
    "Airbus A350": { wingspan: 64.8, length: 66.8, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "Airbus A380": { wingspan: 79.8, length: 72.7, category: "super-heavy", doors: 8, maxSeats: 850, weightClass: "super" },
    "Airbus Beluga": { wingspan: 44.8, length: 56.2, category: "cargo", doors: 2, maxSeats: 0, weightClass: "heavy" },
    "Airbus H135": { wingspan: 10.2, length: 12.1, category: "helicopter", doors: 2, maxSeats: 7, weightClass: "light" },
    "Antonov An-22": { wingspan: 64.4, length: 57.9, category: "cargo", doors: 2, maxSeats: 0, weightClass: "super" },
    "Antonov AN-225": { wingspan: 88.4, length: 84.0, category: "cargo", doors: 2, maxSeats: 0, weightClass: "super" },
    "ATR-72": { wingspan: 27.1, length: 27.2, category: "turboprop", doors: 2, maxSeats: 78, weightClass: "light" },
    "Avro Vulcan": { wingspan: 30.3, length: 30.5, category: "military", doors: 1, maxSeats: 5, weightClass: "heavy" },
    "B-1 Lancer": { wingspan: 41.8, length: 44.8, category: "military", doors: 1, maxSeats: 4, weightClass: "heavy" },
    "B-2 Spirit": { wingspan: 52.4, length: 21.0, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "B29": { wingspan: 43.1, length: 30.2, category: "military", doors: 2, maxSeats: 11, weightClass: "heavy" },
    "Beechcraft King Air 260": { wingspan: 17.6, length: 14.2, category: "turboprop", doors: 2, maxSeats: 11, weightClass: "light" },
    "Bell 412": { wingspan: 14.0, length: 17.1, category: "helicopter", doors: 2, maxSeats: 13, weightClass: "medium" },
    "Blimp": { wingspan: 15.0, length: 50.0, category: "special", doors: 1, maxSeats: 12, weightClass: "light" },
    "Boeing 707": { wingspan: 44.4, length: 46.6, category: "narrow-body", doors: 4, maxSeats: 189, weightClass: "heavy" },
    "Boeing 727": { wingspan: 32.9, length: 46.7, category: "narrow-body", doors: 4, maxSeats: 189, weightClass: "medium" },
    "Boeing 737": { wingspan: 35.8, length: 39.5, category: "narrow-body", doors: 4, maxSeats: 189, weightClass: "medium" },
    "Boeing 747": { wingspan: 68.4, length: 76.3, category: "wide-body", doors: 6, maxSeats: 605, weightClass: "super" },
    "Boeing 757": { wingspan: 38.1, length: 47.3, category: "narrow-body", doors: 4, maxSeats: 239, weightClass: "heavy" },
    "Boeing 767": { wingspan: 47.6, length: 48.5, category: "wide-body", doors: 4, maxSeats: 290, weightClass: "heavy" },
    "Boeing 777": { wingspan: 64.8, length: 73.9, category: "wide-body", doors: 6, maxSeats: 550, weightClass: "heavy" },
    "Boeing 787": { wingspan: 60.1, length: 62.8, category: "wide-body", doors: 6, maxSeats: 420, weightClass: "heavy" },
    "Boeing C-17 Globemaster III": { wingspan: 52.0, length: 53.0, category: "military-cargo", doors: 2, maxSeats: 0, weightClass: "super" },
    "Boeing Dreamlifter": { wingspan: 64.4, length: 71.7, category: "cargo", doors: 2, maxSeats: 0, weightClass: "super" },
    "Bombardier CRJ700": { wingspan: 23.2, length: 32.3, category: "regional", doors: 2, maxSeats: 78, weightClass: "medium" },
    "Bombardier Learjet": { wingspan: 13.4, length: 17.9, category: "business", doors: 1, maxSeats: 9, weightClass: "light" },
    "Bombardier Q400": { wingspan: 28.4, length: 32.8, category: "turboprop", doors: 2, maxSeats: 78, weightClass: "medium" },
    "C-130 Hercules": { wingspan: 40.4, length: 29.8, category: "military-cargo", doors: 2, maxSeats: 0, weightClass: "heavy" },
    "Caproni Stipa": { wingspan: 14.3, length: 10.7, category: "experimental", doors: 1, maxSeats: 2, weightClass: "light" },
    "Cessna 172": { wingspan: 11.0, length: 8.3, category: "general-aviation", doors: 2, maxSeats: 4, weightClass: "light" },
    "Cessna 182": { wingspan: 11.0, length: 8.8, category: "general-aviation", doors: 2, maxSeats: 4, weightClass: "light" },
    "Cessna 402": { wingspan: 13.5, length: 11.1, category: "general-aviation", doors: 2, maxSeats: 9, weightClass: "light" },
    "Cessna Caravan": { wingspan: 15.9, length: 12.7, category: "turboprop", doors: 2, maxSeats: 14, weightClass: "light" },
    "Chinook": { wingspan: 18.3, length: 30.1, category: "helicopter", doors: 2, maxSeats: 55, weightClass: "heavy" },
    "Cirrus Vision SF50": { wingspan: 11.7, length: 9.5, category: "business", doors: 1, maxSeats: 7, weightClass: "light" },
    "Concorde": { wingspan: 25.6, length: 61.7, category: "supersonic", doors: 4, maxSeats: 128, weightClass: "heavy" },
    "Derek's Creation": { wingspan: 20.0, length: 25.0, category: "experimental", doors: 1, maxSeats: 2, weightClass: "medium" },
    "DHC-6 Twin Otter": { wingspan: 19.8, length: 15.8, category: "turboprop", doors: 2, maxSeats: 19, weightClass: "light" },
    "Diamond DA50": { wingspan: 12.2, length: 9.0, category: "general-aviation", doors: 2, maxSeats: 5, weightClass: "light" },
    "Embraer E190": { wingspan: 28.7, length: 36.2, category: "regional", doors: 2, maxSeats: 114, weightClass: "medium" },
    "English Electric Lightning": { wingspan: 10.6, length: 16.8, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Eurofighter Typhoon": { wingspan: 10.9, length: 15.9, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Extra 300s": { wingspan: 7.4, length: 7.1, category: "aerobatic", doors: 1, maxSeats: 2, weightClass: "light" },
    "F-14 Tomcat": { wingspan: 19.5, length: 19.1, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "F-15E Strike Eagle": { wingspan: 13.1, length: 19.4, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "F-16 Fighting Falcon": { wingspan: 9.8, length: 15.1, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "F-22 Raptor": { wingspan: 13.6, length: 18.9, category: "military", doors: 1, maxSeats: 1, weightClass: "heavy" },
    "F-35B": { wingspan: 10.7, length: 15.6, category: "military", doors: 1, maxSeats: 1, weightClass: "heavy" },
    "F-4 Phantom": { wingspan: 11.8, length: 19.2, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "F/A-18 Super Hornet": { wingspan: 13.6, length: 18.3, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "F4U Corsair": { wingspan: 12.5, length: 10.3, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Fokker Dr1": { wingspan: 7.2, length: 5.8, category: "military", doors: 1, maxSeats: 1, weightClass: "light" },
    "Hawk T1": { wingspan: 9.4, length: 11.2, category: "military", doors: 1, maxSeats: 2, weightClass: "light" },
    "Hawker Harrier": { wingspan: 9.3, length: 14.1, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Hawker Hurricane": { wingspan: 12.2, length: 9.8, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Hot Air Balloon": { wingspan: 20.0, length: 15.0, category: "special", doors: 1, maxSeats: 4, weightClass: "light" },
    "Lockheed L-1011 Tristar": { wingspan: 47.3, length: 54.2, category: "wide-body", doors: 6, maxSeats: 400, weightClass: "heavy" },
    "McDonnell Douglas MD-11": { wingspan: 51.7, length: 61.6, category: "wide-body", doors: 6, maxSeats: 410, weightClass: "heavy" },
    "McDonnell Douglas MD-90": { wingspan: 32.9, length: 46.5, category: "narrow-body", doors: 4, maxSeats: 172, weightClass: "medium" },
    "Mig-15": { wingspan: 10.1, length: 11.1, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Military UFO": { wingspan: 15.0, length: 12.0, category: "special", doors: 1, maxSeats: 3, weightClass: "light" },
    "P-38 Lightning": { wingspan: 15.9, length: 11.5, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "P-51 Mustang": { wingspan: 11.3, length: 9.8, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Paratrike": { wingspan: 12.0, length: 6.0, category: "ultralight", doors: 0, maxSeats: 2, weightClass: "light" },
    "Piper Cub": { wingspan: 10.7, length: 6.8, category: "general-aviation", doors: 2, maxSeats: 2, weightClass: "light" },
    "Piper PA-28": { wingspan: 10.8, length: 7.3, category: "general-aviation", doors: 2, maxSeats: 4, weightClass: "light" },
    "Saab JAS 39 Gripen": { wingspan: 8.4, length: 14.1, category: "military", doors: 1, maxSeats: 1, weightClass: "medium" },
    "Santa's Sled": { wingspan: 8.0, length: 12.0, category: "special", doors: 0, maxSeats: 9, weightClass: "light" },
    "Sikorsky S-92": { wingspan: 17.2, length: 20.9, category: "helicopter", doors: 2, maxSeats: 19, weightClass: "heavy" },
    "SR-71 Blackbird": { wingspan: 16.9, length: 32.7, category: "military", doors: 1, maxSeats: 2, weightClass: "heavy" },
    "Sukhoi Su-27": { wingspan: 14.7, length: 21.9, category: "military", doors: 1, maxSeats: 1, weightClass: "heavy" },
    "Sukhoi Su-57": { wingspan: 14.0, length: 19.8, category: "military", doors: 1, maxSeats: 1, weightClass: "heavy" },
    "UH-60 Black Hawk": { wingspan: 16.4, length: 19.8, category: "helicopter", doors: 2, maxSeats: 11, weightClass: "heavy" },
    "Walrus": { wingspan: 14.0, length: 11.5, category: "seaplane", doors: 2, maxSeats: 6, weightClass: "medium" },
    "Wright Brothers Plane": { wingspan: 12.3, length: 6.4, category: "historical", doors: 0, maxSeats: 1, weightClass: "light" }
  };

  const standCompatibilityMatrix = {
    "narrow": {
      maxWingspan: 36,
      maxLength: 50,
      categories: ["regional", "turboprop", "narrow-body", "general-aviation"],
      maxWeightClass: ["light", "medium"]
    },
    "medium": {
      maxWingspan: 52,
      maxLength: 70,
      categories: ["regional", "turboprop", "narrow-body", "business"],
      maxWeightClass: ["light", "medium", "heavy"]
    },
    "wide": {
      maxWingspan: 80,
      maxLength: 80,
      categories: ["regional", "turboprop", "narrow-body", "wide-body", "super-heavy", "military"],
      maxWeightClass: ["light", "medium", "heavy", "super"]
    },
    "cargo": {
      maxWingspan: 100,
      maxLength: 90,
      categories: ["cargo", "military-cargo", "wide-body", "super-heavy", "turboprop", "narrow-body"],
      maxWeightClass: ["light", "medium", "heavy", "super"]
    }
  };

  const isStandCompatible = (standType, aircraftType) => {
    const aircraft = aircraftDatabase[aircraftType];
    const standLimits = standCompatibilityMatrix[standType];

    if (!aircraft || !standLimits) return false;

    // Check wingspan constraint
    if (aircraft.wingspan > standLimits.maxWingspan) return false;

    // Check length constraint
    if (aircraft.length > standLimits.maxLength) return false;

    // Check category compatibility
    if (!standLimits.categories.includes(aircraft.category)) return false;

    // Check weight class compatibility
    if (!standLimits.maxWeightClass.includes(aircraft.weightClass)) return false;

    return true;
  };

  const assignPilotCallsign = () => {
    // Use the flight number entered by the pilot
    if (flightNumber) {
      const newCallsign = flightNumber;
      setAssignedCallsign(newCallsign);
      return newCallsign;
    }
    return "";
  };

  const assignGroundCallsign = () => {
    // Ensure the callsign is unique and stable for ground crew
    const newCallsign = `Ground ${groundCallsignCounter}`;
    // No state update here, as the socket event will handle it
    socket.emit("requestGroundCallsign", { userId: user?.id, airport: selectedAirport });
    return newCallsign; // Return a temporary callsign until confirmed
  };

  // Function to assign crew to a task
  const assignCrewToTask = (requestIndex, assignedCrewCallsign) => {
    if (requestIndex === -1) return;
    socket.emit("assignCrewToTask", {
      requestIndex: requestIndex,
      assignedCrewCallsign: assignedCrewCallsign,
      airport: selectedAirport
    });
  };

  const generatePassengerManifest = (aircraftType) => {
    const aircraftInfo = aircraftDatabase[aircraftType];
    if (!aircraftInfo) return [];

    const maxSeats = aircraftInfo.maxSeats;
    // Use 85-95% of max capacity for realistic loading
    const passengerCount = Math.floor(maxSeats * (0.85 + Math.random() * 0.10));
    const manifest = [];

    const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "Robert", "Anna", "James", "Maria", "Carlos", "Sofia", "Ahmed", "Yuki", "Pierre", "Ingrid"];
    const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Miller", "Moore", "Taylor", "Anderson", "Thomas", "Garcia", "Rodriguez", "Chen", "Patel", "Mueller", "Schmidt"];

    // Determine seat configuration based on aircraft type
    let seatConfig = { abreast: 6, letters: "ABCDEF" }; // Default narrow body
    if (aircraftInfo.category === "wide-body") {
      seatConfig = { abreast: 9, letters: "ABCDEFGHJ" }; // Wide body 3-3-3 or 2-4-2
    } else if (aircraftInfo.category === "regional") {
      seatConfig = { abreast: 4, letters: "ABCD" }; // Regional 2-2
    } else if (aircraftInfo.category === "super-heavy") {
      seatConfig = { abreast: 10, letters: "ABCDEFGHJK" }; // A380 configuration
    }

    // Determine class mix based on aircraft type
    let seatClasses = ["Economy"];
    if (aircraftInfo.category === "wide-body" || aircraftInfo.category === "super-heavy") {
      seatClasses = ["Economy", "Premium Economy", "Business", "First"];
    } else if (aircraftInfo.maxSeats > 150) {
      seatClasses = ["Economy", "Premium Economy", "Business"];
    }

    const maxRows = Math.ceil(maxSeats / seatConfig.abreast);

    for (let i = 0; i < passengerCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const seatRow = Math.floor(Math.random() * maxRows) + 1;
      const seatLetter = seatConfig.letters[Math.floor(Math.random() * seatConfig.abreast)];

      // Determine special requests based on aircraft type and realism
      let specialRequests = null;
      const isMilitary = aircraftType.includes("A-10") || aircraftType.includes("F-") || aircraftType.includes("B-1") || aircraftType.includes("B-2") || aircraftType.includes("Spirit") || aircraftType.includes("Black Hawk") || aircraftType.includes("Military");

      if (!isMilitary && Math.random() > 0.85) {
        const possibleRequests = ["Extra Legroom", "Dietary", "Frequent Flyer Priority"];
        // Only add wheelchair or unaccompanied minor for appropriate aircraft types
        if (aircraftInfo.maxSeats > 50 && !aircraftType.includes("Spirit") && !aircraftType.includes("military")) {
          possibleRequests.push("Wheelchair", "Bassinet");
          if (aircraftInfo.maxSeats > 100) {
            possibleRequests.push("Unaccompanied Minor");
          }
        }
        specialRequests = possibleRequests[Math.floor(Math.random() * possibleRequests.length)];
      }

      manifest.push({
        id: i + 1,
        name: `${firstName} ${lastName}`,
        seat: `${seatRow}${seatLetter}`,
        class: seatClasses[Math.floor(Math.random() * seatClasses.length)],
        checkedIn: Math.random() > 0.1,
        specialRequests: specialRequests,
        frequent: Math.random() > 0.7
      });
    }

    return manifest;
  };

  const generateCargoManifest = () => {
    const cargoTypes = ["Electronics", "Automotive Parts", "Textiles", "Pharmaceuticals", "Food Products", "Machinery", "Documents", "Perishables", "Medical Supplies", "Aircraft Parts", "Consumer Goods", "Industrial Equipment"];
    const companies = ["FedEx", "DHL", "UPS", "Amazon", "Maersk", "COSCO", "MSC", "CMA CGM", "TNT", "DB Schenker", "Kuehne + Nagel", "Expeditors"];
    const destinations = ["New York", "Los Angeles", "Chicago", "Miami", "London", "Paris", "Tokyo", "Seoul", "Dubai", "Singapore", "Frankfurt", "Amsterdam"];
    const cargoCount = Math.floor(Math.random() * 15) + 5; // 5-20 cargo items
    const manifest = [];

    for (let i = 0; i < cargoCount; i++) {
      const cargoType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const weight = Math.floor(Math.random() * 2000) + 100; // 100-2100 kg
      const pieces = Math.floor(Math.random() * 10) + 1; // 1-10 pieces
      const volume = Math.floor(weight * 0.6) + Math.floor(Math.random() * 200); // More realistic volume

      manifest.push({
        id: i + 1,
        awbNumber: `${Math.floor(Math.random() * 900000) + 100000}`,
        description: cargoType,
        shipper: company,
        destination: destination,
        pieces: pieces,
        weight: weight,
        volume: volume,
        priority: Math.random() > 0.8 ? "High" : Math.random() > 0.5 ? "Medium" : "Standard",
        hazmat: Math.random() > 0.9,
        temperature: cargoType === "Perishables" || cargoType === "Medical Supplies" ? "Refrigerated" : "Ambient",
        flightNumber: flightNumber || "CARGO001",
        status: Math.random() > 0.9 ? "Priority" : "Normal"
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

      // Use internal aircraft database
      const baseAircraftData = aircraftDatabase[aircraft];
      if (baseAircraftData) {
        const enrichedData = {
          type: aircraft,
          manufacturer: aircraft.startsWith('A') ? 'Airbus' : aircraft.startsWith('B') ? 'Boeing' : aircraft.startsWith('E') ? 'Embraer' : aircraft.startsWith('CRJ') ? 'Bombardier' : aircraft.startsWith('DHC') ? 'De Havilland' : aircraft.startsWith('ATR') ? 'ATR' : 'McDonnell Douglas',
          maxSeats: baseAircraftData.maxSeats,
          wingspan: baseAircraftData.wingspan,
          length: baseAircraftData.length,
          category: baseAircraftData.category,
          doors: baseAircraftData.doors,
          weightClass: baseAircraftData.weightClass,
          range: aircraft.includes('A380') ? 15200 : aircraft.includes('777') ? 14685 : aircraft.includes('A350') ? 15000 : aircraft.includes('747') ? 14815 : aircraft.includes('787') ? 15750 : 6500,
          maxSpeed: aircraft.includes('A380') ? 560 : aircraft.includes('747') ? 570 : 560,
          engines: (aircraft.includes('A380') || aircraft.includes('747')) ? 4 : aircraft.includes('MD') ? 2 : aircraft.includes('A340') ? 4 : 2,
          fuelCapacity: aircraft.includes('A380') ? 84535 : aircraft.includes('747') ? 74000 : aircraft.includes('777') ? 47890 : aircraft.includes('A350') ? 44150 : 26020,
          engineType: aircraft.includes('DHC') || aircraft.includes('ATR') ? "Turboprop" : "Turbofan",
          firstFlight: aircraft.includes('A380') ? "2005" : aircraft.includes('787') ? "2009" : aircraft.includes('A350') ? "2013" : "N/A",
          maxTakeoffWeight: aircraft.includes('A380') ? 575000 : aircraft.includes('747') ? 412775 : aircraft.includes('777') ? 351534 : 75000,
          maxLandingWeight: aircraft.includes('A380') ? 394625 : aircraft.includes('747') ? 295742 : aircraft.includes('777') ? 251290 : 68000,
          operatingEmptyWeight: Math.round(baseAircraftData.maxSeats * 500), // Rough estimate
          maxZeroFuelWeight: Math.round(baseAircraftData.maxSeats * 600), // Rough estimate
          cargoCapacity: baseAircraftData.category === "wide-body" ? 15.5 : baseAircraftData.category === "super-heavy" ? 20.8 : 8.2,
          climbRate: 3000,
          height: aircraft.includes('A380') ? 24.1 : aircraft.includes('747') ? 19.4 : 12.5,
          serviceCeiling: 41000,
          cruiseSpeed: aircraft.includes('DHC') || aircraft.includes('ATR') ? 280 : 470,
          variants: aircraft.includes('737') ? ["-700", "-800", "-900"] : aircraft.includes('A320') ? ["-200", "-200neo"] : ["-100", "-200"]
        };
        setAircraftData(enrichedData);

        // Generate appropriate manifest based on stand type
        const currentStandData = getCurrentAirportStands().find(s => s.id === selectedStand);
        const isCargoStand = currentStandData?.type === "cargo" || baseAircraftData.category === "cargo" || baseAircraftData.category === "military-cargo";
        const manifest = isCargoStand ? generateCargoManifest() : generatePassengerManifest(aircraft);
        setPassengerManifest(manifest);
      } else {
        setAircraftData(null);
        setPassengerManifest([]);
      }
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

  // Partnership carousel auto-advance
  useEffect(() => {
    const carouselTimer = setInterval(() => {
      setCurrentPartnerIndex((prevIndex) =>
        (prevIndex + 1) % partnerships.length
      );
    }, 5000); // Change every 5 seconds

    return () => clearInterval(carouselTimer);
  }, [partnerships.length]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    const messagesArea = document.querySelector('.messages-area');
    if (messagesArea) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        console.log('Fetching user data...');
        const res = await fetch('/api/user');
        if (res.ok && isMounted) {
          const userData = await res.json();
          console.log('User data received:', userData.username);
          setUser(userData);
        } else if (isMounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch user once when component mounts
    if (loading) {
      fetchUser();
    }

    const loadChangelogData = async () => {
      try {
        const response = await fetch('/src/changelog.json');
        const data = await response.json();
        setChangelogData(data);
      } catch (error) {
        console.error('Failed to load changelog:', error);
      }
    };

    loadChangelogData();


    socket.on("chatUpdate", (msg) => {
      if (!selectedAirport || msg.airport === selectedAirport || (!msg.airport && msg.mode === 'system')) {
        // Filter bad words in incoming messages
        const filteredMsg = {
          ...msg,
          text: filterBadWords(msg.text)
        };
        setMessages((prev) => [...prev, filteredMsg]);

        // Play sound only for specific message types and not for own messages
        const shouldPlaySound = soundEnabled && msg.sender !== user?.username && (
          msg.mode === 'system' || // System messages
          (msg.mode === 'groundcrew' && userMode === 'pilot') || // Ground crew to pilot
          (msg.mode === 'pilot' && userMode === 'groundcrew') // Pilot to ground crew
        );

        if (shouldPlaySound) {
          try {
            // Create different sounds for different message types
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different tones for different message types
            if (msg.mode === 'system') {
              // System message - alert tone
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
              oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
            } else if (msg.mode === 'groundcrew') {
              // Ground crew message - lower frequency
              oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.15);
            } else if (msg.mode === 'pilot') {
              // Pilot message - higher frequency
              oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
              oscillator.frequency.setValueAtTime(750, audioContext.currentTime + 0.15);
            }

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
          } catch (e) {
            console.log('Audio creation failed:', e);
          }
        }
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

    // Add socket listeners for callsign events
    socket.on("callsignAssigned", (data) => {
      setGroundCrewCallsign(data.callsign);
    });

    socket.on("callsignUpdate", (data) => {
      setGroundCrewCallsign(data.newCallsign);
      addChatMessage({
        text: `Your callsign has been updated to ${data.newCallsign}`,
        sender: "SYSTEM",
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
      alert(error.message || "An error occurred");
    });

    socket.on("userCountUpdate", (counts) => {
      setAirportUserCounts(counts);
    });

    return () => {
      isMounted = false;
      socket.off("standUpdate");
      socket.off("chatUpdate");
      socket.off("serviceUpdate");
      socket.off("atisUpdate");
      socket.off("callsignAssigned");
      socket.off("callsignUpdate");
      socket.off("error");
      socket.off("userCountUpdate");
    };
  }, [loading]); // Only depend on loading state

  const handleLogin = () => {
    window.location.href = "/auth/discord";
  };

  const selectMode = (mode, airport) => {
    console.log('Selecting mode:', mode, 'for airport:', airport);
    setUserMode(mode);
    setSelectedAirport(airport);

    // Reset callsign when switching modes
    setAssignedCallsign("");
    setGroundCallsignCounter(1);
    setGroundCrewCallsign(""); // Reset ground crew callsign as well

    socket.emit("userMode", { mode, airport, userId: user?.id });
  };

  const validateFlightNumber = (flightNum) => {
    // ICAO format: 3-letter airline code + flight number (e.g., AAL123, UAL456)
    const icaoRegex = /^[A-Z]{3}[0-9]{1,4}[A-Z]?$/;
    return icaoRegex.test(flightNum.toUpperCase());
  };

  const claimStand = () => {
    if (selectedStand && flightNumber && aircraft && selectedAirport) {
      if (!validateFlightNumber(flightNumber)) {
        alert("Please enter a valid ICAO flight number (e.g., AAL123, UAL456, BAW100)");
        return;
      }

      // Use flight number as callsign for pilots
      const callsign = flightNumber.toUpperCase();
      setAssignedCallsign(callsign);

      socket.emit("claimStand", {
        stand: selectedStand,
        flightNumber: callsign,
        aircraft,
        pilot: user?.username,
        userId: user?.id,
        airport: selectedAirport,
        allowSwitch: true,
        callsign: callsign
      });
    }
  };

  const getZuluTime = () => {
    const now = new Date();
    return now.toISOString().substring(11, 19) + "Z";
  };

  const sendMessage = () => {
    if (input.trim() === "") return;

    if (userMode === "pilot") {
      if (!selectedStand) {
        alert("Please select a stand first to send messages");
        return;
      }

      // Check if stand is actually claimed by this user
      const standData = stands[selectedStand];
      if (!standData || standData.userId !== user?.id) {
        alert("You must claim this stand before sending messages");
        return;
      }
    }

    // Check for bad words
    if (containsBadWords(input)) {
      alert("Message contains inappropriate language and cannot be sent.");
      return;
    }

    let senderName = user?.username;
    let callsign = assignedCallsign;

    if (userMode === "pilot") {
      if (!assignedCallsign && flightNumber) {
        callsign = flightNumber.toUpperCase();
        setAssignedCallsign(callsign);
      }
      senderName = `${callsign || user?.username} (${user?.username})`;
    } else if (userMode === "groundcrew") {
      if (!assignedCallsign && groundCrewCallsign) { // Use groundCrewCallsign if available
        callsign = groundCrewCallsign;
        setAssignedCallsign(callsign); // Keep assignedCallsign consistent for pilot messages
      } else if (!assignedCallsign && !groundCrewCallsign) {
        // If no ground crew callsign is assigned yet, try to get one
        callsign = assignGroundCallsign(); // This will emit the request
        setAssignedCallsign(callsign); // Tentatively set for display
      }
      senderName = `${callsign} (${user?.username})`;
    }

    const message = {
      text: input,
      sender: senderName,
      stand: userMode === "pilot" ? selectedStand : "GROUND",
      airport: selectedAirport,
      timestamp: getZuluTime(),
      mode: userMode,
      userId: user?.id,
      callsign: callsign
    };
    socket.emit("chatMessage", message);
    setInput("");
  };

  const requestService = (service) => {
    if (!selectedStand) {
      alert("Please select and claim a stand first to request services");
      return;
    }

    // Check if stand is actually claimed by this user
    const standData = stands[selectedStand];
    if (!standData || standData.userId !== user?.id) {
      alert("You must claim this stand before requesting services");
      return;
    }

    // Show pushback form for pushback service
    if (service === "Pushback") {
      setShowPushbackForm(true);
      return;
    }

    // Rate limiting - prevent spam (except for Full Service)
    if (service !== "Full Service") {
      const now = Date.now();
      const lastRequestTime = lastServiceRequest[service] || 0;
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < 3000) { // 3 second cooldown
        const remainingTime = Math.ceil((3000 - lastRequestTime) / 1000);
        alert(`Please wait ${remainingTime} seconds before requesting ${service} again`);
        return;
      }
      setLastServiceRequest(prev => ({
        ...prev,
        [service]: now
      }));
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

  const submitPushbackRequest = () => {
    if (!pushbackFormData.tugSize || pushbackFormData.clearedByGround === null) {
      alert("Please fill out all required fields");
      return;
    }

    if (pushbackFormData.clearedByGround && !pushbackFormData.tailDirection) {
      alert("Please specify the tail direction cleared by ground");
      return;
    }

    socket.emit("serviceRequest", {
      service: "Pushback",
      stand: selectedStand,
      flight: flightNumber,
      pilot: user?.username,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      status: "REQUESTED",
      pushbackSettings: {
        tugSize: pushbackFormData.tugSize,
        clearedByGround: pushbackFormData.clearedByGround,
        tailDirection: pushbackFormData.clearedByGround ? pushbackFormData.tailDirection : 'N/A'
      }
    });

    // Reset form
    setPushbackFormData({
      tugSize: '',
      clearedByGround: false,
      tailDirection: ''
    });
    setShowPushbackForm(false);
  };

  const handleServiceAction = (requestId, action) => {
    socket.emit("serviceAction", { requestId, action, crewMember: user?.username, airport: selectedAirport });
  };

  const generatePermitId = (permitType) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${permitType.substring(0, 3).toUpperCase()}_${timestamp.toString().slice(-6)}${random}`;
  };

  const submitPermit = (permitType, formData) => {
    if (!flightNumber || !selectedStand) {
      alert("Please ensure flight number and stand are selected before submitting permits");
      return;
    }

    const currentCallsign = assignedCallsign || flightNumber.toUpperCase();
    const permitId = generatePermitId(permitType);

    const newPermit = {
      id: permitId,
      type: permitType,
      data: { ...formData },
      status: "SUBMITTED",
      submittedAt: getZuluTime(),
      submittedDate: new Date().toISOString().substring(0, 10),
      callsign: currentCallsign,
      submittedBy: user?.username,
      airport: selectedAirport,
      stand: selectedStand,
      aircraft: aircraft,
      passengers: passengerManifest.length
    };

    setPermits(prev => {
      const updated = [...prev, newPermit];
      console.log("Updated permits:", updated);
      return updated;
    });

    setActivePermitForm(null);
    setPermitFormData({});

    // Send system message about permit submission
    socket.emit("chatMessage", {
      text: `📋 ${permitType.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} PERMIT submitted by ${currentCallsign} - ID: ${permitId}`,
      sender: "PERMITS OFFICE",
      stand: selectedStand,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });

    // Simulate permit processing
    setTimeout(() => {
      setPermits(prev => prev.map(permit =>
        permit.id === permitId
          ? { ...permit, status: "APPROVED", approvedAt: new Date().toLocaleTimeString() }
          : permit
      ));

      socket.emit("chatMessage", {
        text: `✅ ${permitType.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} PERMIT APPROVED for ${currentCallsign}`,
        sender: "PERMITS OFFICE",
        stand: selectedStand,
        airport: selectedAirport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "system"
      });
    }, 3000 + Math.random() * 5000); // Random approval time 3-8 seconds
  };

  const updatePermitFormData = (field, value) => {
    setPermitFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [weightBalanceData, setWeightBalanceData] = useState(null);

  const calculateWeightAndBalance = () => {
    if (!aircraftData || passengerManifest.length === 0) return null;

    // Use cached data if available and aircraft/passenger count hasn't changed
    if (weightBalanceData &&
        weightBalanceData.aircraftType === aircraft &&
        weightBalanceData.passengerCount === passengerManifest.length) {
      return weightBalanceData.data;
    }

    const passengerWeight = passengerManifest.length * 84; // Average passenger weight in kg (84kg including carry-on)
    const baggageWeight = passengerManifest.length * 23; // Average checked baggage weight

    // Calculate fuel weight to ensure we stay under MTOW
    const maxTakeoffWeight = aircraftData.maxTakeoffWeight || 75000;
    const operatingEmptyWeight = aircraftData.operatingEmptyWeight || Math.round(maxTakeoffWeight * 0.55);

    // Calculate remaining weight capacity
    const remainingCapacity = maxTakeoffWeight - operatingEmptyWeight - passengerWeight;

    // Use a fixed percentage based on aircraft type for consistency
    const fuelPercentage = aircraft.includes('A380') ? 0.75 : aircraft.includes('747') ? 0.72 : aircraft.includes('777') ? 0.78 : aircraft.includes('A350') ? 0.78 : aircraft.includes('A380') ? 0.75 : aircraft.includes('747') ? 0.72 : aircraft.includes('777') ? 0.78 : aircraft.includes('A350') ? 0.78 : 0.78; // Use a more consistent fuel percentage
    const fuelWeight = Math.round(remainingCapacity * fuelPercentage);
    const cargoWeight = Math.round(Math.min(2000, remainingCapacity * 0.08)); // Small cargo load

    const totalWeight = operatingEmptyWeight + passengerWeight + baggageWeight + fuelWeight + cargoWeight;

    // Calculate CG (simplified calculation)
    const emptyWeightArm = aircraftData.length * 0.4; // Approximate empty weight CG position
    const passengerArm = aircraftData.length * 0.45; // Passenger cabin CG
    const cargoArm = aircraftData.length * 0.3; // Cargo compartment CG
    const fuelArm = aircraftData.length * 0.4; // Fuel tank CG

    const totalMoment =
      (operatingEmptyWeight * emptyWeightArm) +
      ((passengerWeight + baggageWeight) * passengerArm) +
      (cargoWeight * cargoArm) +
      (fuelWeight * fuelArm);

    const cgPosition = totalMoment / totalWeight;
    const cgPercentMAC = 27.5; // Fixed safe CG position

    const wbData = {
      passengerWeight,
      baggageWeight,
      fuelWeight,
      cargoWeight,
      totalWeight,
      cgPosition: cgPosition.toFixed(1),
      cgPercentMAC: cgPercentMAC.toFixed(1),
      withinLimits: true
    };

    // Cache the data
    setWeightBalanceData({
      aircraftType: aircraft,
      passengerCount: passengerManifest.length,
      data: wbData
    });

    return wbData;
  };

  const updateFlightDocument = (docType, updates) => {
    setFlightDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], ...updates }
    }));
  };

  const addMaintenanceLog = (issue, severity, equipment) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      issue,
      severity,
      equipment,
      reportedBy: user?.username,
      status: 'Open',
      airport: selectedAirport
    };
    setMaintenanceLog(prev => [newLog, ...prev]);
  };

  const reportIncident = (type, description, location, severity) => {
    const newIncident = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      type,
      description,
      location,
      severity,
      reportedBy: user?.username,
      status: 'Active',
      airport: selectedAirport
    };
    setActiveIncidents(prev => [newIncident, ...prev]);
  };

  const updateEquipmentStatus = (equipment, status, location) => {
    setEquipmentStatus(prev => ({
      ...prev,
      [equipment]: {
        status,
        location,
        lastUpdate: new Date().toLocaleTimeString(),
        updatedBy: user?.username
      }
    }));
  };

  const scheduleCrewMember = (name, shift, tasks, area) => {
    const newSchedule = {
      id: Date.now(),
      name,
      shift,
      tasks,
      area,
      status: 'Scheduled',
      scheduledBy: user?.username,
      date: new Date().toLocaleDateString()
    };
    setGroundCrewSchedule(prev => [newSchedule, ...prev]);
  };

  const assignFlightToStand = (standId, flightNumber, aircraft) => {
    if (!flightNumber || !aircraft) return;

    socket.emit("claimStand", {
      stand: standId,
      flightNumber,
      aircraft,
      pilot: "Ground Assigned",
      userId: `ground_${user?.id}`,
      airport: selectedAirport,
      allowSwitch: true,
      callsign: flightNumber,
      groundAssigned: true
    });

    // Clear the form
    setQuickFlightNumber("");
    setQuickAircraft("");
    setSelectedStandForManagement("");
  };

  const addServiceRequest = (standId, service) => {
    const standOccupant = stands[standId];
    if (!standOccupant) return;

    socket.emit("serviceRequest", {
      service,
      stand: standId,
      flight: standOccupant.flight,
      pilot: "Ground Requested",
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      status: "REQUESTED",
      groundRequested: true
    });
  };

  const removeServiceRequest = (standId, service) => {
    // Find and remove the specific service request
    const requestIndex = requests.findIndex(r =>
      r.stand === standId &&
      r.service === service &&
      r.status === "REQUESTED"
    );

    if (requestIndex !== -1) {
      socket.emit("serviceAction", {
        requestId: requestIndex,
        action: "CANCELLED",
        crewMember: user?.username
      });
    }
  };

  const removeFlightFromStand = (standId) => {
    // Emit an event to remove the flight from the stand
    socket.emit("removeFromStand", { stand: standId, removedBy: user?.username, airport: selectedAirport });
  };

  const toggleChecklistItem = (category, index) => {
    setChecklists(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    }));

    // Send system message when checklist item is completed - only to current user
    const item = checklists[category][index];
    if (!item.checked && selectedStand) {
      socket.emit("chatMessage", {
        text: `✅ ${item.item} - ${category.toUpperCase()} completed`,
        sender: "CHECKLIST",
        stand: selectedStand,
        airport: selectedAirport,
        timestamp: new Date().toLocaleTimeString(),
        mode: "checklist",
        userId: user?.id, // Add user ID to make it user-specific
        privateMessage: true // Mark as private message
      });
    }
  };



  const getAircraftImageUrl = (aircraftType) => {
    // Map aircraft types to real aircraft photos
    const aircraftImageMap = {
      "A-10 Warthog": "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=500&h=300&fit=crop&crop=center",
      "A6M Zero": "https://images.unsplash.com/photo-1583500178711-897000e968d5?w=500&h=300&fit=crop&crop=center",
      "Airbus A220": "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=500&h=300&fit=crop&crop=center",
      "Airbus A320": "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=500&h=300&fit=crop&crop=center",
      "Airbus A330": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&h=300&fit=crop&crop=center",
      "Airbus A340": "https://images.unsplash.com/photo-1525624286412-40990003b8c8?w=500&h=300&fit=crop&crop=center",
      "Airbus A350": "https://images.unsplash.com/photo-1583500178711-897000e968d5?w=500&h=300&fit=crop&crop=center",
      "Airbus A380": "https://images.unsplash.com/photo-1543005513-94ddf0286df2?w=500&h=300&fit=crop&crop=center",
      "Boeing 737": "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?w=500&h=300&fit=crop&crop=center",
      "Boeing 747": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=300&fit=crop&crop=center",
      "Boeing 757": "https://images.unsplash.com/photo-1588073845925-7d5d4827e0fa?w=500&h=300&fit=crop&crop=center",
      "Boeing 767": "https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=500&h=300&fit=crop&crop=center",
      "Boeing 777": "https://images.unsplash.com/photo-1520637736862-4d197d17c7a4?w=500&h=300&fit=crop&crop=center",
      "Boeing 787": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=300&fit=crop&crop=center",
      "Bombardier CRJ700": "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=500&h=300&fit=crop&crop=center",
      "Embraer E190": "https://images.unsplash.com/photo-1585956048631-7a1d3b07cdb9?w=500&h=300&fit=crop&crop=center",
      "ATR-72": "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=500&h=300&fit=crop&crop=center",
      "DHC-6 Twin Otter": "https://images.unsplash.com/photo-1569629698899-7a9a8b5e4e89?w=500&h=300&fit=crop&crop=center",
      "Cessna 172": "https://images.unsplash.com/photo-1583500178711-897000e968d5?w=500&h=300&fit=crop&crop=center",
      "Concorde": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=300&fit=crop&crop=center",
      "F-16 Fighting Falcon": "https://images.unsplash.com/photo-1583053209265-239b283b2d3?w=500&h=300&fit=crop&crop=center",
      "F/A-18 Super Hornet": "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=500&h=300&fit=crop&crop=center",
      "C-130 Hercules": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=300&fit=crop&crop=center"
    };

    return aircraftImageMap[aircraftType] || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&h=300&fit=crop&crop=center";
  };

  const renderAircraftDisplay = () => {
    if (aircraft && aircraftData) {
      return (
        <div className="aircraft-display-simple">
          <div className="aircraft-info-card">
            <div className="aircraft-icon">✈️</div>
            <div className="aircraft-details">
              <div className="aircraft-type">{aircraftData.type}</div>
              <div className="aircraft-manufacturer">{aircraftData.manufacturer}</div>
              <div className="aircraft-category">{aircraftData.category.toUpperCase()}</div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback when no aircraft is selected
    return (
      <div className="aircraft-display-simple">
        <div className="aircraft-placeholder">
          <div className="placeholder-icon">✈️</div>
          <div className="aircraft-label">
            <div className="aircraft-type">SELECT AIRCRAFT</div>
            <div className="aircraft-manufacturer">Choose an aircraft type</div>
            <div className="aircraft-category">AIRCRAFT TYPE</div>
          </div>
        </div>
      </div>
    );
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  if (loading) {
    return (
      <div className="tablet-loading">
        <div className="loading-content">
          <div className="airline-logo-loading">
              <div className="logo-icon">✈️</div>
              <h1>MyPlane</h1>
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
            <div className="brand-icon">🛩️</div>
            <h1>MyPlane</h1>
            <div className="brand-subtitle">Professional Aviation Ground Operations</div>
            <div className="system-version">Version 1.2.0 | Made by @justawacko_</div>
          </div>
          <div className="partnerships-carousel">
            <h3>OUR PARTNERS</h3>
            <div className="carousel-container">
              <div className="carousel-content">
                <img
                  src={partnerships[currentPartnerIndex].image}
                  alt={partnerships[currentPartnerIndex].title}
                  className="partner-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0Ij5QYXJ0bmVyPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                />
                <div className="partner-info">
                  <h4>{partnerships[currentPartnerIndex].title}</h4>
                  <p>{partnerships[currentPartnerIndex].description}</p>
                </div>
              </div>
              <div className="carousel-indicators">
                {partnerships.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${index === currentPartnerIndex ? 'active' : ''}`}
                    onClick={() => setCurrentPartnerIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="auth-section">
            <button className="login-btn" onClick={handleLogin}>
              <i className="fab fa-discord"></i>
              Login with Discord
            </button>
            <button className="changelog-btn" onClick={() => setShowChangelog(true)}>
              <i className="fas fa-clipboard-list"></i>
              View Changelog
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

          <div className="airport-confirmation">
            <h3>AIRPORT CONFIRMED: {selectedAirport}</h3>
            <div className="confirmation-details">
              <span>Stands Available</span>
              <span>Ground Frequency Active</span>
              <span>Systems Operational</span>
            </div>
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

            <div className="airport-search-section">
              <div className="airport-search-bar">
                <input
                  type="text"
                  className="airport-search-input"
                  placeholder="Search airports... (e.g., IRFD, IZOL)"
                  value={airportSearchTerm}
                  onChange={(e) => setAirportSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="airport-grid-modern">
              {ptfsAirports
                .filter(airport =>
                  airport.toLowerCase().includes(airportSearchTerm.toLowerCase())
                )
                .map((airport) => {
                  const counts = airportUserCounts[airport] || { pilots: 0, groundCrew: 0 };
                  return (
                    <button
                      key={airport}
                      className="airport-card"
                      onClick={() => setSelectedAirport(airport)}
                    >
                      <div className="airport-code">{airport}</div>
                      <div className="airport-info">
                        <div className="stands-count">{getAirportConfig(airport).stands.length} Stands</div>
                        <div className="user-counts">
                          <span className="pilot-count">👨‍✈️ {counts.pilots}</span>
                          <span className="gc-count">👷‍♂️ {counts.groundCrew}</span>
                        </div>
                        <div className="status-text">OPERATIONAL</div>
                      </div>
                    </button>
                  );
                })}
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
                {groundCrewCallsign && (
                  <div className="callsign-display">
                    <strong>Callsign: {groundCrewCallsign}</strong>
                  </div>
                )}
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

        case "permits":
          return (
            <div className="permits-container">
              <div className="permits-header">
                <h2>PERMITS & DOCUMENTATION</h2>
                <div className="callsign-display">
                  <span className="callsign-label">CALLSIGN:</span>
                  <span className="callsign-value">{assignedCallsign || "NOT ASSIGNED"}</span>
                </div>
              </div>

              {activePermitForm ? (
                <div className="permit-form">
                  <div className="permit-form-inner">
                    <div className="permit-header">
                      <h2>{activePermitForm.toUpperCase()} PERMIT APPLICATION</h2>
                      <div className="permit-subtitle">Official Aviation Document</div>
                      <div className="permit-number">Doc #{permitDocumentId}</div>
                      <button onClick={() => setActivePermitForm(null)} className="close-permit">×</button>
                    </div>

                    <div className="permit-content">
                    {activePermitForm === "overweight" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Aircraft Registration:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="N123AB"
                            value={permitFormData.registration || ''}
                            onChange={(e) => updatePermitFormData('registration', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>Total Weight (kg):</label>
                          <input
                            type="number"
                            className="permit-input"
                            placeholder="75000"
                            value={permitFormData.totalWeight || ''}
                            onChange={(e) => updatePermitFormData('totalWeight', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>Standard MTOW (kg):</label>
                          <input
                            type="number"
                            className="permit-input"
                            placeholder="70000"
                            value={permitFormData.standardMTOW || ''}
                            onChange={(e) => updatePermitFormData('standardMTOW', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>Reason for Overweight:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="Additional fuel for weather diversion"
                            value={permitFormData.reason || ''}
                            onChange={(e) => updatePermitFormData('reason', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activePermitForm === "diplomatic" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Diplomatic Mission:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="Embassy of..."
                            value={permitFormData.mission || ''}
                            onChange={(e) => updatePermitFormData('mission', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>Official Purpose:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="State visit"
                            value={permitFormData.purpose || ''}
                            onChange={(e) => updatePermitFormData('purpose', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>VIP Level:</label>
                          <select
                            className="permit-input"
                            value={permitFormData.vipLevel || ''}
                            onChange={(e) => updatePermitFormData('vipLevel', e.target.value)}
                          >
                            <option value="">Select VIP Level</option>
                            <option value="head-of-state">Head of State</option>
                            <option value="government-minister">Government Minister</option>
                            <option value="ambassador">Ambassador</option>
                            <option value="diplomatic-staff">Diplomatic Staff</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {activePermitForm === "special" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Special Request Type:</label>
                          <select
                            className="permit-input"
                            value={permitFormData.requestType || ''}
                            onChange={(e) => updatePermitFormData('requestType', e.target.value)}
                          >
                            <option value="">Select Request Type</option>
                            <option value="medical-emergency">Medical Emergency</option>
                            <option value="hazardous-cargo">Hazardous Cargo</option>
                            <option value="oversized-cargo">Oversized Cargo</option>
                            <option value="military-flight">Military Flight</option>
                            <option value="search-rescue">Search and Rescue</option>
                          </select>
                        </div>
                        <div className="permit-field">
                          <label>Details:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="Describe special requirements"
                            value={permitFormData.details || ''}
                            onChange={(e) => updatePermitFormData('details', e.target.value)}
                          />
                        </div>
                        <div className="permit-field">
                          <label>Authority Contact:</label>
                          <input
                            type="text"
                            className="permit-input"
                            placeholder="Contact person/department"
                            value={permitFormData.authorityContact || ''}
                            onChange={(e) => updatePermitFormData('authorityContact', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {activePermitForm === "weightBalance" && aircraftData && (
                      <div className="weight-balance-document">
                        <div className="wb-header">
                          <h2>WEIGHT AND BALANCE MANIFEST</h2>
                          <div className="wb-flight-info">
                            <div>Flight: {flightNumber || 'N/A'}</div>
                            <div>Aircraft: {aircraft}</div>
                            <div>Registration: {aircraftData.type}-REG</div>
                            <div>Date: {new Date().toLocaleDateString()}</div>
                          </div>
                        </div>

                        {(() => {
                          const wb = calculateWeightAndBalance();
                          return wb ? (
                            <div className="wb-content">
                              <div className="wb-section">
                                <h3>AIRCRAFT SPECIFICATIONS</h3>
                                <div className="wb-grid">
                                  <div className="wb-item">
                                    <span>Operating Empty Weight:</span>
                                    <span>{aircraftData.operatingEmptyWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Maximum Takeoff Weight:</span>
                                    <span>{aircraftData.maxTakeoffWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Maximum Landing Weight:</span>
                                    <span>{aircraftData.maxLandingWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Maximum Zero Fuel Weight:</span>
                                    <span>{aircraftData.maxZeroFuelWeight.toLocaleString()} kg</span>
                                  </div>
                                </div>
                              </div>

                              <div className="wb-section">
                                <h3>LOAD MANIFEST</h3>
                                <div className="wb-grid">
                                  <div className="wb-item">
                                    <span>Passengers ({passengerManifest.length}):</span>
                                    <span>{wb.passengerWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Baggage:</span>
                                    <span>{wb.baggageWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Cargo:</span>
                                    <span>{wb.cargoWeight.toLocaleString()} kg</span>
                                  </div>
                                  <div className="wb-item">
                                    <span>Fuel:</span>
                                    <span>{wb.fuelWeight.toLocaleString()} kg</span>
                                  </div>
                                </div>
                              </div>

                              <div className="wb-section">
                                <h3>WEIGHT SUMMARY</h3>
                                <div className="wb-summary">
                                  <div className="wb-total">
                                    <span>TOTAL WEIGHT:</span>
                                    <span className={wb.withinLimits ? 'wb-safe' : 'wb-warning'}>
                                      {wb.totalWeight.toLocaleString()} kg
                                    </span>
                                  </div>
                                  <div className="wb-cg">
                                    <span>CENTER OF GRAVITY:</span>
                                    <span className={wb.withinLimits ? 'wb-safe' : 'wb-warning'}>
                                      {wb.cgPercentMAC}% MAC
                                    </span>
                                  </div>
                                  <div className="wb-status">
                                    <span>STATUS:</span>
                                    <span className={wb.withinLimits ? 'wb-safe' : 'wb-warning'}>
                                      {wb.withinLimits ? 'WITHIN LIMITS' : 'OUTSIDE LIMITS'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="wb-signatures">
                                <div className="wb-signature">
                                  <div className="signature-line">
                                    <input
                                      type="text"
                                      placeholder="Click to sign"
                                      value={permitFormData.captainSignature || ''}
                                      onChange={(e) => updatePermitFormData('captainSignature', e.target.value || `✓ ${user?.username} - ${new Date().toLocaleTimeString()}`)}
                                      onFocus={(e) => {
                                        if (!e.target.value) {
                                          updatePermitFormData('captainSignature', `✓ ${user?.username} - ${new Date().toLocaleTimeString()}`);
                                        }
                                      }}
                                      className="signature-input"
                                      readOnly
                                    />
                                  </div>
                                  <div>Captain Signature</div>
                                </div>
                                <div className="wb-signature">
                                  <div className="signature-line">
                                    <input
                                      type="text"
                                      placeholder="Ground ops signature"
                                      value={permitFormData.loadMasterSignature || ''}
                                      onChange={(e) => updatePermitFormData('loadMasterSignature', e.target.value || `✓ Ground Operations - ${new Date().toLocaleTimeString()}`)}
                                      onFocus={(e) => {
                                        if (!e.target.value) {
                                          updatePermitFormData('loadMasterSignature', `✓ Ground Operations - ${new Date().toLocaleTimeString()}`);
                                        }
                                      }}
                                      className="signature-input"
                                      readOnly
                                    />
                                  </div>
                                  <div>Load Master Signature</div>
                                </div>
                              </div>

                              <div className="wb-certification">
                                <div className="certification-text">
                                  I certify that this aircraft is loaded and balanced in accordance with
                                  applicable regulations and the manufacturer's specifications.
                                </div>
                                <div className="certification-date">
                                  Date: {new Date().toLocaleDateString()} | Time: {getZuluTime()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="wb-loading">
                              Select aircraft and passengers to calculate weight and balance
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="permit-actions">
                      <button
                        className="submit-permit"
                        onClick={() => submitPermit(activePermitForm, permitFormData)}
                        disabled={!permitFormData || Object.keys(permitFormData).length === 0}
                      >
                        SUBMIT PERMIT
                      </button>
                      <button
                        className="cancel-permit"
                        onClick={() => {
                          setActivePermitForm(null);
                          setPermitFormData({});
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="permits-section">
                    <h3>PERMIT APPLICATIONS</h3>
                    <div className="permit-buttons">
                      <button className="permit-btn" onClick={() => setActivePermitForm("overweight")}>
                        <span className="permit-icon">⚖️</span>
                        <span>OVERWEIGHT PERMIT</span>
                      </button>
                      <button className="permit-btn" onClick={() => setActivePermitForm("diplomatic")}>
                        <span className="permit-icon">🏛️</span>
                        <span>DIPLOMATIC CLEARANCE</span>
                      </button>
                      <button className="permit-btn" onClick={() => setActivePermitForm("special")}>
                        <span className="permit-icon">🚨</span>
                        <span>SPECIAL OPERATIONS</span>
                      </button>
                    </div>
                  </div>

                  <div className="documents-section">
                    <h3>FLIGHT DOCUMENTATION</h3>
                    <div className="docs-grid">
                      <div className={`doc-item ${flightDocuments.flightPlan.filed ? 'completed' : 'pending'}`}>
                        <div className="doc-icon">📋</div>
                        <div className="doc-info">
                          <div className="doc-title">Flight Plan</div>
                          <div className="doc-status">{flightDocuments.flightPlan.filed ? 'FILED' : 'PENDING'}</div>
                        </div>
                        <button
                          className="doc-action"
                          onClick={() => updateFlightDocument('flightPlan', { filed: !flightDocuments.flightPlan.filed })}
                        >
                          {flightDocuments.flightPlan.filed ? 'AMEND' : 'FILE'}
                        </button>
                      </div>

                      <div className={`doc-item ${flightDocuments.weightBalance.completed ? 'completed' : 'pending'}`}>
                        <div className="doc-icon">⚖️</div>
                        <div className="doc-info">
                          <div className="doc-title">Weight & Balance</div>
                          <div className="doc-status">{flightDocuments.weightBalance.completed ? 'COMPLETED' : 'PENDING'}</div>
                        </div>
                        <button
                          className="doc-action"
                          onClick={() => setActivePermitForm('weightBalance')}
                        >
                          VIEW MANIFEST
                        </button>
                      </div>

                      <div className={`doc-item ${flightDocuments.weatherBrief.obtained ? 'completed' : 'pending'}`}>
                        <div className="doc-icon">🌤️</div>
                        <div className="doc-info">
                          <div className="doc-title">Weather Brief</div>
                          <div className="doc-status">{flightDocuments.weatherBrief.obtained ? 'OBTAINED' : 'PENDING'}</div>
                        </div>
                        <button
                          className="doc-action"
                          onClick={() => updateFlightDocument('weatherBrief', { obtained: !flightDocuments.weatherBrief.obtained })}
                        >
                          {flightDocuments.weatherBrief.obtained ? 'UPDATE' : 'GET BRIEF'}
                        </button>
                      </div>

                      <div className={`doc-item ${flightDocuments.notams.reviewed ? 'completed' : 'pending'}`}>
                        <div className="doc-icon">📢</div>
                        <div className="doc-info">
                          <div className="doc-title">NOTAMs</div>
                          <div className="doc-status">{flightDocuments.notams.reviewed ? 'REVIEWED' : 'PENDING'}</div>
                        </div>
                        <button
                          className="doc-action"
                          onClick={() => updateFlightDocument('notams', { reviewed: !flightDocuments.notams.reviewed })}
                        >
                          {flightDocuments.notams.reviewed ? 'REFRESH' : 'REVIEW'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="permits-list">
                    <h3>SUBMITTED PERMITS ({permits.length})</h3>
                    {permits.length === 0 ? (
                      <div className="no-permits">
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📋</div>
                        <div>No permits submitted yet</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                          Submit permits using the buttons above
                        </div>
                      </div>
                    ) : (
                      <div className="permits-scroll-container">
                        {permits.map(permit => (
                          <div key={permit.id} className="permit-item">
                            <div className="permit-header">
                              <span className="permit-type">
                                {permit.type === 'overweight' && 'OVERWEIGHT PERMIT'}
                                {permit.type === 'diplomatic' && 'DIPLOMATIC PERMIT'}
                                {permit.type === 'special' && 'SPECIAL OPERATIONS PERMIT'}
                                {permit.type === 'weightBalance' && 'WEIGHT & BALANCE MANIFEST'}
                              </span>
                              <span className={`permit-status ${permit.status.toLowerCase()}`}>
                                {permit.status}
                                {permit.status === 'APPROVED' && permit.approvedAt && (
                                  <div className="permit-approval-time">
                                    Approved: {permit.approvedAt}
                                  </div>
                                )}
                              </span>
                            </div>
                            <div className="permit-details">
                              <span><strong>Submitted:</strong> {permit.submittedDate} at {permit.submittedAt}</span>
                              <span><strong>Callsign:</strong> {permit.callsign}</span>
                            </div>
                            <div className="permit-details">
                              <span><strong>Pilot:</strong> {permit.submittedBy}</span>
                              <span><strong>Stand:</strong> {permit.stand || 'N/A'}</span>
                            </div>
                            <div className="permit-details">
                              <span><strong>Aircraft:</strong> {permit.aircraft || 'N/A'}</span>
                              <span><strong>Permit ID:</strong> {permit.id.split('_')[1]}</span>
                            </div>
                            {permit.data && Object.keys(permit.data).length > 0 && (
                              <div className="permit-form-data">
                                <strong>Form Data:</strong>
                                <div className="form-data-grid">
                                  {Object.entries(permit.data).map(([key, value]) => (
                                    <div key={key} className="form-data-item">
                                      <span className="form-data-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                                      <span className="form-data-value">{value || 'N/A'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );



        case "manifest":
          const currentStandData = getCurrentAirportStands().find(s => s.id === selectedStand);
          const currentAircraftData = aircraftData ? aircraftDatabase[aircraft] : null;
          const isCargoStand = currentStandData?.type === "cargo" ||
                              (currentAircraftData && (currentAircraftData.category === "cargo" || currentAircraftData.category === "military-cargo"));

          return (
            <div className="manifest-container">
              <div className="manifest-header">
                <h2>{isCargoStand ? "CARGO MANIFEST" : "PASSENGER MANIFEST"}</h2>
                <div className="manifest-stats">
                  {isCargoStand ? (
                    <>
                      <div className="stat">
                        <span className="stat-value">{passengerManifest.length}</span>
                        <span className="stat-label">TOTAL ITEMS</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{passengerManifest.reduce((sum, item) => sum + (item.weight || 0), 0).toLocaleString()}</span>
                        <span className="stat-label">TOTAL KG</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{passengerManifest.filter(p => p.hazmat).length}</span>
                        <span className="stat-label">HAZMAT</span>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              <div className="manifest-content">
                <div className="passenger-list">
                  {passengerManifest.map((item) => (
                    isCargoStand ? (
                      <div key={item.id} className={`passenger-item cargo-item ${item.priority === 'High' ? 'high-priority' : ''}`}>
                        <div className="passenger-info">
                          <div className="passenger-name">AWB: {item.awbNumber}</div>
                          <div className="passenger-details">
                            <span className="seat">{item.description}</span>
                            <span className="class">{item.shipper}</span>
                            {item.destination && <span className="destination">→ {item.destination}</span>}
                            {item.hazmat && <span className="hazmat">HAZMAT</span>}
                          </div>
                        </div>
                        <div className="passenger-status">
                          <div className="cargo-details">
                            <div>{item.pieces} pieces</div>
                            <div>{item.weight} kg</div>
                            <div>{item.volume} m³</div>
                            <div className={`priority-${item.priority.toLowerCase()}`}>{item.priority}</div>
                            <div className="temperature">{item.temperature}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} className={`passenger-item ${item.checkedIn ? 'checked-in' : 'not-checked-in'}`}>
                        <div className="passenger-info">
                          <div className="passenger-name">{item.name}</div>
                          <div className="passenger-details">
                            <span className="seat">{item.seat}</span>
                            <span className="class">{item.class}</span>
                            {item.frequent && <span className="frequent">FREQUENT</span>}
                          </div>
                        </div>
                        <div className="passenger-status">
                          <div className={`check-status ${item.checkedIn ? 'checked' : 'pending'}`}>
                            {item.checkedIn ? '✓' : '○'}
                          </div>
                          {item.specialRequests && (
                            <div className="special-req">{item.specialRequests}</div>
                          )}
                        </div>
                      </div>
                    )
                  ))}
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
                      <span className="stat-value">{getCurrentAirportStands().filter(s => !stands[s.id]).length || '0'}</span>
                      <span className="stat-label">AVAILABLE</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item occupied">
                      <span className="stat-value">{getCurrentAirportStands().filter(s => stands[s.id]).length || '0'}</span>
                      <span className="stat-label">OCCUPIED</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item total">
                      <span className="stat-value">{getCurrentAirportStands().length || '0'}</span>
                      <span className="stat-label">TOTAL</span>
                      <div className="stat-indicator"></div>
                    </div>
                    <div className="stat-item requests">
                      <span className="stat-value">{requests.filter(r => r.status === "REQUESTED").length || '0'}</span>
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
                      onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                      placeholder="AAL123"
                      className="modern-input"
                      maxLength="7"
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
                      {getCurrentAirportStands()
                        .filter(stand => !stands[stand.id])
                        .map(stand => {
                        const isOccupied = stands[stand.id];
                        const compatible = !aircraft || isStandCompatible(stand.type, aircraft);
                        return (
                          <option key={stand.id} value={stand.id} disabled={isOccupied || !compatible}>
                            {stand.id} ({stand.type.toUpperCase()}) {isOccupied ? `- ${isOccupied.flight}` : compatible ? '- AVAILABLE' : '- INCOMPATIBLE'}
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


      if (activeTab === "guides") {
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
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0Ij5Hcm91bmQgT3BlcmF0aW9uczI8L3RleHQ+Cjwvc3ZnPgo=';
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
      }

      if (activeTab === "stands") {
        return (
          <div className="stand-management-container">
            <div className="stand-management-header">
              <h2>PROFESSIONAL STAND MANAGEMENT</h2>
              <div className="management-controls">
                <div className="control-group">
                  <label className="control-label">MANAGEMENT MODE:</label>
                  <div className="management-toggle active">
                    <span className="toggle-icon">🔓</span>
                    <span className="toggle-text">ENABLED</span>
                  </div>
                </div>

                <div className="stand-stats">
                  <div className="stat-item">
                    <span className="stat-value">{getCurrentAirportStands().filter(s => !stands[s.id]).length || '0'}</span>
                    <span className="stat-label">AVAILABLE</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{getCurrentAirportStands().filter(s => stands[s.id]).length || '0'}</span>
                    <span className="stat-label">OCCUPIED</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{requests.filter(r => r.status === "REQUESTED").length || '0'}</span>
                    <span className="stat-label">PENDING</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="stands-overview">
              <div className="stands-grid-professional">
                {getCurrentAirportStands().map(stand => {
                  const occupiedBy = stands[stand.id];
                  const standRequests = requests.filter(r => r.stand === stand.id && r.status === "REQUESTED");
                  const completedServices = requests.filter(r => r.stand === stand.id && r.status === "COMPLETED").length;

                  return (
                    <div
                      key={stand.id}
                      className={`stand-card-professional ${occupiedBy ? 'occupied' : 'available'} ${standManagementMode ? 'management-enabled' : ''}`}
                    >
                      <div className="stand-header-professional">
                        <div className="stand-identification">
                          <span className="stand-id-large">{stand.id}</span>
                          <span className="stand-type-badge">{stand.type.toUpperCase()}</span>
                        </div>
                        <div className="stand-status-indicator">
                          <div className={`status-light ${occupiedBy ? 'occupied' : 'available'}`}></div>
                          <span className="status-text">{occupiedBy ? 'OCCUPIED' : 'AVAILABLE'}</span>
                        </div>
                      </div>

                      {occupiedBy ? (
                        <div className="occupied-stand-details">
                          <div className="flight-identification">
                            <div className="flight-primary">
                              <span className="flight-number-large">{occupiedBy.flight}</span>
                              <span className="aircraft-badge">{occupiedBy.aircraft}</span>
                            </div>
                            <div className="pilot-info">
                              <span className="pilot-label">PILOT:</span>
                              <span className="pilot-name">{occupiedBy.pilot}</span>
                            </div>
                            {standManagementMode && (
                              <button
                                className="remove-flight-btn"
                                onClick={() => removeFlightFromStand(stand.id)}
                                title="Remove flight from stand"
                              >
                                REMOVE FLIGHT
                              </button>
                            )}
                          </div>

                          <div className="service-management-section">
                            <div className="services-header">
                              <span className="services-title">SERVICES</span>
                              <div className="service-counters">
                                <span className="pending-count">{standRequests.length} PENDING</span>
                                <span className="completed-count">{completedServices} COMPLETED</span>
                              </div>
                            </div>

                            {standRequests.length > 0 && (
                              <div className="active-services-list">
                                {standRequests.map((req, i) => (
                                  <div key={i} className="service-item-professional">
                                    <span className="service-name">{req.service}</span>
                                    <span className="service-time">{req.timestamp}</span>
                                    {standManagementMode && (
                                      <button
                                        className="remove-service-btn"
                                        onClick={() => removeServiceRequest(stand.id, req.service)}
                                        title="Cancel Service"
                                      >
                                        ✖
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {standManagementMode && (
                              <div className="service-quick-actions">
                                <div className="quick-actions-header">QUICK SERVICES:</div>
                                <div className="service-action-buttons">
                                  <button
                                    className="service-action-btn fuel"
                                    onClick={() => addServiceRequest(stand.id, "Fuel Service")}
                                    title="Request Fuel Service"
                                  >
                                    <span className="service-icon">⛽</span>
                                    <span className="service-label">FUEL</span>
                                  </button>
                                  <button
                                    className="service-action-btn catering"
                                    onClick={() => addServiceRequest(stand.id, "Catering")}
                                    title="Request Catering"
                                  >
                                    <span className="service-icon">🍽️</span>
                                    <span className="service-label">CATERING</span>
                                  </button>
                                  <button
                                    className="service-action-btn pushback"
                                    onClick={() => addServiceRequest(stand.id, "Pushback")}
                                    title="Request Pushback"
                                  >
                                    <span className="service-icon">🚛</span>
                                    <span className="service-label">PUSHBACK</span>
                                  </button>
                                  <button
                                    className="service-action-btn power"
                                    onClick={() => addServiceRequest(stand.id, "Ground Power")}
                                    title="Request Ground Power"
                                  >
                                    <span className="service-icon">🔌</span>
                                    <span className="service-label">POWER</span>
                                  </button>
                                  <button
                                    className="service-action-btn cleaning"
                                    onClick={() => addServiceRequest(stand.id, "Cleaning")}
                                    title="Request Cleaning"
                                  >
                                    <span className="service-icon">🧹</span>
                                    <span className="service-label">CLEAN</span>
                                  </button>
                                  <button
                                    className="service-action-btn baggage"
                                    onClick={() => addServiceRequest(stand.id, "Baggage")}
                                    title="Request Baggage Service"
                                  >
                                    <span className="service-icon">🧳</span>
                                    <span className="service-label">BAGGAGE</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="available-stand-section">
                          <div className="availability-display">
                            <div className="availability-icon">✈️</div>
                            <span className="availability-text">READY FOR ASSIGNMENT</span>
                          </div>

                          {standManagementMode && (
                            <div className="assignment-controls">
                              <div className="assignment-form-professional">
                                <div className="form-header-small">ASSIGN FLIGHT</div>
                                <div className="assignment-inputs">
                                  <div className="input-group">
                                    <label className="input-label">FLIGHT:</label>
                                    <input
                                      type="text"
                                      placeholder="AA1234"
                                      value={selectedStandForManagement === stand.id ? quickFlightNumber : ''}
                                      onChange={(e) => {
                                        setSelectedStandForManagement(stand.id);
                                        setQuickFlightNumber(e.target.value.toUpperCase());
                                      }}
                                      className="professional-input"
                                    />
                                  </div>
                                  <div className="input-group">
                                    <label className="input-label">AIRCRAFT:</label>
                                    <select
                                      value={selectedStandForManagement === stand.id ? quickAircraft : ''}
                                      onChange={(e) => {
                                        setSelectedStandForManagement(stand.id);
                                        setQuickAircraft(e.target.value);
                                      }}
                                      className="professional-select"
                                    >
                                      <option value="">SELECT</option>
                                      {aircraftTypes.filter(type => isStandCompatible(stand.type, type)).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <button
                                  className="assign-flight-btn"
                                  onClick={() => {
                                    if (selectedStandForManagement === stand.id) {
                                      assignFlightToStand(stand.id, quickFlightNumber, quickAircraft);
                                    }
                                  }}
                                  disabled={selectedStandForManagement !== stand.id || !quickFlightNumber || !quickAircraft}
                                >
                                  ASSIGN TO STAND
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {standManagementMode && (
              <div className="management-instructions">
                <div className="instructions-header">
                  <span className="instructions-icon">📋</span>
                  <h3>MANAGEMENT MODE INSTRUCTIONS</h3>
                </div>
                <div className="instructions-content">
                  <div className="instruction-item">
                    <span className="instruction-icon">✈️</span>
                    <span>Fill in flight number and aircraft type to assign flights to available stands</span>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-icon">🛠️</span>
                    <span>Use quick service buttons to request services for occupied stands</span>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-icon">✖</span>
                    <span>Click the ✖ button next to services to cancel pending requests</span>
                  </div>
                  <div className="instruction-item">
                    <span className="instruction-icon">📊</span>
                    <span>Monitor service counters to track ground operations efficiency</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="groundcrew-main">


          <div className="service-management-board">
            <div className="service-column critical">
              <div className="column-header critical">
                <div className="column-title">
                  <span className="priority-icon">🚨</span>
                  <h3>URGENT</h3>
                </div>
                <div className="request-count critical">{criticalPriorityRequests.length || '0'}</div>
              </div>
              <div className="service-requests">
                {criticalPriorityRequests.map((request, i) => (
                  <div key={i} className="service-request critical">
                    <div className="request-priority">URGENT</div>
                    <div className="request-info">
                      <div className="flight-details">
                        <span className="flight-number">{request.flight}</span>
                        <span className="stand-location">{request.stand}</span>
                      </div>
                      <div className="service-type">{request.service}</div>
                      <div className="request-time">{request.timestamp}</div>
                      {request.pushbackSettings && (
                        <div className="pushback-details">
                          <div className="pushback-info">
                            <span><strong>Tug:</strong> {request.pushbackSettings.tugSize}</span>
                            <span><strong>Cleared:</strong> {request.pushbackSettings.clearedByGround ? 'Yes' : 'No'}</span>
                            {request.pushbackSettings.clearedByGround && (
                              <span><strong>Direction:</strong> {request.pushbackSettings.tailDirection}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {groundCrewCallsign === "Ground 1" ? (
                      <div className="crew-assignment-controls">
                        <select
                          className="crew-assignment-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              assignCrewToTask(requests.indexOf(request), e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Assign to crew...</option>
                          <option value="Ground 2">Ground 2</option>
                          <option value="Ground 3">Ground 3</option>
                          <option value="Ground 4">Ground 4</option>
                          <option value="Ground 5">Ground 5</option>
                          <option value="Fuel Team">Fuel Team</option>
                          <option value="Catering Team">Catering Team</option>
                          <option value="Baggage Team">Baggage Team</option>
                          <option value="Maintenance Team">Maintenance Team</option>
                        </select>
                        <button
                          onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                          className="action-btn urgent small"
                        >
                          TAKE TASK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                        className="action-btn urgent"
                      >
                        IMMEDIATE RESPONSE
                      </button>
                    )}
                  </div>
                ))}
                {criticalPriorityRequests.length === 0 && (
                  <div className="no-requests">
                    <span className="no-requests-icon">✓</span>
                    <span>No urgent requests</span>
                  </div>
                )}
              </div>
            </div>

            <div className="service-column high">
              <div className="column-header high">
                <div className="column-title">
                  <span className="priority-icon">⚡</span>
                  <h3>HIGH PRIORITY</h3>
                </div>
                <div className="request-count high">{highPriorityRequests.length || '0'}</div>
              </div>
              <div className="service-requests">
                {highPriorityRequests.map((request, i) => (
                  <div key={i} className="service-request high">
                    <div className="request-priority">HIGH</div>
                    <div className="request-info">
                      <div className="flight-details">
                        <span className="flight-number">{request.flight}</span>
                        <span className="stand-location">{request.stand}</span>
                      </div>
                      <div className="service-type">{request.service}</div>
                      <div className="request-time">{request.timestamp}</div>
                      {request.pushbackSettings && (
                        <div className="pushback-details">
                          <div className="pushback-info">
                            <span><strong>Tug:</strong> {request.pushbackSettings.tugSize}</span>
                            <span><strong>Cleared:</strong> {request.pushbackSettings.clearedByGround ? 'Yes' : 'No'}</span>
                            {request.pushbackSettings.clearedByGround && (
                              <span><strong>Direction:</strong> {request.pushbackSettings.tailDirection}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {groundCrewCallsign === "Ground 1" ? (
                      <div className="crew-assignment-controls">
                        <select
                          className="crew-assignment-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              assignCrewToTask(requests.indexOf(request), e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Assign to crew...</option>
                          <option value="Ground 2">Ground 2</option>
                          <option value="Ground 3">Ground 3</option>
                          <option value="Ground 4">Ground 4</option>
                          <option value="Ground 5">Ground 5</option>
                          <option value="Fuel Team">Fuel Team</option>
                          <option value="Catering Team">Catering Team</option>
                          <option value="Baggage Team">Baggage Team</option>
                          <option value="Maintenance Team">Maintenance Team</option>
                        </select>
                        <button
                          onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                          className="action-btn high small"
                        >
                          TAKE TASK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                        className="action-btn high"
                      >
                        ACCEPT & ASSIGN
                      </button>
                    )}
                  </div>
                ))}
                {highPriorityRequests.length === 0 && (
                  <div className="no-requests">
                    <span className="no-requests-icon">✓</span>
                    <span>No high priority requests</span>
                  </div>
                )}
              </div>
            </div>

            <div className="service-column standard">
              <div className="column-header standard">
                <div className="column-title">
                  <span className="priority-icon">📋</span>
                  <h3>STANDARD</h3>
                </div>
                <div className="request-count standard">{mediumPriorityRequests.length + lowPriorityRequests.length || '0'}</div>
              </div>
              <div className="service-requests">
                {[...mediumPriorityRequests, ...lowPriorityRequests].map((request, i) => (
                  <div key={i} className="service-request standard">
                    <div className="request-priority">STANDARD</div>
                    <div className="request-info">
                      <div className="flight-details">
                        <span className="flight-number">{request.flight}</span>
                        <span className="stand-location">{request.stand}</span>
                      </div>
                      <div className="service-type">{request.service}</div>
                      <div className="request-time">{request.timestamp}</div>
                      {request.pushbackSettings && (
                        <div className="pushback-details">
                          <div className="pushback-info">
                            <span><strong>Tug:</strong> {request.pushbackSettings.tugSize}</span>
                            <span><strong>Cleared:</strong> {request.pushbackSettings.clearedByGround ? 'Yes' : 'No'}</span>
                            {request.pushbackSettings.clearedByGround && (
                              <span><strong>Direction:</strong> {request.pushbackSettings.tailDirection}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {groundCrewCallsign === "Ground 1" ? (
                      <div className="crew-assignment-controls">
                        <select
                          className="crew-assignment-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              assignCrewToTask(requests.indexOf(request), e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Assign to crew...</option>
                          <option value="Ground 2">Ground 2</option>
                          <option value="Ground 3">Ground 3</option>
                          <option value="Ground 4">Ground 4</option>
                          <option value="Ground 5">Ground 5</option>
                          <option value="Fuel Team">Fuel Team</option>
                          <option value="Catering Team">Catering Team</option>
                          <option value="Baggage Team">Baggage Team</option>
                          <option value="Maintenance Team">Maintenance Team</option>
                        </select>
                        <button
                          onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                          className="action-btn standard small"
                        >
                          TAKE TASK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")}
                        className="action-btn standard"
                      >
                        ASSIGN CREW
                      </button>
                    )}
                  </div>
                ))}
                {mediumPriorityRequests.length + lowPriorityRequests.length === 0 && (
                  <div className="no-requests">
                    <span className="no-requests-icon">✓</span>
                    <span>No standard requests</span>
                  </div>
                )}
              </div>
            </div>

            <div className="service-column active">
              <div className="column-header active">
                <div className="column-title">
                  <span className="priority-icon">🔄</span>
                  <h3>IN PROGRESS</h3>
                </div>
                <div className="request-count active">{inProgressRequests.length || '0'}</div>
              </div>
              <div className="service-requests">
                {inProgressRequests.map((request, i) => (
                  <div key={i} className="service-request active">
                    <div className="request-priority">ACTIVE</div>
                    <div className="request-info">
                      <div className="flight-details">
                        <span className="flight-number">{request.flight}</span>
                        <span className="stand-location">{request.stand}</span>
                      </div>
                      <div className="service-type">{request.service}</div>
                      <div className="request-time">{request.timestamp}</div>
                      {request.pushbackSettings && (
                        <div className="pushback-details">
                          <div className="pushback-info">
                            <span><strong>Tug:</strong> {request.pushbackSettings.tugSize}</span>
                            <span><strong>Cleared:</strong> {request.pushbackSettings.clearedByGround ? 'Yes' : 'No'}</span>
                            {request.pushbackSettings.clearedByGround && (
                              <span><strong>Direction:</strong> {request.pushbackSettings.tailDirection}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleServiceAction(requests.indexOf(request), "COMPLETED")}
                      className="action-btn complete"
                    >
                      MARK COMPLETE
                    </button>
                  </div>
                ))}
                {inProgressRequests.length === 0 && (
                  <div className="no-requests">
                    <span className="no-requests-icon">✓</span>
                    <span>No active services</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="tablet-interface">
      {showChangelog && changelogData && (
        <div className="changelog-overlay">
          <div className="changelog-modal">
            <div className="changelog-header">
              <h2>{changelogData.title}</h2>
              <button className="changelog-close" onClick={() => setShowChangelog(false)}>
                ×
              </button>
            </div>

            <div className="changelog-content">
              <div className="changelog-subtitle">
                {changelogData.subtitle}
              </div>

              <div className="changelog-support">
                <h3>🎯 {changelogData.supportSection.title}</h3>
                <p>
                  {changelogData.supportSection.description}{' '}
                  <a href={changelogData.supportSection.linkUrl} className="support-link">
                    {changelogData.supportSection.link}
                  </a>
                </p>
              </div>

              <div className="changelog-sections">
                <h3>Changelog</h3>
                {changelogData.sections.map((section, index) => (
                  <div key={index} className="changelog-section">
                    <h4>{section.title}</h4>
                    <ul>
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="changelog-footer">
              <button className="changelog-ok-btn" onClick={() => setShowChangelog(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showPushbackForm && (
        <div className="pushback-modal-overlay">
          <div className="pushback-modal">
            <div className="pushback-modal-header">
              <h3>PUSHBACK REQUEST</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowPushbackForm(false)}
              >
                ×
              </button>
            </div>
            <div className="pushback-form-content">
              <div className="form-group">
                <label>What tug do you need?</label>
                <select
                  value={pushbackFormData.tugSize}
                  onChange={(e) => setPushbackFormData(prev => ({ ...prev, tugSize: e.target.value }))}
                  className="pushback-select"
                >
                  <option value="">Select tug size</option>
                  <option value="Small">Small</option>
                  <option value="Small Long">Small Long</option>
                  <option value="Large">Large</option>
                </select>
              </div>
              <div className="form-group">
                <label>Have you been cleared by ground?</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="cleared"
                      checked={pushbackFormData.clearedByGround === true}
                      onChange={() => setPushbackFormData(prev => ({ ...prev, clearedByGround: true }))}
                    />
                    Yes
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="cleared"
                      checked={pushbackFormData.clearedByGround === false}
                      onChange={() => setPushbackFormData(prev => ({ ...prev, clearedByGround: false }))}
                    />
                    No
                  </label>
                </div>
              </div>
              {pushbackFormData.clearedByGround && (
                <div className="form-group">
                  <label>Which direction did ground clear your tail for?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="direction"
                        value="Left"
                        checked={pushbackFormData.tailDirection === 'Left'}
                        onChange={(e) => setPushbackFormData(prev => ({ ...prev, tailDirection: e.target.value }))}
                      />
                      Left
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="direction"
                        value="Right"
                        checked={pushbackFormData.tailDirection === 'Right'}
                        onChange={(e) => setPushbackFormData(prev => ({ ...prev, tailDirection: e.target.value }))}
                      />
                      Right
                    </label>
                  </div>
                </div>
              )}
              <div className="pushback-form-actions">
                <button
                  className="submit-pushback-btn"
                  onClick={submitPushbackRequest}
                >
                  SUBMIT REQUEST
                </button>
                <button
                  className="cancel-pushback-btn"
                  onClick={() => setShowPushbackForm(false)}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="tablet-header">
        <div className="header-left">
          <div className="app-title">MyPlane</div>
          <div className="location-info">{selectedAirport} - {userMode?.toUpperCase()}</div>
        </div>
        <div className="header-center">
          <div className="time-display">{currentTime.toLocaleTimeString()}</div>
          <div className="date-display">{currentTime.toDateString()}</div>
        </div>
        <div className="header-right">
          <div className="header-controls">
            <button onClick={toggleSound} className={`sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`}>
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={() => {
                setUserMode(null);
                setSelectedStand("");
                setFlightNumber("");
                setAircraft("");
                setAssignedCallsign("");
                setGroundCrewCallsign(""); // Ensure ground callsign is also reset
              }}
              className="switch-role-btn"
            >
              SWITCH ROLE
            </button>
          </div>
          <div className="user-info">
            <div className="username">{user.username}</div>
            <div className="user-role">{userMode?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="tablet-content">
        <div className="main-area">
          {renderContent()}
        </div>

        <div className={`comm-panel ${commMinimized ? 'minimized' : ''}`}>
          <div className="comm-header">
            <div className="comm-header-content">
              <h3>GROUND COMMUNICATIONS</h3>
              <div className="comm-status">ONLINE</div>
            </div>
            <div
              className="comm-minimized-indicator"
              onClick={() => setCommMinimized(false)}
            >
              <span>💬</span>
              <span>C</span>
              <span>O</span>
              <span>M</span>
              <span>M</span>
              <span>S</span>
            </div>
            <button
              onClick={() => setCommMinimized(!commMinimized)}
              className="comm-minimize-btn"
              title={commMinimized ? "Expand Communications" : "Minimize Communications"}
            >
              {commMinimized ? "◀" : "▶"}
            </button>
          </div>

          <div className="messages-area">
            {messages
              .filter(msg => {
                // Filter messages by airport
                if (msg.airport && msg.airport !== selectedAirport) return false;

                // Filter private checklist messages to only the user who created them
                if (msg.mode === 'checklist' && msg.privateMessage && msg.userId !== user?.id) {
                  return false;
                }

                // Filter messages based on user mode and relevant contexts
                if (userMode === "groundcrew") {
                  // Ground crew sees all messages at the airport except private checklist messages
                  return true;
                } else if (userMode === "pilot") {
                  // Pilots see system messages, their own checklist updates, and messages related to their stand or general ground comms
                  return msg.mode === 'system' || msg.mode === 'checklist' || !selectedStand || msg.stand === selectedStand || msg.stand === "GROUND";
                }
                // Default to showing messages if no specific filtering is needed
                return true;
              })
              .slice(-20) // Show the latest 20 messages
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
              placeholder="Type your message..."
              className="message-input"
              disabled={userMode === "pilot" && (!selectedStand || !stands[selectedStand] || stands[selectedStand].userId !== user?.id)}
            />
            <button
              onClick={sendMessage}
              className="send-btn"
              disabled={!input.trim() || (userMode === "pilot" && (!selectedStand || !stands[selectedStand] || stands[selectedStand].userId !== user?.id))}
            >
              SEND
            </button>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        {userMode === "pilot" && (
          <>
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
              className={`nav-btn ${activeTab === 'permits' ? 'active' : ''}`}
              onClick={() => setActiveTab('permits')}
            >
              <span className="nav-icon">📋</span>
              <span>PERMITS</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'manifest' ? 'active' : ''}`}
              onClick={() => setActiveTab('manifest')}
            >
              <span className="nav-icon">👥</span>
              <span>MANIFEST</span>
            </button>
          </>
        )}
        {userMode === "groundcrew" && (
          <>
            <button
              className={`nav-btn ${activeTab === 'main' ? 'active' : ''}`}
              onClick={() => setActiveTab('main')}
            >
              <span className="nav-icon">🏠</span>
              <span>OPERATIONS</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'stands' ? 'active' : ''}`}
              onClick={() => setActiveTab('stands')}
            >
              <span className="nav-icon">🅿️</span>
              <span>STANDS</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'guides' ? 'active' : ''}`}
              onClick={() => setActiveTab('guides')}
            >
              <span className="nav-icon">📖</span>
              <span>GUIDES</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}