import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const dataDirectory = path.join(projectRoot, "src", "data");
const outputDirectory = path.join(projectRoot, "public", "ship-skill-icons");

const [originalData, optionalData] = await Promise.all([
  readFile(path.join(dataDirectory, "ship-skills-original.json"), "utf8"),
  readFile(path.join(dataDirectory, "ship-skills-optional.json"), "utf8"),
]).then((values) => values.map((value) => JSON.parse(value)));

const iconsById = new Map();
for (const skill of [...originalData.skills, ...optionalData.skills]) {
  const existing = iconsById.get(skill.iconId);
  if (existing !== undefined && existing !== skill.icon) {
    throw new Error(`Conflicting icon URLs for ${skill.iconId}`);
  }
  iconsById.set(skill.iconId, skill.icon);
}

await mkdir(outputDirectory, { recursive: true });
const localIconIds = [];
const remoteIconIds = [];
const failures = [];

for (const [iconId, iconUrl] of iconsById) {
  const destination = path.join(outputDirectory, `${iconId}.png`);
  try {
    const response = await fetch(iconUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
        Referer: "http://eversong.ivyro.net/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
      throw new Error("Response is not a nonempty PNG");
    }

    await writeFile(destination, bytes);
    localIconIds.push(iconId);
  } catch (error) {
    remoteIconIds.push(iconId);
    failures.push({ iconId, iconUrl, reason: String(error) });
  }
}

remoteIconIds.sort();
localIconIds.sort();
await writeFile(
  path.join(dataDirectory, "ship-skill-icon-status.json"),
  `${JSON.stringify({ localIconIds, remoteIconIds }, null, 2)}\n`,
);

console.log(
  `Ship skill icons: ${localIconIds.length} local, ${remoteIconIds.length} remote fallback.`,
);
for (const failure of failures) {
  console.log(`${failure.iconId}: ${failure.reason} (${failure.iconUrl})`);
}
