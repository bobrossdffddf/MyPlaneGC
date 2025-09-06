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
  const [flightDocuments, setFlightDocuments] = useState({
    flightPlan: { filed: false, route: "", altitude: "", departure: "", destination: "" },
    weightBalance: { completed: false, totalWeight: 0, cg: 0, fuel: 0 },
    weatherBrief: { obtained: false, conditions: "", visibility: "", winds: "" },
    notams: { reviewed: false, count: 0, critical: [] },
    permits: { special: [], diplomatic: [], overweight: [] }
  });
  const [groundCallsignCounter, setGroundCallsignCounter] = useState(1);
  const [assignedCallsign, setAssignedCallsign] = useState("");
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
  const [standManagementMode, setStandManagementMode] = useState(false);
  const [selectedStandForManagement, setSelectedStandForManagement] = useState("");
  const [quickFlightNumber, setQuickFlightNumber] = useState("");
  const [quickAircraft, setQuickAircraft] = useState("");
  const [activeServiceRequests, setActiveServiceRequests] = useState({});

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
        scenario: "You need pushback but there's another aircraft taxiing behind you.",
        atcMessage: "Ground, American 1234 at gate A5, ready for pushback, advise when clear of traffic.",
        question: "What should ground control coordinate?",
        options: [
          "Immediate pushback clearance",
          "Hold for traffic, then coordinate pushback when area is clear",
          "Taxi forward instead",
          "Change gates"
        ],
        correct: 1,
        explanation: "Ground control must ensure area is clear of conflicting traffic before approving pushback."
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
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop",
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
          image: "https://images.unsplash.com/photo-1569629698899-7a9a8b5e4e89?w=400&h=300&fit=crop",
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
          image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop",
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
            "Verify nose gear is precisely on gate centerline before final stop",
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
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop",
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
          image: "https://images.unsplash.com/photo-1520637836862-4d197d17c7a4?w=400&h=300&fit=crop",
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
    "A318": { wingspan: 34.1, length: 31.4, category: "narrow-body", doors: 3, maxSeats: 132, weightClass: "medium" },
    "A319": { wingspan: 34.1, length: 33.8, category: "narrow-body", doors: 3, maxSeats: 156, weightClass: "medium" },
    "A320": { wingspan: 34.1, length: 37.6, category: "narrow-body", doors: 4, maxSeats: 180, weightClass: "medium" },
    "A321": { wingspan: 34.1, length: 44.5, category: "narrow-body", doors: 4, maxSeats: 220, weightClass: "heavy" },
    "A330": { wingspan: 60.3, length: 58.8, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "A340": { wingspan: 63.5, length: 63.7, category: "wide-body", doors: 6, maxSeats: 380, weightClass: "heavy" },
    "A350": { wingspan: 64.8, length: 66.8, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "A380": { wingspan: 79.8, length: 72.7, category: "super-heavy", doors: 8, maxSeats: 850, weightClass: "super" },
    "B737-700": { wingspan: 35.8, length: 33.6, category: "narrow-body", doors: 3, maxSeats: 149, weightClass: "medium" },
    "B737-800": { wingspan: 35.8, length: 39.5, category: "narrow-body", doors: 4, maxSeats: 189, weightClass: "medium" },
    "B737-900": { wingspan: 35.8, length: 42.1, category: "narrow-body", doors: 4, maxSeats: 220, weightClass: "heavy" },
    "B747-400": { wingspan: 64.4, length: 70.7, category: "wide-body", doors: 6, maxSeats: 660, weightClass: "heavy" },
    "B747-8": { wingspan: 68.4, length: 76.3, category: "wide-body", doors: 6, maxSeats: 605, weightClass: "heavy" },
    "B777-200": { wingspan: 60.9, length: 63.7, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "B777-300": { wingspan: 64.8, length: 73.9, category: "wide-body", doors: 6, maxSeats: 550, weightClass: "heavy" },
    "B787-8": { wingspan: 60.1, length: 56.7, category: "wide-body", doors: 6, maxSeats: 359, weightClass: "heavy" },
    "B787-9": { wingspan: 60.1, length: 62.8, category: "wide-body", doors: 6, maxSeats: 420, weightClass: "heavy" },
    "B787-10": { wingspan: 60.1, length: 68.3, category: "wide-body", doors: 6, maxSeats: 440, weightClass: "heavy" },
    "CRJ-200": { wingspan: 21.2, length: 26.8, category: "regional", doors: 2, maxSeats: 50, weightClass: "light" },
    "CRJ-700": { wingspan: 23.2, length: 32.3, category: "regional", doors: 2, maxSeats: 78, weightClass: "medium" },
    "CRJ-900": { wingspan: 24.9, length: 36.4, category: "regional", doors: 2, maxSeats: 90, weightClass: "medium" },
    "E170": { wingspan: 26.0, length: 29.9, category: "regional", doors: 2, maxSeats: 80, weightClass: "medium" },
    "E175": { wingspan: 26.0, length: 31.7, category: "regional", doors: 2, maxSeats: 88, weightClass: "medium" },
    "E190": { wingspan: 28.7, length: 36.2, category: "regional", doors: 2, maxSeats: 114, weightClass: "medium" },
    "DHC-8": { wingspan: 28.4, length: 32.8, category: "turboprop", doors: 2, maxSeats: 78, weightClass: "light" },
    "ATR-72": { wingspan: 27.1, length: 27.2, category: "turboprop", doors: 2, maxSeats: 78, weightClass: "light" },
    "MD-80": { wingspan: 32.9, length: 45.1, category: "narrow-body", doors: 4, maxSeats: 172, weightClass: "medium" },
    "MD-90": { wingspan: 32.9, length: 46.5, category: "narrow-body", doors: 4, maxSeats: 172, weightClass: "medium" }
  };

  const standCompatibilityMatrix = {
    "narrow": {
      maxWingspan: 36,
      maxLength: 50,
      categories: ["regional", "turboprop", "narrow-body"],
      maxWeightClass: ["light", "medium"]
    },
    "medium": {
      maxWingspan: 52,
      maxLength: 70,
      categories: ["regional", "turboprop", "narrow-body"],
      maxWeightClass: ["light", "medium", "heavy"]
    },
    "wide": {
      maxWingspan: 80,
      maxLength: 80,
      categories: ["regional", "turboprop", "narrow-body", "wide-body", "super-heavy"],
      maxWeightClass: ["light", "medium", "heavy", "super"]
    },
    "cargo": {
      maxWingspan: 80,
      maxLength: 80,
      categories: ["regional", "turboprop", "narrow-body", "wide-body", "super-heavy"],
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
    const newCallsign = `Ground ${groundCallsignCounter}`;
    setGroundCallsignCounter(prev => prev + 1);
    return newCallsign;
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

      manifest.push({
        id: i + 1,
        name: `${firstName} ${lastName}`,
        seat: `${seatRow}${seatLetter}`,
        class: seatClasses[Math.floor(Math.random() * seatClasses.length)],
        checkedIn: Math.random() > 0.1,
        specialRequests: Math.random() > 0.8 ? ["Wheelchair", "Dietary", "Unaccompanied Minor", "Extra Legroom", "Bassinet"][Math.floor(Math.random() * 5)] : null,
        frequent: Math.random() > 0.7
      });
    }

    return manifest;
  };

  const generateCargoManifest = () => {
    const cargoTypes = ["Electronics", "Automotive Parts", "Textiles", "Pharmaceuticals", "Food Products", "Machinery", "Documents", "Perishables"];
    const companies = ["FedEx", "DHL", "UPS", "Amazon", "Maersk", "COSCO", "MSC", "CMA CGM"];
    const cargoCount = Math.floor(Math.random() * 15) + 5; // 5-20 cargo items
    const manifest = [];

    for (let i = 0; i < cargoCount; i++) {
      const cargoType = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const weight = Math.floor(Math.random() * 2000) + 100; // 100-2100 kg
      const pieces = Math.floor(Math.random() * 10) + 1; // 1-10 pieces

      manifest.push({
        id: i + 1,
        awbNumber: `${Math.floor(Math.random() * 900000) + 100000}`,
        description: cargoType,
        shipper: company,
        pieces: pieces,
        weight: weight,
        volume: Math.floor(weight * 0.8), // Rough volume calculation
        priority: Math.random() > 0.8 ? "High" : Math.random() > 0.5 ? "Medium" : "Standard",
        hazmat: Math.random() > 0.9,
        temperature: cargoType === "Perishables" ? "Refrigerated" : "Ambient"
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
          range: aircraft.includes('787') ? 15750 : aircraft.includes('A380') ? 15200 : aircraft.includes('777') ? 14685 : aircraft.includes('A350') ? 15000 : aircraft.includes('747') ? 14815 : 6500,
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
        const isCargoStand = currentStandData?.type === "cargo";
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
    
    // Reset callsign when switching modes
    setAssignedCallsign("");
    setGroundCallsignCounter(1);
    
    socket.emit("userMode", { mode, airport, userId: user?.id });
  };

  const claimStand = () => {
    if (selectedStand && flightNumber && aircraft && selectedAirport) {
      // Use flight number as callsign for pilots
      const callsign = flightNumber;
      setAssignedCallsign(callsign);
      
      socket.emit("claimStand", {
        stand: selectedStand,
        flightNumber,
        aircraft,
        pilot: user?.username,
        userId: user?.id,
        airport: selectedAirport,
        allowSwitch: true,
        callsign: callsign
      });
    }
  };

  const sendMessage = () => {
    if (input.trim() === "") return;
    if (userMode === "pilot" && !selectedStand) {
      alert("Please select a stand first to send messages");
      return;
    }
    
    let senderName = user?.username;
    let callsign = assignedCallsign;
    
    if (userMode === "pilot") {
      if (!assignedCallsign && flightNumber) {
        callsign = flightNumber;
        setAssignedCallsign(callsign);
      }
      senderName = `${callsign || user?.username} (${user?.username})`;
    } else if (userMode === "groundcrew") {
      if (!assignedCallsign) {
        callsign = assignGroundCallsign();
      }
      senderName = `${callsign} (${user?.username})`;
    }
    
    const message = {
      text: input,
      sender: senderName,
      stand: userMode === "pilot" ? selectedStand : "GROUND",
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
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

  const submitPermit = (permitType, formData) => {
    if (!flightNumber || !selectedStand) {
      alert("Please ensure flight number and stand are selected before submitting permits");
      return;
    }

    const currentCallsign = assignedCallsign || flightNumber;
    const newPermit = {
      id: Date.now(),
      type: permitType,
      data: formData,
      status: "SUBMITTED",
      submittedAt: new Date().toLocaleTimeString(),
      submittedDate: new Date().toLocaleDateString(),
      callsign: currentCallsign,
      submittedBy: user?.username,
      airport: selectedAirport,
      stand: selectedStand
    };
    
    setPermits(prev => [...prev, newPermit]);
    setActivePermitForm(null);
    
    // Send system message about permit submission
    socket.emit("chatMessage", {
      text: `📋 ${permitType.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} PERMIT submitted by ${currentCallsign}`,
      sender: "PERMITS OFFICE",
      stand: selectedStand,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });

    // Show success message
    alert(`${permitType.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} permit submitted successfully!`);
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
    const payloadWeight = passengerWeight + baggageWeight;
    const remainingCapacity = maxTakeoffWeight - operatingEmptyWeight - payloadWeight;
    
    // Use a fixed percentage based on aircraft type for consistency
    const fuelPercentage = aircraft.includes('A380') ? 0.75 : aircraft.includes('747') ? 0.72 : 0.78;
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
                      <div className="status-text">OPERATIONAL</div>
                    </div>
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
                  <div className="form-header">
                    <h3>{activePermitForm.toUpperCase()} PERMIT APPLICATION</h3>
                    <button onClick={() => setActivePermitForm(null)} className="close-form">×</button>
                  </div>
                  
                  <div className="form-content">
                    {activePermitForm === "overweight" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Aircraft Registration:</label>
                          <input type="text" className="permit-input" placeholder="N123AB" />
                        </div>
                        <div className="permit-field">
                          <label>Total Weight (kg):</label>
                          <input type="number" className="permit-input" placeholder="75000" />
                        </div>
                        <div className="permit-field">
                          <label>Standard MTOW (kg):</label>
                          <input type="number" className="permit-input" placeholder="70000" />
                        </div>
                        <div className="permit-field">
                          <label>Reason for Overweight:</label>
                          <input type="text" className="permit-input" placeholder="Additional fuel for weather diversion" />
                        </div>
                      </div>
                    )}

                    {activePermitForm === "diplomatic" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Diplomatic Mission:</label>
                          <input type="text" className="permit-input" placeholder="Embassy of..." />
                        </div>
                        <div className="permit-field">
                          <label>Official Purpose:</label>
                          <input type="text" className="permit-input" placeholder="State visit" />
                        </div>
                        <div className="permit-field">
                          <label>VIP Level:</label>
                          <select className="permit-input">
                            <option>Head of State</option>
                            <option>Government Minister</option>
                            <option>Ambassador</option>
                            <option>Diplomatic Staff</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {activePermitForm === "special" && (
                      <div className="permit-fields">
                        <div className="permit-field">
                          <label>Special Request Type:</label>
                          <select className="permit-input">
                            <option>Medical Emergency</option>
                            <option>Hazardous Cargo</option>
                            <option>Oversized Cargo</option>
                            <option>Military Flight</option>
                            <option>Search and Rescue</option>
                          </select>
                        </div>
                        <div className="permit-field">
                          <label>Details:</label>
                          <input type="text" className="permit-input" placeholder="Describe special requirements" />
                        </div>
                        <div className="permit-field">
                          <label>Authority Contact:</label>
                          <input type="text" className="permit-input" placeholder="Contact person/department" />
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
                                  <div className="signature-line"></div>
                                  <div>Captain Signature</div>
                                </div>
                                <div className="wb-signature">
                                  <div className="signature-line"></div>
                                  <div>Load Master Signature</div>
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
                        onClick={() => submitPermit(activePermitForm, {})}
                      >
                        SUBMIT PERMIT
                      </button>
                      <button 
                        className="cancel-permit"
                        onClick={() => setActivePermitForm(null)}
                      >
                        CANCEL
                      </button>
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
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
                        <div>No permits submitted yet</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '5px' }}>
                          Submit permits using the buttons above
                        </div>
                      </div>
                    ) : (
                      permits.map(permit => (
                        <div key={permit.id} className="permit-item">
                          <div className="permit-header">
                            <span className="permit-type">
                              {permit.type === 'overweight' && '⚖️ OVERWEIGHT PERMIT'}
                              {permit.type === 'diplomatic' && '🏛️ DIPLOMATIC PERMIT'}
                              {permit.type === 'special' && '🚨 SPECIAL OPERATIONS PERMIT'}
                              {permit.type === 'weightBalance' && '📊 WEIGHT & BALANCE MANIFEST'}
                            </span>
                            <span className={`permit-status ${permit.status.toLowerCase()}`}>{permit.status}</span>
                          </div>
                          <div className="permit-details">
                            <span><strong>Submitted:</strong> {permit.submittedDate} at {permit.submittedAt}</span>
                            <span><strong>Callsign:</strong> {permit.callsign}</span>
                          </div>
                          <div className="permit-details">
                            <span><strong>Pilot:</strong> {permit.submittedBy}</span>
                            <span><strong>Stand:</strong> {permit.stand || 'N/A'}</span>
                          </div>
                          {permit.type === 'weightBalance' && (
                            <div className="permit-additional-info">
                              <span><strong>Aircraft:</strong> {aircraft || 'N/A'}</span>
                              <span><strong>Passengers:</strong> {passengerManifest.length}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          );

        

        case "manifest":
          const currentStandData = getCurrentAirportStands().find(s => s.id === selectedStand);
          const isCargoStand = currentStandData?.type === "cargo";
          
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
                <div className="manifest-filters">
                  <select className="filter-select">
                    {isCargoStand ? (
                      <>
                        <option value="all">All Cargo</option>
                        <option value="priority">High Priority</option>
                        <option value="hazmat">Hazmat Items</option>
                        <option value="refrigerated">Refrigerated</option>
                      </>
                    ) : (
                      <>
                        <option value="all">All Passengers</option>
                        <option value="checkedIn">Checked In</option>
                        <option value="notCheckedIn">Not Checked In</option>
                        <option value="special">Special Requests</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="passenger-list">
                  {passengerManifest.map((item) => (
                    isCargoStand ? (
                      <div key={item.id} className={`passenger-item cargo-item ${item.priority === 'High' ? 'high-priority' : ''}`}>
                        <div className="passenger-info">
                          <div className="passenger-name">AWB: {item.awbNumber}</div>
                          <div className="passenger-details">
                            <span className="seat">{item.description}</span>
                            <span className="class">{item.shipper}</span>
                            {item.hazmat && <span className="hazmat">HAZMAT</span>}
                          </div>
                        </div>
                        <div className="passenger-status">
                          <div className="cargo-details">
                            <div>{item.pieces} pieces</div>
                            <div>{item.weight} kg</div>
                            <div className={`priority-${item.priority.toLowerCase()}`}>{item.priority}</div>
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
                      {getCurrentAirportStands()
                        .filter(stand => !aircraft || isStandCompatible(stand.type, aircraft))
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
                  <button 
                    className={`management-toggle ${standManagementMode ? 'active' : 'inactive'}`}
                    onClick={() => setStandManagementMode(!standManagementMode)}
                  >
                    <span className="toggle-icon">{standManagementMode ? '🔓' : '🔒'}</span>
                    <span className="toggle-text">{standManagementMode ? 'ENABLED' : 'DISABLED'}</span>
                  </button>
                </div>
                
                <div className="stand-stats">
                  <div className="stat-item">
                    <span className="stat-value">{getCurrentAirportStands().filter(s => !stands[s.id]).length}</span>
                    <span className="stat-label">AVAILABLE</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{getCurrentAirportStands().filter(s => stands[s.id]).length}</span>
                    <span className="stat-label">OCCUPIED</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{requests.filter(r => r.status === "REQUESTED").length}</span>
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
          <div className="ground-operations-header">
            <div className="header-content">
              <div className="header-left">
                <h1>GROUND OPERATIONS CONTROL</h1>
                <div className="airport-designation">{selectedAirport} - GROUND FREQUENCY 121.9</div>
              </div>
              <div className="header-right">
                <div className="operational-status">
                  <div className="status-indicator online"></div>
                  <span>ALL SYSTEMS OPERATIONAL</span>
                </div>
                <div className="current-time">{new Date().toLocaleTimeString()}</div>
              </div>
            </div>
            
            <div className="operations-metrics">
              <div className="metric-card pending">
                <div className="metric-icon">⏳</div>
                <div className="metric-data">
                  <span className="metric-value">{requests.filter(r => r.status === "REQUESTED").length}</span>
                  <span className="metric-label">PENDING REQUESTS</span>
                </div>
              </div>
              <div className="metric-card active">
                <div className="metric-icon">🔄</div>
                <div className="metric-data">
                  <span className="metric-value">{requests.filter(r => r.status === "ACCEPTED").length}</span>
                  <span className="metric-label">ACTIVE SERVICES</span>
                </div>
              </div>
              <div className="metric-card completed">
                <div className="metric-icon">✅</div>
                <div className="metric-data">
                  <span className="metric-value">{requests.filter(r => r.status === "COMPLETED").length}</span>
                  <span className="metric-label">COMPLETED TODAY</span>
                </div>
              </div>
              <div className="metric-card efficiency">
                <div className="metric-icon">📊</div>
                <div className="metric-data">
                  <span className="metric-value">98%</span>
                  <span className="metric-label">EFFICIENCY</span>
                </div>
              </div>
            </div>
          </div>

          <div className="service-management-board">
            <div className="service-column critical">
              <div className="column-header critical">
                <div className="column-title">
                  <span className="priority-icon">🚨</span>
                  <h3>URGENT</h3>
                </div>
                <div className="request-count critical">{criticalPriorityRequests.length}</div>
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
                    </div>
                    <button 
                      onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} 
                      className="action-btn urgent"
                    >
                      IMMEDIATE RESPONSE
                    </button>
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
                <div className="request-count high">{highPriorityRequests.length}</div>
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
                    </div>
                    <button 
                      onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} 
                      className="action-btn high"
                    >
                      ACCEPT & ASSIGN
                    </button>
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
                <div className="request-count standard">{mediumPriorityRequests.length + lowPriorityRequests.length}</div>
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
                    </div>
                    <button 
                      onClick={() => handleServiceAction(requests.indexOf(request), "ACCEPTED")} 
                      className="action-btn standard"
                    >
                      ASSIGN CREW
                    </button>
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
                <div className="request-count active">{inProgressRequests.length}</div>
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
      <div className="tablet-header">
        <div className="header-left">
          <div className="app-title">PTFS GROUND CONTROL</div>
          <div className="location-info">{selectedAirport} - {userMode?.toUpperCase()}</div>
        </div>
        <div className="header-center">
          <div className="time-display">{currentTime.toLocaleTimeString()}</div>
          <div className="date-display">{currentTime.toDateString()}</div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="username">{user.username}</div>
            <div className="user-role">{userMode?.toUpperCase()}</div>
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