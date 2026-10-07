# Overhaul Addendum 3 — CORRECTION from David (supersedes the cap in Addendum 2)

David, 2026-10-06 ~11:07 PM CDT: do NOT cap the improvements field at 5.

In the game, a ship's improvements can exceed the displayed denominator — this is called over-improvement. A ship can legitimately show 28/5.

Required change:

- `improvements` is an integer >= 0 with NO upper limit. Remove any 0-5 validation cap if already implemented (form validation, service validation, DB CHECK, tests).
- Display stays "n / 5" (denominator is always the ship's base 5; the numerator may exceed it).
- Milestone D live round trip: create the test ship with an over-improvement value (e.g. 28) and verify it round-trips and displays as 28/5.

Everything else in Addendum 2 stands (field stored with ship_details, shown under Ship Performance).
