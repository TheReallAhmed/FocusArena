import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFocusQuality,
  distractionsPerHour,
  duelWinner,
  journalStreakStats,
} from "../src/lib/feature-metrics.ts";
import { isValidTimeZone, localDayInTimeZone } from "../src/lib/time-zones.ts";

test("focus quality v1 is deterministic and bounded", () => {
  assert.equal(calculateFocusQuality(0), 100);
  assert.equal(calculateFocusQuality(1), 88);
  assert.equal(calculateFocusQuality(8), 0);
  assert.equal(calculateFocusQuality(900), 0);
  assert.equal(calculateFocusQuality(-2), 100);
});

test("distraction rates use recorded minutes and safely handle empty durations", () => {
  assert.equal(distractionsPerHour(7, 100), 4.2);
  assert.equal(distractionsPerHour(4, 0), 0);
  assert.equal(distractionsPerHour(4, -20), 0);
});

test("duel standings break ties by rounds then minutes", () => {
  assert.equal(duelWinner({ rounds: 8, minutes: 200 }, { rounds: 7, minutes: 500 }), "a");
  assert.equal(duelWinner({ rounds: 8, minutes: 200 }, { rounds: 8, minutes: 201 }), "b");
  assert.equal(duelWinner({ rounds: 8, minutes: 200 }, { rounds: 8, minutes: 200 }), "draw");
});

test("journal streaks deduplicate dates and allow the current day to be incomplete", () => {
  assert.deepEqual(journalStreakStats(["2026-10-12", "2026-10-13", "2026-10-13", "2026-10-15"], "2026-10-15"), {
    current: 1,
    longest: 2,
  });
  assert.deepEqual(journalStreakStats(["2026-10-14"], "2026-10-15"), { current: 1, longest: 1 });
  assert.deepEqual(journalStreakStats([], "2026-10-15"), { current: 0, longest: 0 });
});

test("journal calendar dates honor IANA time zones at UTC and daylight-saving boundaries", () => {
  assert.equal(localDayInTimeZone(new Date("2026-10-15T02:00:00.000Z"), "America/Los_Angeles"), "2026-10-14");
  assert.equal(localDayInTimeZone(new Date("2026-10-15T02:00:00.000Z"), "Pacific/Kiritimati"), "2026-10-15");
  assert.equal(localDayInTimeZone(new Date("2026-03-08T07:30:00.000Z"), "America/Los_Angeles"), "2026-03-07");
  assert.equal(localDayInTimeZone(new Date("2026-03-08T08:30:00.000Z"), "America/Los_Angeles"), "2026-03-08");
  assert.equal(isValidTimeZone("America/Los_Angeles"), true);
  assert.equal(isValidTimeZone("Not/AZone"), false);
});
