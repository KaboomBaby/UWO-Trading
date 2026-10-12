import { createClient } from "@supabase/supabase-js";
import { deepStrictEqual } from "node:assert/strict";

import {
  OPTIONAL_SHIP_SKILLS,
  ORIGINAL_SHIP_SKILLS,
} from "../src/data/ship-skills";
import { createSupabaseListingRepository } from "../src/services/listing-service";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const testEmail = process.env.SUPABASE_TEST_EMAIL;
const testPassword = process.env.SUPABASE_TEST_PASSWORD;

if (!url || !key) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
}

if (!testEmail || !testPassword) {
  throw new Error(
    "SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD are required for the owner-account round trip.",
  );
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

async function signInForVerification() {
  const { data, error } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    const isUnconfirmedEmail =
      error.code === "email_not_confirmed" ||
      /email not confirmed/i.test(error.message);

    throw new Error(
      isUnconfirmedEmail
        ? `SUPABASE_TEST_EMAIL (${testEmail}) has not confirmed its email address. Confirm the test account before running this verification.`
        : `Unable to sign in as ${testEmail}: ${error.message}`,
    );
  }

  if (!data.session?.user.id) {
    throw new Error(
      `Supabase returned an incomplete session for ${testEmail}; no user id was available.`,
    );
  }

  return data.session;
}

async function listingState() {
  const listings = await repository.list({ includeExpired: true });
  return {
    count: listings.length,
    ids: new Set(listings.map((listing) => listing.id)),
  };
}

const initialSession = await signInForVerification();
const ownerId = initialSession.user.id;
const before = await listingState();
let created;
let isDeleted = false;
let primaryError = null;

try {
  created = await repository.create({
    title: `Supabase owner-account round trip ${marker}`,
    category: "ships",
    currency: "ducats",
    price: 32_000_000,
    description:
      "Temporary owned listing used to verify the complete account data path.",
    seller: "Supabase verification",
    location: "Remote test port",
    server: "Maris",
    contactNote: "Temporary verification contact.",
    imageEmoji: "🧪",
    shipDetails,
    collection: "current",
  });

  if (created.ownerId !== ownerId) {
    throw new Error(
      `create_owned_listing returned the wrong owner. Expected ${ownerId}; received ${String(created.ownerId)}.`,
    );
  }
  if (created.editCode !== undefined) {
    throw new Error(
      `create_owned_listing unexpectedly returned an edit code (${created.editCode}).`,
    );
  }

  const read = await repository.get(created.id);
  if (!read) {
    throw new Error("Created owned listing could not be read publicly.");
  }
  try {
    deepStrictEqual(read.shipDetails, shipDetails);
  } catch {
    throw new Error(
      `Ship details did not round trip through create_owned_listing.\nExpected: ${JSON.stringify(shipDetails)}\nReceived: ${JSON.stringify(read.shipDetails)}`,
    );
  }

  const ownedListings = await repository.listOwned(ownerId);
  const ownedListing = ownedListings.find(
    (listing) => listing.id === created.id,
  );
  if (!ownedListing || ownedListing.ownerId !== ownerId) {
    throw new Error(
      "listOwned did not return the newly created listing with the signed-in owner id.",
    );
  }

  const updatedDetails = {
    ...shipDetails,
    grade: 8,
    role: "Over-improved High Speed Cargo Ship",
    improvements: 29,
    optionalSkills: shipDetails.optionalSkills.slice(0, 4),
  };
  const updated = await repository.updateOwned(created.id, ownerId, {
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
    throw new Error("Ship details did not round trip through updateOwned.");
  }

  const reread = await repository.get(created.id);
  try {
    deepStrictEqual(reread?.shipDetails, updatedDetails);
  } catch {
    throw new Error("Updated ship details could not be read back.");
  }

  const soldListing = await repository.markSoldOwned(created.id, ownerId);
  if (!soldListing.soldAt) {
    throw new Error("markSoldOwned did not set a sold timestamp.");
  }

  const renewedListing = await repository.renewOwned(created.id, ownerId);
  if (
    new Date(renewedListing.expiresAt).getTime() <=
    new Date(soldListing.expiresAt).getTime()
  ) {
    throw new Error("renewOwned did not extend the listing expiry.");
  }

  const signedOut = await client.auth.signOut();
  if (signedOut.error) {
    throw new Error(
      `Unable to sign out before the anonymous offer: ${signedOut.error.message}`,
    );
  }

  await repository.createOffer(created.id, {
    offererName: "Anonymous Roundtrip Buyer",
    contact: "",
    currency: "ducats",
    amount: 31_000_000,
    offerText: "Anonymous verification offer with a complete owner path.",
  });

  const signedBackIn = await signInForVerification();
  if (signedBackIn.user.id !== ownerId) {
    throw new Error(
      "Signing back in changed the test account user id; refusing to manage the listing with a different owner.",
    );
  }

  const offers = await repository.listOffersOwned(ownerId, created.id);
  const offer = offers.find((item) => item.listingId === created.id);
  if (!offer || offers.some((item) => item.listingId !== created.id)) {
    throw new Error(
      "listOffersOwned did not return only offers for the owned listing.",
    );
  }

  const acceptedOffer = await repository.acceptOwnedOffer(
    ownerId,
    created.id,
    offer.id,
  );
  if (acceptedOffer.status !== "accepted") {
    throw new Error(
      `acceptOwnedOffer returned status ${acceptedOffer.status} instead of accepted.`,
    );
  }

  await repository.report(created.id, {
    reporterName: "Roundtrip Reporter",
    reason: "other",
    details: "Temporary report used to verify the public reporting path.",
  });

  await repository.deleteOwned(created.id, ownerId);
  isDeleted = true;
  if (await repository.get(created.id)) {
    throw new Error("Deleted listing was still publicly readable.");
  }

  console.log(
    JSON.stringify(
      {
        status: "owner-account-roundtrip-complete",
        id: created.id,
        ownerId,
        title: read.title,
        createdImprovements: read.shipDetails?.improvements,
        createdImprovementsDisplay: `${read.shipDetails?.improvements} / 5`,
        improvements: updatedDetails.improvements,
        updatedImprovementsDisplay: `${updatedDetails.improvements} / 5`,
        optionalSkillCount: updatedDetails.optionalSkills.length,
        acceptedOfferId: acceptedOffer.id,
        renewedExpiresAt: renewedListing.expiresAt,
        baselineCount: before.count,
      },
      null,
      2,
    ),
  );
} catch (error) {
  primaryError = error;
} finally {
  if (created && !isDeleted) {
    const { data } = await client.auth.getSession();
    if (data.session?.user.id !== ownerId) {
      await signInForVerification();
    }
    await repository.deleteOwned(created.id, ownerId);
    isDeleted = true;
  }
}

if (primaryError) throw primaryError;

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
