import { describe, expect, it } from "vitest";

import iconStatusData from "../../../src/data/ship-skill-icon-status.json";
import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
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
    expect(ORIGINAL_SHIP_SKILLS).toHaveLength(49);
    expect(OPTIONAL_SHIP_SKILLS).toHaveLength(82);
    expect(iconStatusData.source.entryCount).toBe(108);
    expect(iconStatusData.mappedSkillCount).toBe(82);
    expect(iconStatusData.unmatchedSourceNames).toHaveLength(26);
    expect(iconStatusData.sourceEntries).toHaveLength(108);

    const sourceNames = new Set(
      iconStatusData.sourceEntries.map((entry) => entry.sourceName),
    );
    expect(sourceNames.size).toBe(108);
    expect(
      iconStatusData.sourceEntries.filter(
        (entry) => entry.mappedIconId !== null,
      ),
    ).toHaveLength(82);
    expect(
      iconStatusData.sourceEntries.filter(
        (entry) => entry.mappedIconId === null,
      ),
    ).toHaveLength(26);

    const uniqueSkills = new Map(
      [...ORIGINAL_SHIP_SKILLS, ...OPTIONAL_SHIP_SKILLS].map((skill) => [
        skill.iconId,
        skill,
      ]),
    );
    expect(uniqueSkills.size).toBe(82);

    const manifestByIconId = new Map(
      iconStatusData.icons.map((icon) => [icon.iconId, icon]),
    );
    expect(manifestByIconId.size).toBe(82);
    const sourceEntryByIconId = new Map(
      iconStatusData.sourceEntries
        .filter((entry) => entry.mappedIconId !== null)
        .map((entry) => [entry.mappedIconId, entry]),
    );
    expect(sourceEntryByIconId.size).toBe(82);

    for (const [iconId, skill] of uniqueSkills) {
      const expectedPath = `/ship-skill-icons/${iconId}.png`;
      expect(skill.icon).toBe(expectedPath);
      expect(shipSkillIconUrl(iconId)).toBe(expectedPath);
      expect(skill.icon).toMatch(/^\/ship-skill-icons\/\d+\.png$/);
      expect(manifestByIconId.get(iconId)).toEqual(
        expect.objectContaining({ name: skill.name }),
      );
      expect(sourceEntryByIconId.get(iconId)).toEqual(
        expect.objectContaining({
          mappedName: skill.name,
          sourceName: manifestByIconId.get(iconId)?.sourceName,
          sourceUrl: manifestByIconId.get(iconId)?.sourceUrl,
        }),
      );
    }
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
