import { test } from "node:test";
import assert from "node:assert/strict";
import { findSlot, placeAll, freeSlots, at } from "./scheduling.ts";

const day = new Date(2026, 10, 12); // 12 nov 2026, 00:00 local

test("démarre aux heures de travail", () => {
  assert.equal(findSlot([], day, 25).getTime(), at(day, 9).getTime());
});

test("saute un créneau occupé et arrondit au quart d'heure", () => {
  const busy = [{ start: at(day, 9), end: new Date(at(day, 9).getTime() + 50 * 60_000) }]; // 9:00–9:50
  assert.equal(findSlot(busy, day, 25).getTime(), new Date(2026, 10, 12, 10, 0).getTime());
});

test("reporte au lendemain si la tâche dépasse la fin de journée", () => {
  const from = new Date(2026, 10, 12, 20, 50);
  assert.equal(findSlot([], from, 25).getTime(), at(new Date(2026, 10, 13), 9).getTime());
});

test("placeAll n'empile pas deux tâches sur le même créneau", () => {
  const placed = placeAll([], [
    { earliest: day, durationMinutes: 25 },
    { earliest: day, durationMinutes: 25 },
  ]);
  assert.equal(placed[0].start.getTime(), at(day, 9).getTime());
  assert.equal(placed[1].start.getTime(), new Date(2026, 10, 12, 9, 30).getTime());
});

test("freeSlots découpe la journée autour des créneaux occupés", () => {
  const busy = [{ start: new Date(2026, 10, 12, 10, 0), end: new Date(2026, 10, 12, 11, 0) }];
  const slots = freeSlots(busy, day, 1);
  assert.deepEqual(
    slots.map((s) => [s.start.getHours(), s.end.getHours()]),
    [
      [9, 10],
      [11, 21],
    ],
  );
});
