import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs } from "./ics.ts";

test("buildIcs produit un VEVENT échappé et plié", () => {
  const ics = buildIcs([{ uid: "t1", title: "Révision; vocab, J+1", description: "a".repeat(100), start: new Date(Date.UTC(2026, 10, 13, 8)), end: new Date(Date.UTC(2026, 10, 13, 8, 25)) }], new Date(Date.UTC(2026, 10, 13)));
  assert.match(ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261113T080000Z/);
  assert.match(ics, /SUMMARY:Révision\; vocab\\, J\+1/);
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75), "lignes ≤ 75");
  assert.match(ics, /UID:t1@nudge/);
});
