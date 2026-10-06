import { createClient } from "@supabase/supabase-js";

import { createSupabaseListingRepository } from "../src/services/listing-service";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
}

const client = createClient(url, key);
const repository = createSupabaseListingRepository(client);
const marker = `supabase-roundtrip-${Date.now()}`;

const created = await repository.create({
  title: `Supabase round trip ${marker}`,
  category: "services",
  price: 12345,
  description:
    "Temporary listing created through the application repository to verify Supabase persistence.",
  seller: "Supabase verification",
  location: "Remote test port",
  imageEmoji: "🧪",
  collection: "current",
});

if (!created.id || created.currency !== "gold") {
  throw new Error(
    "Created listing did not include the expected contract fields.",
  );
}

const read = await repository.get(created.id);

if (!read || read.title !== created.title || read.id !== created.id) {
  throw new Error(
    "Created listing could not be read back through the repository.",
  );
}

console.log(
  JSON.stringify(
    {
      status: "created-and-read",
      id: read.id,
      title: read.title,
      createdAt: read.createdAt,
      cleanupHint:
        "Delete this row through the Supabase MCP service connection.",
    },
    null,
    2,
  ),
);
