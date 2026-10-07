import { describe, expect, it } from "vitest";

import statusData from "../../../src/data/ship-skill-icon-status.json";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
  shipSkillIconUrl,
} from "../../../src/data/ship-skills";

describe("ship skill data", () => {
  it("loads the complete harvested game lists without duplicate icons", () => {
    expect(ORIGINAL_SHIP_SKILLS).toHaveLength(49);
    expect(OPTIONAL_SHIP_SKILLS).toHaveLength(82);

    const iconIds = [...ORIGINAL_SHIP_SKILLS, ...OPTIONAL_SHIP_SKILLS].map(
      (skill) => skill.iconId,
    );
    expect(new Set(iconIds).size).toBe(82);
  });

  it("uses local files for successful downloads and supplied URLs for failures", () => {
    const remoteIconIds = new Set(statusData.remoteIconIds);
    for (const skill of [...ORIGINAL_SHIP_SKILLS, ...OPTIONAL_SHIP_SKILLS]) {
      const expected = remoteIconIds.has(skill.iconId)
        ? skill.icon
        : `/ship-skill-icons/${skill.iconId}.png`;
      expect(shipSkillIconUrl(skill.iconId)).toBe(expected);
    }
  });
});
