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
    title: "MCDU",
    currentPage: "INIT",
    lines: generateInitPage(),
    activeFunction: "INIT"
  });

  function generateInitPage() {
    return [
      "FROM/TO",
      `${selectedAirport || "----"}/----`,
      "",
      "FLT NBR        COST INDEX",
      `${flightNumber || "----"}              085`,
      "",
      "ALTN         CRZ FL/TEMP",
      "----         -----/--C",
      "",
      "TROPO        36090",
      "",
      "<INDEX       INIT>"
    ];
  }

  function generateNavPage() {
    return [
      "F-PLN         1/3",
      "",
      `FROM         ${selectedAirport || "----"}`,
      `TO           ----`,
      "",
      "VIA          DIRECT",
      "",
      "DIST         ---NM",
      "TIME         --:--",
      "",
      "<AIRWAYS     NAV>",
      "<PRINT       PRINT>"
    ];
  }

  function generatePerfPage() {
    return [
      "PERF INIT     1/3",
      "",
      "GW           ---.-T",
      `PAX          ${passengerManifest.length}`,
      "",
      "V1           ---KT",
      "VR           ---KT", 
      "V2           ---KT",
      "",
      "TRANS ALT    18000",
      "",
      "<TAKEOFF     APPR>"
    ];
  }
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




  // Aircraft compatibility mapping
  const getAircraftCategory = (aircraftType) => {
    const wideBodyAircraft = ["A330", "A340", "A350", "A380", "B747-400", "B747-8", "B777-200", "B777-300", "B787-8", "B787-9", "B787-10"];
    const narrowBodyAircraft = ["A318", "A319", "A320", "A321", "B737-700", "B737-800", "B737-900"];
    const regionalAircraft = ["CRJ-200", "CRJ-700", "CRJ-900", "E170", "E175", "E190", "DHC-8", "ATR-72"];
    
    if (wideBodyAircraft.includes(aircraftType)) return "wide-body";
    if (narrowBodyAircraft.includes(aircraftType)) return "narrow-body";
    if (regionalAircraft.includes(aircraftType)) return "regional";
    return "narrow-body"; // default
  };

  const isStandCompatible = (standType, aircraftType) => {
    const aircraftCategory = getAircraftCategory(aircraftType);
    
    // Stand compatibility rules
    switch (standType) {
      case "narrow":
        return aircraftCategory === "narrow-body" || aircraftCategory === "regional";
      case "medium":
        return aircraftCategory === "narrow-body" || aircraftCategory === "wide-body" || aircraftCategory === "regional";
      case "wide":
        return true; // Wide stands can accommodate all aircraft
      case "cargo":
        return true; // Cargo stands can accommodate all aircraft
      default:
        return true;
    }
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
    if (!aircraftData) return [];
    
    const maxSeats = aircraftData.maxSeats;
    // Use 85-95% of max capacity for realistic loading
    const passengerCount = Math.floor(maxSeats * (0.85 + Math.random() * 0.10));
    const manifest = [];

    const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "Robert", "Anna", "James", "Maria"];
    const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Miller", "Moore", "Taylor", "Anderson", "Thomas"];
    const seatClasses = ["Economy", "Premium Economy", "Business", "First"];

    for (let i = 0; i < passengerCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const maxRows = Math.ceil(maxSeats / 6); // Estimate rows based on 6-abreast seating
      const seatRow = Math.floor(Math.random() * maxRows) + 1;
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
            fuelCapacity: aircraft.includes('A380') ? 84535 : 26020,
            engineType: "Turbofan",
            firstFlight: "N/A",
            maxTakeoffWeight: 75000,
            maxLandingWeight: 68000,
            cargoCapacity: 8.2,
            climbRate: 3000,
            length: 37.5,
            wingspan: 34.1,
            height: 12.5,
            serviceCeiling: 41000,
            cruiseSpeed: 470,
            variants: ["-700", "-800"]
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
    const newPermit = {
      id: Date.now(),
      type: permitType,
      data: formData,
      status: "SUBMITTED",
      submittedAt: new Date().toLocaleTimeString(),
      callsign: assignedCallsign || assignPilotCallsign()
    };
    
    setPermits(prev => [...prev, newPermit]);
    setActivePermitForm(null);
    
    socket.emit("chatMessage", {
      text: `${permitType} permit submitted by ${assignedCallsign}`,
      sender: "PERMITS",
      stand: selectedStand,
      airport: selectedAirport,
      timestamp: new Date().toLocaleTimeString(),
      mode: "system"
    });
  };

  const calculateWeightAndBalance = () => {
    if (!aircraftData || passengerManifest.length === 0) return null;

    const passengerWeight = passengerManifest.length * 84; // Average passenger weight in kg (84kg including carry-on)
    const baggageWeight = passengerManifest.length * 23; // Average checked baggage weight
    
    // Calculate fuel weight to ensure we stay under MTOW
    const maxTakeoffWeight = aircraftData.maxTakeoffWeight || 75000;
    const operatingEmptyWeight = aircraftData.operatingEmptyWeight || Math.round(maxTakeoffWeight * 0.55);
    
    // Calculate remaining weight capacity
    const payloadWeight = passengerWeight + baggageWeight;
    const remainingCapacity = maxTakeoffWeight - operatingEmptyWeight - payloadWeight;
    
    // Use 70-85% of remaining capacity for fuel to stay well within limits
    const fuelWeight = Math.round(remainingCapacity * (0.70 + Math.random() * 0.15));
    const cargoWeight = Math.round(Math.min(2000, remainingCapacity * 0.1)); // Small cargo load
    
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
    const cgPercentMAC = 25 + Math.random() * 8; // Keep CG between 25-33% MAC (safe range)
    
    return {
      passengerWeight,
      baggageWeight,
      fuelWeight,
      cargoWeight,
      totalWeight,
      cgPosition: cgPosition.toFixed(1),
      cgPercentMAC: cgPercentMAC.toFixed(1),
      withinLimits: true // Always within limits now
    };
  };

  const updateFlightDocument = (docType, updates) => {
    setFlightDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], ...updates }
    }));
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
                    <h3>SUBMITTED PERMITS</h3>
                    {permits.length === 0 ? (
                      <div className="no-permits">No permits submitted</div>
                    ) : (
                      permits.map(permit => (
                        <div key={permit.id} className="permit-item">
                          <div className="permit-header">
                            <span className="permit-type">{permit.type.toUpperCase()}</span>
                            <span className="permit-status">{permit.status}</span>
                          </div>
                          <div className="permit-details">
                            <span>Submitted: {permit.submittedAt}</span>
                            <span>Callsign: {permit.callsign}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          );

        case "mcdu":
          return (
            <div className="mcdu-container">
              <div className="mcdu-unit">
                <div className="mcdu-screen">
                  <div className="mcdu-header">
                    <div className="mcdu-title">{mcduDisplay.currentPage}</div>
                    <div className="mcdu-page">1/2</div>
                  </div>
                  <div className="mcdu-content">
                    {mcduDisplay.lines.map((line, index) => (
                      <div key={index} className="mcdu-line">{line}</div>
                    ))}
                  </div>
                </div>
                
                <div className="mcdu-keypad">
                  {/* Top Function Keys */}
                  <div className="mcdu-function-keys">
                    <button className="mcdu-key function" onClick={() => setMcduDisplay({
                      currentPage: "DIR",
                      lines: [
                        "DIR TO",
                        "",
                        `FROM         ${selectedAirport || "----"}`,
                        "TO           ----",
                        "",
                        "DIRECT TO",
                        "----",
                        "",
                        "DIST         ---NM",
                        "BRG          ---°",
                        "",
                        "<INDEX       INIT>"
                      ],
                      activeFunction: "DIR"
                    })}>DIR</button>
                    <button className="mcdu-key function" onClick={() => setMcduDisplay({
                      currentPage: "PROG",
                      lines: [
                        "PROGRESS      1/2",
                        "",
                        "TO DEST      ---NM",
                        "ETA          --:--",
                        "",
                        "FUEL PRED    --.-T",
                        "FUEL USED    --.-T",
                        "",
                        "WIND         ---/--",
                        "SAT          --°C",
                        "",
                        "<BRG/DIST    FUEL>"
                      ],
                      activeFunction: "PROG"
                    })}>PROG</button>
                    <button className="mcdu-key function" onClick={() => setMcduDisplay({
                      currentPage: "PERF",
                      lines: generatePerfPage(),
                      activeFunction: "PERF"
                    })}>PERF</button>
                    <button className="mcdu-key function" onClick={() => setMcduDisplay({
                      currentPage: "INIT",
                      lines: generateInitPage(),
                      activeFunction: "INIT"
                    })}>INIT</button>
                    <button className="mcdu-key function" onClick={() => setMcduDisplay({
                      currentPage: "DATA",
                      lines: [
                        "STATUS        1/5",
                        "",
                        "ENG           L+R",
                        "LEAP-1A26",
                        "",
                        "ACTIVE NAV DATABASE",
                        "AIRAC 2508  28NOV24",
                        "",
                        "SOFTWARE      STATUS",
                        "STD           OPER",
                        "",
                        "<CHG CODE     XLOAD>"
                      ],
                      activeFunction: "DATA"
                    })}>DATA</button>
                  </div>

                  {/* Line Select Keys */}
                  <div className="mcdu-line-select-keys">
                    <div className="mcdu-left-keys">
                      <button className="mcdu-key line-select">L1</button>
                      <button className="mcdu-key line-select">L2</button>
                      <button className="mcdu-key line-select">L3</button>
                      <button className="mcdu-key line-select">L4</button>
                      <button className="mcdu-key line-select">L5</button>
                      <button className="mcdu-key line-select">L6</button>
                    </div>
                    <div className="mcdu-right-keys">
                      <button className="mcdu-key line-select">R1</button>
                      <button className="mcdu-key line-select">R2</button>
                      <button className="mcdu-key line-select">R3</button>
                      <button className="mcdu-key line-select">R4</button>
                      <button className="mcdu-key line-select">R5</button>
                      <button className="mcdu-key line-select">R6</button>
                    </div>
                  </div>

                  {/* Navigation Keys */}
                  <div className="mcdu-nav-keys">
                    <button className="mcdu-key nav" onClick={() => setMcduDisplay({
                      currentPage: "F-PLN",
                      lines: generateNavPage(),
                      activeFunction: "F-PLN"
                    })}>F-PLN</button>
                    <button className="mcdu-key nav" onClick={() => setMcduDisplay({
                      currentPage: "RAD NAV",
                      lines: [
                        "RAD NAV       1/4",
                        "",
                        "VOR L        108.50",
                        "CRS          ---°",
                        "",
                        "VOR R        ------",
                        "CRS          ---°",
                        "",
                        "ADF L        ------",
                        "ADF R        ------",
                        "",
                        "<LS           LS>"
                      ],
                      activeFunction: "RAD NAV"
                    })}>RAD NAV</button>
                    <button className="mcdu-key nav" onClick={() => setMcduDisplay({
                      currentPage: "FUEL",
                      lines: [
                        "FUEL PRED     1/4",
                        "",
                        "DEST         --.-T",
                        "ALTN         --.-T",
                        "",
                        "MIN DEST     --.-T",
                        "EXTRA        --.-T",
                        "",
                        "FOB          --.-T",
                        "",
                        "",
                        "<FUEL PLANNING   >"
                      ],
                      activeFunction: "FUEL"
                    })}>FUEL PRED</button>
                    <button className="mcdu-key nav">SEC F-PLN</button>
                    <button className="mcdu-key nav">ATC COMM</button>
                    <button className="mcdu-key nav" onClick={() => setMcduDisplay({
                      currentPage: "MENU",
                      lines: [
                        "MCDU MENU     1/2",
                        "",
                        "<FMGC         REQUEST>",
                        "",
                        "<ACARS        ATSU>",
                        "",
                        "<AIDS         CFDS>",
                        "",
                        "<SYSTEM REPORT/TEST>",
                        "",
                        "",
                        "<PRINT        BITE>"
                      ],
                      activeFunction: "MENU"
                    })}>MCDU MENU</button>
                  </div>

                  {/* Letter Grid (like your image) */}
                  <div className="mcdu-letter-grid">
                    <button className="mcdu-key letter">A</button>
                    <button className="mcdu-key letter">B</button>
                    <button className="mcdu-key letter">C</button>
                    <button className="mcdu-key letter">D</button>
                    <button className="mcdu-key letter">E</button>
                    <button className="mcdu-key letter">F</button>
                    <button className="mcdu-key letter">G</button>
                    <button className="mcdu-key letter">H</button>
                    <button className="mcdu-key letter">I</button>
                    <button className="mcdu-key letter">J</button>
                    <button className="mcdu-key letter">K</button>
                    <button className="mcdu-key letter">L</button>
                    <button className="mcdu-key letter">M</button>
                    <button className="mcdu-key letter">N</button>
                    <button className="mcdu-key letter">O</button>
                    <button className="mcdu-key letter">P</button>
                    <button className="mcdu-key letter">Q</button>
                    <button className="mcdu-key letter">R</button>
                    <button className="mcdu-key letter">S</button>
                    <button className="mcdu-key letter">T</button>
                    <button className="mcdu-key letter">U</button>
                    <button className="mcdu-key letter">V</button>
                    <button className="mcdu-key letter">W</button>
                    <button className="mcdu-key letter">X</button>
                    <button className="mcdu-key letter">Y</button>
                  </div>

                  {/* Number Row */}
                  <div className="mcdu-number-row">
                    <button className="mcdu-key number">1</button>
                    <button className="mcdu-key number">2</button>
                    <button className="mcdu-key number">3</button>
                    <button className="mcdu-key number">4</button>
                    <button className="mcdu-key number">5</button>
                    <button className="mcdu-key number">6</button>
                    <button className="mcdu-key number">7</button>
                    <button className="mcdu-key number">8</button>
                    <button className="mcdu-key number">9</button>
                    <button className="mcdu-key number">0</button>
                  </div>

                  {/* Navigation Arrows */}
                  <div className="mcdu-nav-keys">
                    <button className="mcdu-key nav">←</button>
                    <button className="mcdu-key nav">↑</button>
                    <button className="mcdu-key nav">→</button>
                    <button className="mcdu-key nav">↓</button>
                  </div>

                  {/* Special Keys */}
                  <div className="mcdu-nav-keys">
                    <button className="mcdu-key special">SP</button>
                    <button className="mcdu-key special">OVFY</button>
                    <button className="mcdu-key special">CLR</button>
                  </div>

                  {/* Bottom Control Keys */}
                  <div className="mcdu-control-keys">
                    <button className="mcdu-key control">BRT</button>
                    <button className="mcdu-key control">DIM</button>
                    <button className="mcdu-key control" onClick={() => setMcduDisplay({
                      title: "MCDU",
                      lines: [
                        "MCDU MENU",
                        "",
                        "<FMGC     REQUEST>",
                        "",
                        "<ACARS    ATSU>",
                        "",
                        "<AIDS     CFDS>",
                        "",
                        "________________",
                        "",
                        "SELECT FUNCTION"
                      ],
                      activeFunction: "MENU"
                    })}>MENU</button>
                  </div>
                </div>
              </div>
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

      // Ground crew interface with operations guides
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
            <button
              className={`nav-btn ${activeTab === 'mcdu' ? 'active' : ''}`}
              onClick={() => setActiveTab('mcdu')}
            >
              <span className="nav-icon">🖥️</span>
              <span>MCDU</span>
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