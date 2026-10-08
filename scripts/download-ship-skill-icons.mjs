import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const dataDirectory = path.join(projectRoot, "src", "data");
const outputDirectory = path.join(projectRoot, "public", "ship-skill-icons");

const primaryPostUrl =
  "https://uwo.papayaplay.com/uwo.do?tp=news.view&postid=5846";
const primarySheetUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBOX-vHd-PjS3ofDHCXF-d4clPgMjKvNSJbONQp-k2wZALtPKKoO86muXhJVxijyoMtfQthBQaRlzL/pubhtml?gid=1726468186&single=true&widget=false&chrome=false&headers=false&range=C2:J1500";
const harvestedAt = "2026-10-08";

// The published Sheet uses these two labels for skills already present in the
// app under their Fandom-confirmed canonical names. Every other match is exact.
const sourceNameByAppName = {
  "Direct Hit Prevention": "Direct Hit Block",
  "Earthquake-proof Hold": "Shock-Resistant Hold",
};

const fandomCanonicalNames = {
  "Direct Hit Prevention": "Direct hit prevention",
  "Earthquake-proof Hold": "Earthquake-proof Hold",
};

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'");
}

function cellText(cellHtml) {
  return decodeHtml(
    cellHtml
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .trim(),
  ).replace(/\s+/g, " ");
}

function parsePublishedSheet(html) {
  const records = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g;
  const cellPattern = /<td\b[^>]*>([\s\S]*?)<\/td>/g;
  const imagePattern =
    /https:\/\/lh3\.googleusercontent\.com\/docsubipk\/[^\s"']+/;

  for (const rowMatch of html.matchAll(rowPattern)) {
    const rowHtml = rowMatch[1];
    const image = imagePattern.exec(rowHtml)?.[0];
    if (!image) {
      continue;
    }

    const cells = [...rowHtml.matchAll(cellPattern)].map((cell) =>
      cellText(cell[1]),
    );
    const [sourceName, category] = cells.filter(Boolean);
    if (!sourceName || !category) {
      throw new Error(`Incomplete primary-source row: ${cells.join(" | ")}`);
    }

    records.push({
      sourceEntry: records.length + 1,
      sourceName,
      category,
      sourceUrl: image,
    });
  }

  return records;
}

function assertPng(bytes, sourceName) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (bytes.length <= 24 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error(`${sourceName}: response is not a nonempty PNG`);
  }
  if (bytes.readUInt32BE(12) !== 0x49484452) {
    throw new Error(`${sourceName}: PNG IHDR chunk is missing`);
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== 24 || height !== 28) {
    throw new Error(
      `${sourceName}: expected a genuine 24x28 icon, received ${width}x${height}`,
    );
  }
}

