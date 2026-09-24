import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  groupByDay,
  itemDays,
  monthGrid,
  startOfWeek,
  viewRange,
  type CalendarItem,
} from "./calendar";

function item(p: Partial<CalendarItem>): CalendarItem {
  return {
    id: "x",
    source: "bid",
    kind: "k",
    title: "t",
    start: "2026-09-24",
    end: null,
    allDay: true,
    description: null,
    location: null,
    bid: null,
    details: [],
    editable: false,
    ...p,
  };
}

test("month grid starts on Sunday and covers the whole month", () => {
  const grid = monthGrid("2026-09-15");
  assert.equal(grid.length, 6);
  assert.equal(grid[0][0], "2026-08-30"); // Sep 1 2026 is a Tuesday
  assert.ok(grid.flat().includes("2026-09-30"));
  assert.equal(new Date(2026, 7, 30).getDay(), 0);
});

test("view ranges", () => {
  assert.deepEqual(viewRange("week", "2026-09-24"), { from: "2026-09-20", to: "2026-09-26" });
  assert.deepEqual(viewRange("agenda", "2026-09-24"), { from: "2026-09-24", to: "2026-10-23" });
  assert.equal(startOfWeek("2026-09-20"), "2026-09-20");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-01");
});

test("multi-day all-day items appear on every day", () => {
  assert.deepEqual(itemDays(item({ start: "2026-09-24", end: "2026-09-26" })), ["2026-09-24", "2026-09-25", "2026-09-26"]);
  assert.deepEqual(itemDays(item({ start: "2026-09-24", end: null })), ["2026-09-24"]);
});

test("timed items land on local days; ending at midnight doesn't spill over", () => {
  const start = new Date(2026, 8, 24, 22, 0).toISOString();
  const midnight = new Date(2026, 8, 25, 0, 0).toISOString();
  const overnight = new Date(2026, 8, 25, 6, 0).toISOString();
  assert.deepEqual(itemDays(item({ allDay: false, start, end: midnight })), ["2026-09-24"]);
  assert.deepEqual(itemDays(item({ allDay: false, start, end: overnight })), ["2026-09-24", "2026-09-25"]);
});

test("groupByDay orders all-day first, then by time", () => {
  const nine = new Date(2026, 8, 24, 9, 0).toISOString();
  const eight = new Date(2026, 8, 24, 8, 0).toISOString();
  const map = groupByDay([
    item({ id: "late", allDay: false, start: nine }),
    item({ id: "allday" }),
    item({ id: "early", allDay: false, start: eight }),
  ]);
  assert.deepEqual(map.get("2026-09-24")?.map((i) => i.id), ["allday", "early", "late"]);
});
