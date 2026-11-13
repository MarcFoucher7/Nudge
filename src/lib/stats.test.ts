import { test } from "node:test";
import assert from "node:assert/strict";
import { startOfWeek, weekStats, suggestions, type TaskLite } from "./stats.ts";

const t = (o: Partial<TaskLite>): TaskLite => ({ id: "x", title: "T", durationMinutes: 25, mentalLoad: "MEDIUM", scheduledAt: null, completedAt: null, ...o });

test("startOfWeek tombe un lundi", () => {
  const monday = startOfWeek(new Date(2026, 10, 13, 15)); // vendredi 13 nov 2026
  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 9);
});

test("weekStats agrège par jour", () => {
  const ws = new Date(2026, 10, 9);
  const stats = weekStats([t({ scheduledAt: new Date(2026, 10, 10, 9), completedAt: new Date(2026, 10, 10, 10) }), t({ scheduledAt: new Date(2026, 10, 10, 11), durationMinutes: 50 })], ws);
  assert.equal(stats.length, 7);
  assert.equal(stats[1].planned, 75);
  assert.equal(stats[1].done, 25);
});

test("suggestions signale le retard et choisit selon l'heure", () => {
  const now = new Date(2026, 10, 13, 19);
  const s = suggestions(
    [t({ scheduledAt: new Date(2026, 10, 12, 9) }), t({ title: "Légère", mentalLoad: "LOW", scheduledAt: new Date(2026, 10, 13, 20) }), t({ title: "Dure", mentalLoad: "HIGH", scheduledAt: new Date(2026, 10, 13, 21) })],
    now,
    3,
  );
  assert.match(s[0].text, /1 tâche en retard/);
  assert.match(s.find((x) => x.href === "/timer")!.text, /Légère/);
  assert.ok(s.some((x) => /série de 3 jours/.test(x.text)));
});
