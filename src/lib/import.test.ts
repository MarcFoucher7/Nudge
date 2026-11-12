import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlan, methodOf } from "./import.ts";

test("parse un JSON avec fences et commentaires", () => {
  const plan = parsePlan('```json\n{"project":"TOEIC","tasks":[{"title":"Vocab","schedule_offset_days":3 // J+3\n}]}\n```');
  assert.equal(plan.project, "TOEIC");
  assert.equal(plan.tasks[0].schedule_offset_days, 3);
  assert.equal(plan.tasks[0].duration_minutes, 25);
  assert.equal(plan.tasks[0].mental_load, "medium");
});

test("rejette un plan sans tâche", () => {
  assert.throws(() => parsePlan('{"project":"X","tasks":[]}'));
});

test("mappe la méthode", () => {
  assert.equal(methodOf("pomodoro"), "POMODORO");
  assert.equal(methodOf("Méthode des J"), "SPACED_REPETITION");
  assert.equal(methodOf("active_recall"), "ACTIVE_RECALL");
  assert.equal(methodOf(undefined), "NONE");
});
