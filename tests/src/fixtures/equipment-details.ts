import type { EquipmentDetails } from "../../../src/types/listing";

// The Celestial Purple Changpao exactly as observed in-game on 2026-10-18:
// durability current (102) legitimately exceeds max (100), and its three
// skill bonuses span all three families (Adventure, Trade, Battle).
export const testEquipmentDetails: EquipmentDetails = {
  wearer: "male",
  durabilityCurrent: 102,
  durabilityMax: 100,
  formality: 20,
  attackPower: 55,
  defencePower: 110,
  skillBonuses: [
    { name: "Navigation", iconId: "skill_navigation", value: 3 },
    {
      name: "Management Technique",
      iconId: "skill_management_skill",
      value: 3,
    },
    { name: "Arms", iconId: "skill_arms", value: 3 },
  ],
  effects: [{ name: "Reduce Supply Consumption", rank: 8 }],
};

// The Battle-Hardened Horn Bow exactly as observed in-game on 2026-10-18.
export const testWeaponDetails: EquipmentDetails = {
  durabilityCurrent: 130,
  durabilityMax: 100,
  formality: 20,
  attackPower: 142,
  defencePower: 40,
  skillBonuses: [
    { name: "Sniping", iconId: "skill_sniping", value: 4 },
    { name: "Bow Attack", iconId: "skill_bow_attack", value: 3 },
    { name: "Assault", iconId: "skill_assault", value: 3 },
  ],
  weaponCategory: "Bow",
  effects: [{ name: "Melee Battle Power Up", rank: 9 }],
};
