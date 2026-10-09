import { createClient } from "@supabase/supabase-js";
import { deepStrictEqual } from "node:assert/strict";

import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
} from "../src/data/ship-skills";
import { createSupabaseListingRepository } from "../src/services/listing-service";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
}

const originalSkill = ORIGINAL_SHIP_SKILLS[0];
const optionalSkills = OPTIONAL_SHIP_SKILLS.slice(1, 6);
if (!originalSkill || optionalSkills.length !== 5) {
  throw new Error("The harvested ship skill fixture data is incomplete.");
}

const shipDetails = {
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
  originalSkill: {
    name: originalSkill.name,
    iconId: originalSkill.iconId,
  },
  optionalSkills: optionalSkills.map((skill) => ({
    name: skill.name,
    iconId: skill.iconId,
  })),
};

const client = createClient(url, key);
const repository = createSupabaseListingRepository(client);
const marker = `supabase-roundtrip-${Date.now()}`;

async function listingState() {
  const listings = await repository.list({ includeExpired: true });
  return {
    count: listings.length,
    ids: new Set(listings.map((listing) => listing.id)),
  };
}

const before = await listingState();
let created;

try {
  created = await repository.create({
    title: `Supabase ship round trip ${marker}`,
    category: "ships",
    currency: "ducats",
    price: 32_000_000,
    description:
      "Temporary ship listing used to verify the complete application data path.",
    seller: "Supabase verification",
    location: "Remote test port",
    server: "Maris",
    contactNote: "Temporary verification contact.",
    imageEmoji: "🧪",
    shipDetails,
    collection: "current",
  });

  const read = await repository.get(created.id);
  if (!read) {
    throw new Error("Created ship listing could not be read back.");
  }
  try {
    deepStrictEqual(read.shipDetails, shipDetails);
  } catch {
    throw new Error(
      `Ship details did not round trip through create_listing.\nExpected: ${JSON.stringify(shipDetails)}\nReceived: ${JSON.stringify(read.shipDetails)}`,
    );
  }

  const updatedDetails = {
    ...shipDetails,
    grade: 8,
    role: "Over-improved High Speed Cargo Ship",
    improvements: 29,
    optionalSkills: shipDetails.optionalSkills.slice(0, 4),
  };
  const updated = await repository.update(created.editCode, {
    title: read.title,
    category: read.category,
    currency: read.currency,
    price: read.price,
    description: read.description,
    seller: read.seller,
    location: read.location,
    server: read.server,
    contactNote: read.contactNote,
    imageEmoji: read.imageEmoji,
    shipDetails: updatedDetails,
    collection: read.collection,
  });
  if (
    updated.shipDetails?.grade !== 8 ||
    updated.shipDetails.improvements !== 29 ||
    updated.shipDetails.optionalSkills.length !== 4
  ) {
    throw new Error("Ship details did not round trip through update_listing.");
  }

  const reread = await repository.get(created.id);
  try {
    deepStrictEqual(reread?.shipDetails, updatedDetails);
  } catch {
    throw new Error("Updated ship details could not be read back.");
  }

  console.log(
    JSON.stringify(
      {
        status: "created-read-updated-reread",
        id: created.id,
        title: read.title,
        createdImprovements: read.shipDetails?.improvements,
        createdImprovementsDisplay: `${read.shipDetails?.improvements} / 5`,
        improvements: updatedDetails.improvements,
        updatedImprovementsDisplay: `${updatedDetails.improvements} / 5`,
        optionalSkillCount: updatedDetails.optionalSkills.length,
        baselineCount: before.count,
      },
      null,
      2,
    ),
  );
} finally {
  if (created?.editCode) {
    await repository.delete(created.editCode);
  }
}

const after = await listingState();
if (
  after.count !== before.count ||
  [...after.ids].some((id) => !before.ids.has(id))
) {
  throw new Error(
    `Cleanup failed: listing counts did not return to the seed state (${before.count} -> ${after.count}).`,
  );
}

console.log(
  JSON.stringify(
    {
      status: "cleaned-up",
      beforeCount: before.count,
      afterCount: after.count,
    },
    null,
    2,
  ),
);
