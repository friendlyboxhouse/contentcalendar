import type { ContentItem, KPIResults, KPITargets, MetricsSnapshot } from "@/lib/types";
import {
  calcEngagementRate,
  calcSaveRate,
  calcShareRate,
} from "@/lib/utils";

export function buildKPIResults(
  targets: KPITargets,
  final: MetricsSnapshot
): KPIResults {
  const er = calcEngagementRate(
    final.likes,
    final.comments,
    final.shares,
    final.saves,
    final.reach
  );
  const sr = calcSaveRate(final.saves, final.reach);
  const shr = calcShareRate(final.shares, final.reach);

  const results: KPIResults = {};

  const add = (
    key: string,
    target: number | undefined,
    actual: number
  ) => {
    if (target === undefined || Number.isNaN(target)) return;
    const delta = +(actual - target).toFixed(2);
    results[key] = {
      target,
      actual: +actual.toFixed(2),
      passed: actual >= target,
      delta,
    };
  };

  add("reachTarget", targets.reachTarget, final.reach);
  add("impressionTarget", targets.impressionTarget, final.impressions);
  add("engagementRateTarget", targets.engagementRateTarget, er);
  add("saveRateTarget", targets.saveRateTarget, sr);
  add("shareRateTarget", targets.shareRateTarget, shr);
  add("watchTimeTarget", targets.watchTimeTarget, final.watchTimePercent ?? 0);
  add("linkClicksTarget", targets.linkClicksTarget, final.linkClicks ?? 0);

  return results;
}

export function summarizeKPIResults(results?: KPIResults): {
  passed: number;
  total: number;
} {
  if (!results) return { passed: 0, total: 0 };
  const entries = Object.values(results);
  return {
    passed: entries.filter((e) => e.passed).length,
    total: entries.length,
  };
}

export function enrichPerformanceFromFinalMetrics(item: ContentItem): ContentItem {
  const perf = item.performance;
  const fm = perf?.finalMetrics;
  if (!perf || !fm) return item;
  const kpiResults = buildKPIResults(item.kpiTargets, fm);
  const engagementRate = calcEngagementRate(
    fm.likes,
    fm.comments,
    fm.shares,
    fm.saves,
    fm.reach
  );
  const saveRate = calcSaveRate(fm.saves, fm.reach);
  const shareRate = calcShareRate(fm.shares, fm.reach);
  return {
    ...item,
    performance: {
      ...perf,
      kpiResults,
      finalMetrics: {
        ...fm,
        engagementRate,
        saveRate,
        shareRate,
      },
    },
  };
}
