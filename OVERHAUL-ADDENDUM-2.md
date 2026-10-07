# OVERHAUL ADDENDUM 2 — from Mako, ordered by David (2026-10-06 ~3:42 PM CDT)

Supplements OVERHAUL-MISSION.md and OVERHAUL-ADDENDUM.md (Milestone B).

## Improvements field — the medal "0 / 5" row is now identified

David identified the medal row under Ship Performance in the game panel: it is the ship's NUMBER OF IMPROVEMENTS, out of a maximum of 5 (the pictured ship has 0). The do-not-invent skip from the mission/addendum is lifted for this row:

- Add `improvements` as a ship input: integer, 0 to 5 (validate the range).
- Store it with the other ship details (same ship_details storage as Milestone B), round-tripped through both repositories and the create/update RPCs like every other ship field.
- Display it in the listing ship panel at the game's position — directly under the Ship Performance grid — as "n / 5" with a small medal-style icon in the site's style (design asset, not game art) and an "Improvements" label.
- Include it in Milestone D's ship round trip: create the test ship listing with a non-zero improvements value, read it back, confirm it survived.

With this, every field in the game's detail panel is mapped. Nothing else changes.
