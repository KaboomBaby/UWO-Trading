import type { ShipDetails } from "../../../src/types/listing";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
} from "../../../src/data/ship-skills";

export const testShipDetails: ShipDetails = {
  type: "trade",
  shipClass: "heavy",
  grade: 7,
  role: "High Speed Cargo Ship",
  performance: {
    verticalSail: 180,
    horizontalSail: 420,
    rowPower: 40,
    turnSpeed: 18,
    waveResistance: 72,
    armour: 96,
  },
  improvements: 28,
  durability: 500,
  hold: {
    crew: 180,
    cannons: 120,
    cargo: 950,
    sailorsRequired: 45,
  },
  sailingRequirements: {
    adventureLevel: 42,
    tradeLevel: 61,
    battleLevel: 27,
  },
  buildingDays: 28,
  requiredHull: "Large Flush Deck Style Hull",
  originalSkill: null,
  optionalSkills: [],
};

export const testShipDetailsWithSkills: ShipDetails = {
  ...testShipDetails,
  originalSkill: ORIGINAL_SHIP_SKILLS[0],
  optionalSkills: OPTIONAL_SHIP_SKILLS.slice(1, 6),
};
