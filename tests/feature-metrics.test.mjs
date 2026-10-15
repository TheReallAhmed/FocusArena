import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFocusQuality,
  distractionsPerHour,
  duelWinner,
  journalStreakStats,
} from "../src/lib/feature-metrics.ts";
import { commitmentFulfillment, energyOutcomeStats, verificationStatus } from "../src/lib/accountability-metrics.ts";
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

test("commitment fulfillment excludes unresolved or cancelled rows by using resolved counts only", () => {
  assert.deepEqual(commitmentFulfillment(3, 1), { fulfilled: 3, broken: 1, resolved: 4, percentage: 75 });
  assert.deepEqual(commitmentFulfillment(0, 0), { fulfilled: 0, broken: 0, resolved: 0, percentage: null });
});

test("energy insights require a minimum sample and compare real average durations", () => {
  const rows = [
    { energyRating: 1, minutes: 20 }, { energyRating: 1, minutes: 30 }, { energyRating: 2, minutes: 40 },
    { energyRating: 4, minutes: 40 }, { energyRating: 5, minutes: 60 }, { energyRating: 5, minutes: 80 },
    { energyRating: 9, minutes: 500 }, { energyRating: null, minutes: 100 },
  ];
  const stats = energyOutcomeStats(rows, 3);
  assert.equal(stats.highVsLowRatio, 2);
  assert.equal(stats.highSample, 3);
  assert.equal(stats.lowSample, 3);
  assert.equal(stats.byEnergy[0].enoughData, false);
  assert.equal(stats.byEnergy[3].averageMinutes, 40);
  assert.equal(stats.byEnergy[3].enoughData, false);
});

test("optional proof-of-work statuses are bounded and do not treat missed checks as cheating", () => {
  assert.equal(verificationStatus(false, 0, 0), "not_enabled");
  assert.equal(verificationStatus(true, 0, 0), "unverified");
  assert.equal(verificationStatus(true, 1, 1), "verified");
  assert.equal(verificationStatus(true, 2, 1), "partially_verified");
  assert.equal(verificationStatus(true, 1, 0, true), "unavailable");
});
