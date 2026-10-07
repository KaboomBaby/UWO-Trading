# UWO-Trading Overhaul Mission — from Mako (supervisor), ordered by David, 2026-10-06

Context: v0.2 is committed and pushed (GitHub main = 033d948, 16 commits — verified externally by Mako). David has ordered an overhaul of SHIP listings. Work in milestones, commit after each verified milestone, push at the end, plain report per milestone. Standing rules unchanged: .env git-ignored, anon/publishable key only, never service_role in app or repo, no fake data, no invented credentials. Report commit hashes copied from actual `git log` output only.

## Milestone A — Remove uploads entirely (David's security decision)

- Remove ALL image upload UI from Post a Listing: paste handler, drag-and-drop, file picker, preview. No listing may accept a user image anywhere in the app.
- Remove image upload code paths from services/repositories; listings no longer store or display user images. Keep the image_url column or drop it in a migration — your call — but the app must not reference uploads.
- The listing-images Storage bucket: leave the bucket in place; the app must not use it.
- Cards/detail no longer render uploaded images. Ship listings show the ship-type visual (Milestone B); non-ship listings keep the existing emoji visual.
- Update/remove upload tests. ESLint + tests + build green before commit.

## Milestone B — Ship posting: full game-style ship form (Ships category only)

When category = Ships, the post form gains a ship section with ALL of these seller inputs (modeled on the in-game shipbuilding screen; our own styling, not a pixel copy):

- Ship name: existing free-text name/title field (unchanged).
- Ship type selector: Battle / Trade / Adventure — each with a preset icon designed in the site's existing style. The chosen type's icon becomes the listing's visual on cards and detail.
- Ship class selector beside type: Light / Standard / Heavy.
- Grade (number) + ship role (free text, e.g. "High Speed Cargo Ship").
- Ship Performance (numbers): vertical sail, horizontal sail, row power, turn speed, wave resistance, armour.
- Durability (number, max value).
- Ship Hold capacities (numbers): crew, cannons, cargo.
- Sailing Requirements (numbers): adventure level, trade level, battle level.
- Required building days (number).
- Required ship hull (free text, e.g. "Large Flush Deck Style Hull").
- Price/currency: existing fields (the panel's Cost).
- Skills: Milestone C.
  Storage: extend the data model cleanly (e.g. a ship_details JSONB column on listings, or a companion table — your design), but it must round-trip through the create_listing / update_listing RPCs and BOTH repository implementations (Supabase + local). Migration via Supabase MCP. RLS in the same spirit: ship details publicly readable with the listing; writes only via the edit-code RPCs.
  Non-ship categories: form unchanged except Milestone A.
  Detail page: ship listings render a ship panel — type icon + type + class, grade + role, performance grid, durability, hold, sailing requirements, building days, hull, and skills with icons (Milestone C). Browse cards show type icon + type/class.

## Milestone C — Ship skills from the real game lists

Data provided in repo: src/data/ship-skills-optional.json (82 Optional skills) and src/data/ship-skills-original.json (49 Original skills), harvested from dhodb with icon URLs.

- Download all unique skill icons (union of both lists) into public/ship-skill-icons/<iconId>.png; the app references the local files. If any download fails, keep the remote URL for that skill and list it in your report.
- Ship form skill pickers (searchable selects showing icon + name):
  - 1 Original skill slot: pick from the 49-list, or none.
  - Up to 5 Optional skill slots: picks from the 82-list, or fewer/none. Any total of 0-6 skills is valid; no minimum.
  - Prevent duplicate picks within one listing.
- Store chosen skills on the listing (name + iconId is enough; resolve icons from the local data).
- Detail page and manage view show chosen skills with game icons + names, Original marked as Original.

## Milestone D — Verification + push

- Update/extend tests: no-upload form, ship form validation + round trip (local repo), skill picker limits (max 5 Optional + 1 Original, duplicates blocked), ship detail rendering.
- Full suite green: ESLint, format check, bun run test, bun run build (only the known >500 kB chunk warning is acceptable).
- Live round trip through the app's data path (extend verify:supabase or a new script): create a SHIP listing with type/class/stats/skills, read it back with skills intact, clean up the test row, confirm counts return to seed state.
- Supabase security advisor: zero lints.
- Local commits per milestone; final git push origin main; final report with REAL commit hashes copied from git log output and the push range. (Last night's fabricated hashes were caught by outside verification — report only what git prints.)

## Do NOT invent

The in-game reference screenshot shows a "Sailors Required: 45" label and a "0 / 5" row whose meanings are not yet mapped. SKIP both fields. David will clarify. For anything else ambiguous: build the specified parts and list the question in your report instead of guessing.
