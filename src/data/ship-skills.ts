import optionalSkillsData from "./ship-skills-optional.json";
import originalSkillsData from "./ship-skills-original.json";
import type { ShipSkill } from "../types/listing";

export type ShipSkillRecord = ShipSkill & {
  icon: string;
};

function records(value: typeof originalSkillsData): ShipSkillRecord[] {
  return value.skills.map((skill) => ({ ...skill }));
}

export const ORIGINAL_SHIP_SKILLS = records(originalSkillsData);
export const OPTIONAL_SHIP_SKILLS = records(optionalSkillsData);

const skillByIconId = new Map(
  [...ORIGINAL_SHIP_SKILLS, ...OPTIONAL_SHIP_SKILLS].map((skill) => [
    skill.iconId,
    skill,
  ]),
);

export function getOriginalShipSkill(iconId: string) {
  return ORIGINAL_SHIP_SKILLS.find((skill) => skill.iconId === iconId);
}

export function getOptionalShipSkill(iconId: string) {
  return OPTIONAL_SHIP_SKILLS.find((skill) => skill.iconId === iconId);
}

export function getShipSkill(iconId: string) {
  return skillByIconId.get(iconId);
}

export function shipSkillIconUrl(iconId: string) {
  return getShipSkill(iconId)?.icon ?? `/ship-skill-icons/${iconId}.png`;
}
