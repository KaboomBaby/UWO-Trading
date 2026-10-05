import type { ComponentItem, MarketPort } from "../types/market";

export const mockPorts: MarketPort[] = [
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    region: "Northern Europe",
    specialties: ["Textiles", "Art", "Shipbuilding"],
    description:
      "A northern commercial hub with strong financing and reliable access to European finished goods.",
    imageEmoji: "🏛️",
    dockingCapacity: 180,
    dangerLevel: "low",
  },
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    region: "Southern Europe",
    specialties: ["Navigation instruments", "Spices", "Exploration contracts"],
    description:
      "A launch point for Atlantic routes, expedition crews, and long-range trade logistics.",
    imageEmoji: "🧭",
    dockingCapacity: 150,
    dangerLevel: "moderate",
  },
  {
    id: "port-royal",
    name: "Port Royal",
    country: "Jamaica",
    region: "Caribbean",
    specialties: ["Rum", "Sugar", "Privateering"],
    description:
      "A busy Caribbean port where high profits sit beside serious pirate risk.",
    imageEmoji: "🏴‍☠️",
    dockingCapacity: 120,
    dangerLevel: "high",
  },
  {
    id: "alexandria",
    name: "Alexandria",
    country: "Egypt",
    region: "Africa",
    specialties: ["Spices", "Papyrus", "Ancient relics"],
    description:
      "A Mediterranean-African gateway for specialty cargo and high-margin luxury goods.",
    imageEmoji: "🌴",
    dockingCapacity: 140,
    dangerLevel: "moderate",
  },
  {
    id: "malacca",
    name: "Malacca",
    country: "Malaysia",
    region: "Asia",
    specialties: ["Porcelain", "Silk", "Tea"],
    description:
      "A dense Asian trade node with strong demand for European metals and textiles.",
    imageEmoji: "🏯",
    dockingCapacity: 200,
    dangerLevel: "moderate",
  },
];

export const mockComponents: ComponentItem[] = [
  {
    id: "reinforced-mainmast",
    name: "Reinforced Mainmast",
    category: "rigging",
    rarity: "rare",
    price: 4_800_000,
    description:
      "A strengthened mainmast that improves durability on storm-prone long routes.",
    compatibleWith: ["Frigates", "Galleons"],
    imageEmoji: "⛵",
    inStock: true,
  },
  {
    id: "master-culverin-bank",
    name: "Master Culverin Bank",
    category: "armament",
    rarity: "epic",
    price: 12_600_000,
    description:
      "A matched long-range cannon bank tuned for convoy defense and merchant escorts.",
    compatibleWith: ["Merchant Galleons", "Warships"],
    imageEmoji: "💣",
    inStock: true,
  },
  {
    id: "astrological-compass",
    name: "Astrological Compass",
    category: "navigation",
    rarity: "legendary",
    price: 28_400_000,
    description:
      "A precision compass that reduces navigational uncertainty on transoceanic voyages.",
    compatibleWith: ["All ships"],
    imageEmoji: "🧭",
    inStock: false,
  },
  {
    id: "hardened-oak-plating",
    name: "Hardened Oak Plating",
    category: "armor",
    rarity: "rare",
    price: 7_900_000,
    description:
      "Treated oak plating that absorbs impact without excessively reducing cargo capacity.",
    compatibleWith: ["Trading vessels", "Frigates"],
    imageEmoji: "🛡️",
    inStock: true,
  },
  {
    id: "expanded-cargo-frame",
    name: "Expanded Cargo Frame",
    category: "cargo",
    rarity: "common",
    price: 2_300_000,
    description:
      "A practical frame extension for captains who prioritize volume over speed.",
    compatibleWith: ["Caravels", "Merchant Galleons"],
    imageEmoji: "📦",
    inStock: true,
  },
];
