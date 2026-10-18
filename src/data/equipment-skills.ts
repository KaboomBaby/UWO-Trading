import equipmentSkillsData from "./equipment-skills.json";
import type { EquipmentSkillFamily } from "../types/listing";

export type EquipmentSkillRecord = {
  name: string;
  iconId: string;
  family: EquipmentSkillFamily;
};

export const EQUIPMENT_SKILLS: EquipmentSkillRecord[] =
  equipmentSkillsData.skills.map((skill) => ({
    name: skill.name,
    iconId: skill.iconId,
    family: skill.family as EquipmentSkillFamily,
  }));

const skillByIconId = new Map(
  EQUIPMENT_SKILLS.map((skill) => [skill.iconId, skill]),
);

export function getEquipmentSkill(iconId: string) {
  return skillByIconId.get(iconId);
}

export function getEquipmentSkillsByFamily(family: EquipmentSkillFamily) {
  return EQUIPMENT_SKILLS.filter((skill) => skill.family === family);
}
