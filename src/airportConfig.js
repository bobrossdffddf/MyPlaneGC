const airportConfigs = {
  "IRFD": {
    stands: [
      // Terminal 1 Gates (1-11)
      { id: "001", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: false, busRequired: true },
      { id: "002", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: true },
      { id: "003", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: true },
      { id: "004", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: true },
      { id: "005", type: "medium", capacity: "wide-body", terminal: "Terminal 1", hasJetway: true },
      { id: "006", type: "medium", capacity: "wide-body", terminal: "Terminal 1", hasJetway: true },
      { id: "007", type: "medium", capacity: "wide-body", terminal: "Terminal 1", hasJetway: true },
      { id: "008", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: false, stairsRequired: true },
      { id: "009", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: false, stairsRequired: true },
      { id: "010", type: "narrow", capacity: "narrow-body", terminal: "Terminal 1", hasJetway: false, stairsRequired: true },
      { id: "011", type: "wide", capacity: "super-heavy", terminal: "Terminal 1", hasJetway: true, jetways: 2, a380Capable: true },

      // Terminal 2 Gates (17-20)
      { id: "017", type: "wide", capacity: "super-heavy", terminal: "Terminal 2", hasJetway: true },
      { id: "018", type: "wide", capacity: "super-heavy", terminal: "Terminal 2", hasJetway: true },
      { id: "019", type: "wide", capacity: "super-heavy", terminal: "Terminal 2", hasJetway: true },
      { id: "020", type: "wide", capacity: "super-heavy", terminal: "Terminal 2", hasJetway: true },

      // Cargo Terminal (21-23)
      { id: "021", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "022", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "023", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },

      // Helipads
      { id: "H01", type: "helipad", capacity: "helicopter", terminal: "Helipad Area" },
      { id: "H02", type: "helipad", capacity: "helicopter", terminal: "Helipad Area" }
    ]
  },
  "IPPH": {
    stands: [
      // Passenger Terminal (6 gates)
      { id: "001", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "002", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "003", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "004", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "005", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "006", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },

      // Cargo Terminal (4 spaces)
      { id: "C01", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C02", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C03", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C04", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" }
    ]
  },
  "IZOL": {
    stands: [
      // Passenger Terminal (7 gates)
      { id: "001", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "002", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "003", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "004", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "005", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "006", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },
      { id: "007", type: "wide", capacity: "super-heavy", terminal: "Passenger Terminal", hasJetway: true },

      // Cargo/Freighter Terminal (4 spaces)
      { id: "C01", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C02", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C03", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" },
      { id: "C04", type: "cargo", capacity: "cargo", terminal: "Cargo Terminal" }
    ]
  },
  "ILAR": {
    stands: [
      // Passenger Gates (8 gates)
      { id: "001", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "002", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "003", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "004", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "005", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "006", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "007", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
      { id: "008", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },

      // Cargo (2 spawners)
      { id: "C01", type: "cargo", capacity: "cargo", terminal: "Cargo Area" },
      { id: "C02", type: "cargo", capacity: "cargo", terminal: "Cargo Area" },

      // Helipads (2 spawners)
      { id: "H01", type: "helipad", capacity: "helicopter", terminal: "Helipad Area" },
      { id: "H02", type: "helipad", capacity: "helicopter", terminal: "Helipad Area" }
    ]
  },
  "IPAP": {
    stands: [
      // 5 gates, no cargo, limited aircraft types
      { id: "001", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true, restrictions: ["Boeing 747", "Boeing Dreamlifter", "Airbus A380", "Airbus A340", "Concorde"] },
      { id: "002", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true, restrictions: ["Boeing 747", "Boeing Dreamlifter", "Airbus A380", "Airbus A340", "Concorde"] },
      { id: "003", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true, restrictions: ["Boeing 747", "Boeing Dreamlifter", "Airbus A380", "Airbus A340", "Concorde"] },
      { id: "004", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true, restrictions: ["Boeing 747", "Boeing Dreamlifter", "Airbus A380", "Airbus A340", "Concorde"] },
      { id: "005", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true, restrictions: ["Boeing 747", "Boeing Dreamlifter", "Airbus A380", "Airbus A340", "Concorde"] }
    ]
  },
  "ISAU": {
    stands: [
      // 4 gates, limited aircraft (Boeing 727, Boeing 737, Airbus A320, Bombardier CRJ700, Bombardier Q400, McDonnell Douglas MD-90)
      { id: "001", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, allowedAircraft: ["Boeing 727", "Boeing 737", "Airbus A320", "Bombardier CRJ700", "Bombardier Q400", "McDonnell Douglas MD-90"] },
      { id: "002", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, allowedAircraft: ["Boeing 727", "Boeing 737", "Airbus A320", "Bombardier CRJ700", "Bombardier Q400", "McDonnell Douglas MD-90"] },
      { id: "003", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, allowedAircraft: ["Boeing 727", "Boeing 737", "Airbus A320", "Bombardier CRJ700", "Bombardier Q400", "McDonnell Douglas MD-90"] },
      { id: "004", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, allowedAircraft: ["Boeing 727", "Boeing 737", "Airbus A320", "Bombardier CRJ700", "Bombardier Q400", "McDonnell Douglas MD-90"] }
    ]
  },
  "IGRV": {
    stands: [
      // 2 spawners, no jetbridges, restricted aircraft (no 747, A380, Concorde, A340, Boeing Dreamlifter)
      { id: "001", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, restrictions: ["Boeing 747", "Airbus A380", "Concorde", "Airbus A340", "Boeing Dreamlifter"] },
      { id: "002", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, restrictions: ["Boeing 747", "Airbus A380", "Concorde", "Airbus A340", "Boeing Dreamlifter"] },
      { id: "003", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, restrictions: ["Boeing 747", "Airbus A380", "Concorde", "Airbus A340", "Boeing Dreamlifter"] },
      { id: "004", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: false, stairsRequired: true, restrictions: ["Boeing 747", "Airbus A380", "Concorde", "Airbus A340", "Boeing Dreamlifter"] }
    ]
  },
  "IIAB": {
    stands: [
      // 2 spawners - Military only (no gates)
      { id: "RAMP1", type: "military", capacity: "military", terminal: "Military Ramp", hasJetway: false, militaryOnly: true },
      { id: "RAMP2", type: "military", capacity: "military", terminal: "Military Ramp", hasJetway: false, militaryOnly: true }
    ]
  },
  "IGAR": {
    stands: [
      // 4 spawners (1 plane, 2 helicopters) - Military only (no gates)
      { id: "RAMP1", type: "military", capacity: "military", terminal: "Military Ramp", hasJetway: false, militaryOnly: true },
      { id: "HELI1", type: "helipad", capacity: "helicopter", terminal: "Helicopter Pad", militaryOnly: true },
      { id: "HELI2", type: "helipad", capacity: "helicopter", terminal: "Helicopter Pad", militaryOnly: true },
      { id: "HELI3", type: "helipad", capacity: "helicopter", terminal: "Helicopter Pad", militaryOnly: true }
    ]
  },
  "IBTH": {
    stands: [
      // 1 spawner, very limited aircraft, no gates (remove gate option)
      { id: "RWY", type: "runway", capacity: "light", terminal: "Runway Operations", hasJetway: false, allowedAircraft: ["DHC-6 Twin Otter", "Cessna 172", "Cessna 182", "Cessna Caravan", "ATR-72"] }
    ]
  }
};

// Default configuration for airports not specifically configured
const getDefaultStands = () => [
  { id: "001", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true },
  { id: "002", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true },
  { id: "003", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true },
  { id: "004", type: "narrow", capacity: "narrow-body", terminal: "Main Terminal", hasJetway: true },
  { id: "005", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
  { id: "006", type: "medium", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
  { id: "007", type: "wide", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true },
  { id: "008", type: "wide", capacity: "wide-body", terminal: "Main Terminal", hasJetway: true }
];

export const getAirportConfig = (airportCode) => {
  return airportConfigs[airportCode] || { stands: getDefaultStands() };
};

export default airportConfigs;