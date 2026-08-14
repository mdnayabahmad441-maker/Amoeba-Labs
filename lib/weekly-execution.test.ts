import assert from "node:assert/strict";
import test from "node:test";
import { checklistDatePermissions, executionMetrics, indiaDateKey, mondayOf, moveDateKey, parseWeeklyExecutionCsv } from "./weekly-execution.ts";

test("weeks always run Monday through Sunday", () => {
  assert.equal(mondayOf("2026-07-30"), "2026-07-27");
  assert.equal(moveDateKey(mondayOf("2026-07-30"), 6), "2026-08-02");
  assert.equal(mondayOf("2027-01-01"), "2026-12-28");
});

test("Asia/Kolkata midnight uses the correct local day", () => {
  assert.equal(indiaDateKey(new Date("2026-07-30T18:29:59Z")), "2026-07-30");
  assert.equal(indiaDateKey(new Date("2026-07-30T18:30:00Z")), "2026-07-31");
});

test("only scheduled applicable cells enter completion calculations", () => {
  const metrics = executionMetrics([
    { execution_date: "2026-07-27", is_scheduled: true, is_completed: true, is_not_applicable: false },
    { execution_date: "2026-07-27", is_scheduled: true, is_completed: false, is_not_applicable: false },
    { execution_date: "2026-07-27", is_scheduled: false, is_completed: false, is_not_applicable: false },
    { execution_date: "2026-07-27", is_scheduled: true, is_completed: false, is_not_applicable: true },
  ], "2026-07-27");
  assert.deepEqual(metrics, {
    scheduled: 2, completed: 1, percentage: 50, topThreeCompleted: 0, topThreeTotal: 0,
  });
});

test("Top 3 is counted per scheduled execution cell", () => {
  const metrics = executionMetrics([
    { execution_date: "2026-07-27", is_scheduled: true, is_completed: true, is_not_applicable: false, is_top_three: true },
    { execution_date: "2026-07-27", is_scheduled: true, is_completed: false, is_not_applicable: false, is_top_three: true },
  ]);
  assert.equal(metrics.topThreeCompleted, 1);
  assert.equal(metrics.topThreeTotal, 2);
});

test("past days are read-only and future days cannot be completed", () => {
  assert.deepEqual(checklistDatePermissions("2026-07-29", "2026-07-30"), {
    canEdit: false, canComplete: false, isReadOnlyPast: true, isPlannedFuture: false,
  });
  assert.equal(checklistDatePermissions("2026-07-30", "2026-07-30").canComplete, true);
  assert.deepEqual(checklistDatePermissions("2026-07-31", "2026-07-30"), {
    canEdit: true, canComplete: false, isReadOnlyPast: false, isPlannedFuture: true,
  });
});

test("weekly CSV imports targets, days and recurring scope", () => {
  const rows = parseWeeklyExecutionCsv(
    "Task Name,Category,Priority,Target Value,Unit,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday,Repeat Future Weeks\n" +
    "\"Call qualified leads\",Sales,Critical,5,Calls,Yes,,,,,X,,Yes",
  );
  assert.deepEqual(rows[0], {
    name: "Call qualified leads", category: "Sales", priority: "Critical",
    target_value: "5", unit: "Calls", weekdays: [1, 6], repeat_future: true,
  });
});
