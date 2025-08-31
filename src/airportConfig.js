
const airportConfigs = {
  "IRFD": {
    stands: [
      { id: "A1", type: "narrow", capacity: "narrow-body" },
      { id: "A2", type: "narrow", capacity: "narrow-body" },
      { id: "A3", type: "narrow", capacity: "narrow-body" },
      { id: "A4", type: "narrow", capacity: "narrow-body" },
      { id: "B1", type: "medium", capacity: "wide-body" },
      { id: "B2", type: "medium", capacity: "wide-body" },
      { id: "B3", type: "medium", capacity: "wide-body" },
      { id: "C1", type: "wide", capacity: "wide-body" },
      { id: "C2", type: "wide", capacity: "wide-body" },
      { id: "CARGO1", type: "cargo", capacity: "cargo" },
      { id: "CARGO2", type: "cargo", capacity: "cargo" }
    ]
  },
  "IORE": {
    stands: [
      { id: "1", type: "narrow", capacity: "narrow-body" },
      { id: "2", type: "narrow", capacity: "narrow-body" },
      { id: "3", type: "narrow", capacity: "narrow-body" },
      { id: "4", type: "narrow", capacity: "narrow-body" },
      { id: "5", type: "medium", capacity: "wide-body" },
      { id: "6", type: "medium", capacity: "wide-body" },
      { id: "7", type: "wide", capacity: "wide-body" },
      { id: "8", type: "wide", capacity: "wide-body" }
    ]
  },
  "IZOL": {
    stands: [
      { id: "Gate1", type: "narrow", capacity: "narrow-body" },
      { id: "Gate2", type: "narrow", capacity: "narrow-body" },
      { id: "Gate3", type: "narrow", capacity: "narrow-body" },
      { id: "Gate4", type: "medium", capacity: "wide-body" },
      { id: "Gate5", type: "medium", capacity: "wide-body" },
      { id: "Gate6", type: "wide", capacity: "wide-body" }
    ]
  },
  "ICYP": {
    stands: [
      { id: "Stand1", type: "narrow", capacity: "narrow-body" },
      { id: "Stand2", type: "narrow", capacity: "narrow-body" },
      { id: "Stand3", type: "narrow", capacity: "narrow-body" },
      { id: "Stand4", type: "narrow", capacity: "narrow-body" },
      { id: "Stand5", type: "medium", capacity: "wide-body" },
      { id: "Stand6", type: "medium", capacity: "wide-body" },
      { id: "Stand7", type: "wide", capacity: "wide-body" },
      { id: "CARGO1", type: "cargo", capacity: "cargo" }
    ]
  }
};

// Default configuration for airports not specifically configured
const getDefaultStands = () => [
  { id: "Gate1", type: "narrow", capacity: "narrow-body" },
  { id: "Gate2", type: "narrow", capacity: "narrow-body" },
  { id: "Gate3", type: "narrow", capacity: "narrow-body" },
  { id: "Gate4", type: "narrow", capacity: "narrow-body" },
  { id: "Gate5", type: "medium", capacity: "wide-body" },
  { id: "Gate6", type: "medium", capacity: "wide-body" },
  { id: "Gate7", type: "wide", capacity: "wide-body" },
  { id: "Gate8", type: "wide", capacity: "wide-body" }
];

export const getAirportConfig = (airportCode) => {
  return airportConfigs[airportCode] || { stands: getDefaultStands() };
};

export default airportConfigs;
