# OVERHAUL ADDENDUM — from Mako, ordered by David (2026-10-06 ~3:35 PM CDT)

Applies to OVERHAUL-MISSION.md Milestone B (ship form + ship detail). Everything else in the mission stands.

## Layout requirement: mirror the game's own ship stat panel

David sent a zoomed screenshot of the game's ship detail panel (Heavy Windjammer) and ordered: "Make posting info like this picture so its easy for players to read." Players already know how to read the game's panel, so BOTH the ship posting form and the listing detail ship panel follow the game's section structure, in the game's order:

1. Header: ship name with class in parentheses — e.g. "Heavy Windjammer (Heavy)" — plus the ship type icon/visual.
2. Grade line: "Grade 0 (High Speed Cargo Ship)" — grade number + role text.
3. Ship Performance section: two rows of three icon + value cells — row 1: vertical sail, horizontal sail, row power; row 2: turn speed, wave resistance, armour. Use simple icons in the site's style (design assets, NOT game art) with a small text label on each cell so it is readable at a glance.
4. Durability: shown beside the performance section as a single value (the max the seller entered).
5. Ship Hold section: three icon + value cells — crew capacity, cannon capacity, cargo capacity.
6. NEW FIELD — Sailors Required: belongs to the Ship Hold area (the game shows "Cabin (Sailors Required: 45)"). Add `sailors_required` as a ship input, store it with the other ship details (same ship_details storage as Milestone B), and display it in the hold section of the detail panel. It is part of the round trip in Milestone D's verification.
7. Sailing Requirements section: three "Lv" cells with small type icons — adventure level, trade level, battle level.
8. Bottom line: Req. Building Days + required ship hull, and the price (the game's "Cost") = the listing's existing price/currency fields.
9. Skills section: keep Milestone C's design (icons + names, Original marked) and place it as its own section in the detail panel, after Sailing Requirements.

The posting form groups its ship inputs in these same sections in this same order, so a seller can read values straight off the game screen top-to-bottom while filling the form.

Still skipped (meaning unknown, David asked): the medal icon + "0 / 5" row in the game panel. Do not invent it.