async function downloadIcon(record) {
  const response = await fetch(record.sourceUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  assertPng(bytes, record.sourceName);
  return bytes;
}

async function loadSkillData() {
  const read = async (filename) =>
    JSON.parse(await readFile(path.join(dataDirectory, filename), "utf8"));

  return Promise.all([
    read("ship-skills-original.json"),
    read("ship-skills-optional.json"),
  ]);
}

async function writeSkillData(originalData, optionalData) {
  for (const data of [originalData, optionalData]) {
    data.harvested = harvestedAt;
    data.source = primaryPostUrl;
    for (const skill of data.skills) {
      skill.icon = `/ship-skill-icons/${skill.iconId}.png`;
    }
  }

  originalData.note =
    "49 skills. This is the pool for the 1 Original skill slot on a ship listing; it is a subset of the same skill universe as the Optional list (same names and icons).";
  optionalData.note =
    "Complete list is 82 skills. Every skill uses a genuine 24x28 in-game icon harvested from Papaya Play post 5846.";

  await Promise.all([
    writeFile(
      path.join(dataDirectory, "ship-skills-original.json"),
      `${JSON.stringify(originalData, null, 2)}\n`,
    ),
    writeFile(
      path.join(dataDirectory, "ship-skills-optional.json"),
      `${JSON.stringify(optionalData, null, 2)}\n`,
    ),
  ]);
}

const [originalData, optionalData] = await loadSkillData();
const skillsByIconId = new Map();
const skillsByName = new Map();

for (const data of [originalData, optionalData]) {
  const listNames = new Set();
  const listIconIds = new Set();
  for (const skill of data.skills) {
    if (listNames.has(skill.name)) {
      throw new Error(`Duplicate ${data.list} name: ${skill.name}`);
    }
    if (listIconIds.has(skill.iconId)) {
      throw new Error(`Duplicate ${data.list} icon ID: ${skill.iconId}`);
    }
    listNames.add(skill.name);
    listIconIds.add(skill.iconId);

    const existingById = skillsByIconId.get(skill.iconId);
    if (existingById && existingById.name !== skill.name) {
      throw new Error(`Conflicting names for icon ID ${skill.iconId}`);
    }
    const existingByName = skillsByName.get(skill.name);
    if (existingByName && existingByName.iconId !== skill.iconId) {
      throw new Error(`Conflicting icon IDs for ${skill.name}`);
    }

    skillsByIconId.set(skill.iconId, skill);
    skillsByName.set(skill.name, skill);
  }
}

if (originalData.skills.length !== 49 || optionalData.skills.length !== 82) {
  throw new Error("Expected the 49 original and 82 optional skill lists");
}
if (skillsByIconId.size !== 82) {
  throw new Error(
    `Expected 82 unique app skills, found ${skillsByIconId.size}`,
  );
}

const sheetResponse = await fetch(primarySheetUrl, {
  headers: {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  },
});
if (!sheetResponse.ok) {
  throw new Error(`Unable to read primary Sheet: HTTP ${sheetResponse.status}`);
}

const sourceRecords = parsePublishedSheet(await sheetResponse.text());
if (sourceRecords.length !== 108) {
  throw new Error(
    `Expected 108 primary-source entries, found ${sourceRecords.length}`,
  );
}

const sourceRecordByName = new Map(
  sourceRecords.map((record) => [record.sourceName, record]),
);
if (sourceRecordByName.size !== sourceRecords.length) {
  throw new Error("Primary-source skill names must be unique");
}

const mappedRecords = [];
for (const [iconId, skill] of skillsByIconId) {
  const sourceName = sourceNameByAppName[skill.name] ?? skill.name;
  const sourceRecord = sourceRecordByName.get(sourceName);
  if (!sourceRecord) {
    throw new Error(`No primary-source icon for ${skill.name}`);
  }

  mappedRecords.push({
    iconId,
    name: skill.name,
    sourceName,
    sourceUrl: sourceRecord.sourceUrl,
  });
}
mappedRecords.sort((left, right) => left.iconId.localeCompare(right.iconId));

const mappedRecordBySourceName = new Map(
  mappedRecords.map((record) => [record.sourceName, record]),
);
const sourceEntries = sourceRecords.map((record) => {
  const mappedRecord = mappedRecordBySourceName.get(record.sourceName);
  return {
    sourceEntry: record.sourceEntry,
    sourceName: record.sourceName,
    category: record.category,
    sourceUrl: record.sourceUrl,
    mappedIconId: mappedRecord?.iconId ?? null,
    mappedName: mappedRecord?.name ?? null,
  };
});
const unmatchedSourceNames = sourceEntries
  .filter((entry) => entry.mappedIconId === null)
  .map((entry) => entry.sourceName);

await mkdir(outputDirectory, { recursive: true });
const expectedFiles = new Set();
const downloadsByIconId = new Map();

for (let index = 0; index < sourceRecords.length; index += 8) {
  const batch = sourceRecords.slice(index, index + 8);
  await Promise.all(
    batch.map(async (record) => {
      const bytes = await downloadIcon(record);
      const mappedRecord = mappedRecordBySourceName.get(record.sourceName);
      if (mappedRecord) {
        downloadsByIconId.set(mappedRecord.iconId, bytes);
      }
    }),
  );
}

for (const record of mappedRecords) {
  const filename = `${record.iconId}.png`;
  expectedFiles.add(filename);
  await writeFile(
    path.join(outputDirectory, filename),
    downloadsByIconId.get(record.iconId),
  );
}

for (const existing of await readdir(outputDirectory)) {
  if (existing.endsWith(".png") && !expectedFiles.has(existing)) {
    await rm(path.join(outputDirectory, existing));
  }
}

await writeSkillData(originalData, optionalData);
await writeFile(
  path.join(dataDirectory, "ship-skill-icon-status.json"),
  `${JSON.stringify(
    {
      source: {
        post: primaryPostUrl,
        sheet: primarySheetUrl,
        entryCount: sourceRecords.length,
      },
      canonicalAliases: Object.entries(sourceNameByAppName).map(
        ([appName, sourceName]) => ({
          appName,
          sourceName,
          fandomTitle: fandomCanonicalNames[appName],
        }),
      ),
      crossChecks: {
        fandomApi: "https://unchartedwaters.fandom.com/api.php",
        uwoUltimateGuides: "https://files.uwoguides.info/",
        policy:
          "validation-only; icons are sourced exclusively from Papaya Play",
      },
      harvestedAt,
      mappedSkillCount: mappedRecords.length,
      unmatchedSourceNames,
      sourceEntries,
      icons: mappedRecords,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Ship skill icons: ${mappedRecords.length} local PNGs from ${sourceRecords.length} primary entries (${unmatchedSourceNames.length} source-only entries).`,
);
