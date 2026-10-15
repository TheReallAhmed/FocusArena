export type EnergySession = { energyRating: number | null; minutes: number; focusQuality?: number | null };

export function commitmentFulfillment(fulfilled: number, broken: number) {
  const safeFulfilled = Math.max(0, Math.trunc(fulfilled));
  const safeBroken = Math.max(0, Math.trunc(broken));
  const resolved = safeFulfilled + safeBroken;
  return {
    fulfilled: safeFulfilled,
    broken: safeBroken,
    resolved,
    percentage: resolved ? Math.round((safeFulfilled / resolved) * 100) : null,
  };
}

export function energyOutcomeStats(rows: EnergySession[], minimumSample = 3) {
  const buckets = new Map<number, { count: number; totalMinutes: number; qualityTotal: number; qualityCount: number }>();
  for (const row of rows) {
    if (!Number.isInteger(row.energyRating) || (row.energyRating ?? 0) < 1 || (row.energyRating ?? 0) > 5) continue;
    const bucket = buckets.get(row.energyRating!) ?? { count: 0, totalMinutes: 0, qualityTotal: 0, qualityCount: 0 };
    bucket.count += 1;
    bucket.totalMinutes += Math.max(0, Number(row.minutes) || 0);
    if (Number.isFinite(row.focusQuality)) { bucket.qualityTotal += Number(row.focusQuality); bucket.qualityCount += 1; }
    buckets.set(row.energyRating!, bucket);
  }
  const byEnergy = [1, 2, 3, 4, 5].map((rating) => {
    const item = buckets.get(rating) ?? { count: 0, totalMinutes: 0, qualityTotal: 0, qualityCount: 0 };
    return {
      rating,
      count: item.count,
      averageMinutes: item.count ? Math.round((item.totalMinutes / item.count) * 10) / 10 : null,
      averageQuality: item.qualityCount ? Math.round(item.qualityTotal / item.qualityCount) : null,
      enoughData: item.count >= minimumSample,
    };
  });
  const low = [1, 2].map((n) => byEnergy[n - 1]).filter((x) => x.count > 0);
  const high = [4, 5].map((n) => byEnergy[n - 1]).filter((x) => x.count > 0);
  const lowCount = low.reduce((sum, item) => sum + item.count, 0);
  const highCount = high.reduce((sum, item) => sum + item.count, 0);
  const lowMinutes = low.reduce((sum, item) => sum + (item.averageMinutes ?? 0) * item.count, 0);
  const highMinutes = high.reduce((sum, item) => sum + (item.averageMinutes ?? 0) * item.count, 0);
  const comparisonAvailable = lowCount >= minimumSample && highCount >= minimumSample && lowMinutes > 0;
  return {
    byEnergy,
    highVsLowRatio: comparisonAvailable ? Math.round((highMinutes / highCount / (lowMinutes / lowCount)) * 100) / 100 : null,
    highSample: highCount,
    lowSample: lowCount,
    minimumSample,
  };
}

export function verificationStatus(enabled: boolean, scheduled: number, answered: number, technicalFailure = false) {
  if (!enabled) return "not_enabled" as const;
  if (technicalFailure) return "unavailable" as const;
  if (scheduled <= 0 || answered <= 0) return "unverified" as const;
  return answered >= scheduled ? "verified" as const : "partially_verified" as const;
}
