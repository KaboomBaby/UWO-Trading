import { describe, expect, it } from "vitest";

import iconStatusData from "../../../src/data/ship-skill-icon-status.json";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
  getOptionalShipSkill,
  getOriginalShipSkill,
  shipSkillIconUrl,
} from "../../../src/data/ship-skills";

function getProjectRoot() {
  const nodeProcess = (globalThis as { process?: { cwd?: () => string } })
    .process;
  return nodeProcess?.cwd?.() ?? "";
}

const iconDirectory = `${getProjectRoot()}/public/ship-skill-icons/`;
const pngSignature = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type NodeFileSystem = {
  readdir(directory: string): Promise<string[]>;
  readFile(filename: string): Promise<Uint8Array>;
};

async function loadNodeFileSystem(): Promise<NodeFileSystem> {
  // The browser tsconfig intentionally omits @types/node, while Vitest supplies
  // this builtin at runtime.
  // @ts-expect-error node:fs/promises has no declaration in this tsconfig
  return import("node:fs/promises");
}

describe("ship skill icon integrity", () => {
  it("maps every unique app skill to one locally hosted Papaya icon", () => {
    expect(ORIGINAL_SHIP_SKILLS).toHaveLength(68);
    expect(OPTIONAL_SHIP_SKILLS).toHaveLength(110);
    expect(iconStatusData.source.entryCount).toBe(108);
    expect(iconStatusData.mappedSkillCount).toBe(108);
    expect(iconStatusData.unmatchedSourceNames).toHaveLength(0);
    expect(iconStatusData.sourceEntries).toHaveLength(108);

    const sourceNames = new Set(
      iconStatusData.sourceEntries.map((entry) => entry.sourceName),
    );
    expect(sourceNames.size).toBe(108);
    expect(
      iconStatusData.sourceEntries.filter(
        (entry) => entry.mappedIconId !== null,
      ),
    ).toHaveLength(108);
    expect(
      iconStatusData.sourceEntries.filter(
        (entry) => entry.mappedIconId === null,
      ),
    ).toHaveLength(0);

    const uniqueSkills = new Map(
      [...ORIGINAL_SHIP_SKILLS, ...OPTIONAL_SHIP_SKILLS].map((skill) => [
        skill.iconId,
        skill,
      ]),
    );
    expect(uniqueSkills.size).toBe(110);

    const manifestByIconId = new Map(
      iconStatusData.icons.map((icon) => [icon.iconId, icon]),
    );
    expect(manifestByIconId.size).toBe(110);
    const sourceEntryByIconId = new Map(
      iconStatusData.sourceEntries
        .filter((entry) => entry.mappedIconId !== null)
        .map((entry) => [entry.mappedIconId, entry]),
    );
    expect(sourceEntryByIconId.size).toBe(108);

    for (const [iconId, skill] of uniqueSkills) {
      const expectedPath = `/ship-skill-icons/${iconId}.png`;
      expect(skill.icon).toBe(expectedPath);
      expect(shipSkillIconUrl(iconId)).toBe(expectedPath);
      expect(skill.icon).toMatch(/^\/ship-skill-icons\/\d+\.png$/);
      expect(manifestByIconId.get(iconId)).toEqual(
        expect.objectContaining({ name: skill.name }),
      );
      const sourceEntry = sourceEntryByIconId.get(iconId);
      if (sourceEntry) {
        expect(sourceEntry).toEqual(
          expect.objectContaining({
            mappedName: skill.name,
            sourceName: manifestByIconId.get(iconId)?.sourceName,
            sourceUrl: manifestByIconId.get(iconId)?.sourceUrl,
          }),
        );
      } else {
        // Add-only alias records (Shock-Resistant Hold, Direct Hit Block)
        // carry their own icon slot for a sheet row that stays mapped to
        // the canonical app name (Earthquake-proof Hold, Direct Hit
        // Prevention); both names remain selectable.
        const aliasedEntry = iconStatusData.sourceEntries.find(
          (entry) =>
            entry.sourceName === manifestByIconId.get(iconId)?.sourceName,
        );
        expect(aliasedEntry).toBeDefined();
        expect(aliasedEntry?.mappedIconId).not.toBe(iconId);
      }
    }
  });

  it("includes the completed skill additions in both pickers", () => {
    const optionalNames = new Set(OPTIONAL_SHIP_SKILLS.map((s) => s.name));
    const originalNames = new Set(ORIGINAL_SHIP_SKILLS.map((s) => s.name));

    for (const name of [
      "Shock-Resistant Hold",
      "Detonate Fire Ship",
      "Evade Collision Attack",
      "Diversion Cannon Fire",
      "Reaction Rudder",
      "Improved Deck",
      "Direct Hit Block",
      "Fire-resistant Shipside",
      "Queen's Protection",
    ]) {
      expect(optionalNames.has(name)).toBe(true);
    }

    for (const name of [
      "Military Camouflage",
      "Reference Room",
      "Shock-Resistant Hold",
      "Sanitation Room",
      "Quality Cabin",
      "Paymaster Cabin",
      "Assault Deck Battle",
      "Watertight Bulkhead",
      "Nanban Trade Preference",
      "Detonate Fire Ship",
      "Fire-resistant Shipside",
    ]) {
      expect(originalNames.has(name)).toBe(true);
    }

    expect(getOptionalShipSkill("00002162")?.name).toBe("Queen's Protection");
    expect(getOriginalShipSkill("00002150")?.name).toBe(
      "Fire-resistant Shipside",
    );
    // The pre-existing names the add-only ruling protected are untouched.
    expect(optionalNames.has("Earthquake-proof Hold")).toBe(true);
    expect(optionalNames.has("Direct Hit Prevention")).toBe(true);
  });

  it("stores genuine nonempty 24x28 PNG files for every unique skill", async () => {
    const { readdir, readFile } = await loadNodeFileSystem();
    const expectedFiles = new Set(
      iconStatusData.icons.map((icon) => `${icon.iconId}.png`),
    );
    const actualFiles = new Set(
      (await readdir(iconDirectory)).filter((filename) =>
        filename.endsWith(".png"),
      ),
    );
    expect(actualFiles).toEqual(expectedFiles);

    for (const icon of iconStatusData.icons) {
      const bytes = await readFile(`${iconDirectory}${icon.iconId}.png`);
      const dataView = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      expect(bytes.length).toBeGreaterThan(24);
      expect(Array.from(bytes.subarray(0, 8))).toEqual(
        Array.from(pngSignature),
      );
      expect(dataView.getUint32(12)).toBe(0x49484452);
      expect(dataView.getUint32(16)).toBe(24);
      expect(dataView.getUint32(20)).toBe(28);
      expect(icon.sourceUrl).toMatch(
        /^https:\/\/lh3\.googleusercontent\.com\/docsubipk\//,
      );
    }
  });
});
