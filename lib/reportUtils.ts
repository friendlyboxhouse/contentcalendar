import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type {
  ContentFormat,
  ContentItem,
  ContentPillar,
  ContentStatus,
} from "@/lib/types";
import { calcEngagementRate, calcSaveRate, calcShareRate } from "@/lib/utils";
import { summarizeKPIResults } from "@/lib/kpi";
import { PILLAR_CONFIG } from "@/lib/constants";
import {
  CONTENT_FORMATS_ALL,
  CONTENT_STATUSES_ORDERED,
  PILLAR_KEYS,
} from "@/lib/reportConstants";

/** จันทร์–อาทิตย์ (weekStartsOn: 1) */
export function getWeeklyItems(
  items: ContentItem[],
  weekStart: Date
): ContentItem[] {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  return items.filter((item) =>
    isWithinInterval(new Date(item.publishDate), { start, end })
  );
}

/** month = 1–12 */
export function getMonthlyItems(
  items: ContentItem[],
  year: number,
  month: number
): ContentItem[] {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return items.filter((item) =>
    isWithinInterval(new Date(item.publishDate), { start, end })
  );
}

function emptyByStatus(): Record<ContentStatus, number> {
  const o = {} as Record<ContentStatus, number>;
  for (const s of CONTENT_STATUSES_ORDERED) o[s] = 0;
  return o;
}

export function aggregateStats(items: ContentItem[]): {
  total: number;
  published: number;
  scheduled: number;
  pendingApproval: number;
  inProduction: number;
  needsRework: number;
  planned: number;
  kpiPending: number;
  byPillar: Record<ContentPillar, number>;
  byFormat: Record<ContentFormat, number>;
  byStatus: Record<ContentStatus, number>;
  byPlatform: Record<string, number>;
} {
  const byPillar = {} as Record<ContentPillar, number>;
  PILLAR_KEYS.forEach((p) => {
    byPillar[p] = 0;
  });
  const byFormat = {} as Record<ContentFormat, number>;
  CONTENT_FORMATS_ALL.forEach((f) => {
    byFormat[f] = 0;
  });
  const byStatus = emptyByStatus();
  const byPlatform: Record<string, number> = {};

  for (const item of items) {
    byPillar[item.pillar]++;
    byFormat[item.format]++;
    byStatus[item.status]++;
    item.platform.forEach((pl) => {
      byPlatform[pl] = (byPlatform[pl] ?? 0) + 1;
    });
  }

  return {
    total: items.length,
    published: items.filter((i) => i.status === "published").length,
    scheduled: items.filter((i) => i.status === "scheduled").length,
    pendingApproval: items.filter((i) => i.status === "pending_approval")
      .length,
    inProduction: items.filter((i) => i.status === "in_production").length,
    needsRework: items.filter((i) => i.status === "revision").length,
    planned: items.filter((i) =>
      ["idea", "in_brief", "in_production", "in_review"].includes(i.status)
    ).length,
    kpiPending: items.filter((i) => i.status === "kpi_pending").length,
    byPillar,
    byFormat,
    byStatus,
    byPlatform,
  };
}

function engagementFromSnapshot(item: ContentItem): number | null {
  const fm = item.performance?.finalMetrics ?? item.performance?.snapshot24h;
  if (!fm) return null;
  return calcEngagementRate(
    fm.likes,
    fm.comments,
    fm.shares,
    fm.saves,
    fm.reach
  );
}

export function aggregatePerformance(items: ContentItem[]): {
  avgEngagementRate: number;
  avgSaveRate: number;
  avgShareRate: number;
  avgWatchTime: number;
  totalReach: number;
  totalSaves: number;
  kpiPassRate: number;
  topPost: ContentItem | null;
  worstPost: ContentItem | null;
  byPillar: Record<
    ContentPillar,
    { avgEngagementRate: number; kpiPassRate: number; count: number }
  >;
  byFormat: Record<
    ContentFormat,
    { avgEngagementRate: number; count: number }
  >;
} {
  const withPerf = items.filter(
    (i) => i.performance?.finalMetrics ?? i.performance?.snapshot24h
  );

  let sumEr = 0;
  let sumSr = 0;
  let sumShr = 0;
  let sumWt = 0;
  let totalReach = 0;
  let totalSaves = 0;
  let erCount = 0;

  let topPost: ContentItem | null = null;
  let worstPost: ContentItem | null = null;
  let topEr = -1;
  let worstEr = 999;

  let kpiPassed = 0;
  let kpiTotal = 0;

  const pillarAgg: Record<
    ContentPillar,
    { erSum: number; n: number; kpiPass: number; kpiTot: number }
  > = {} as Record<
    ContentPillar,
    { erSum: number; n: number; kpiPass: number; kpiTot: number }
  >;
  PILLAR_KEYS.forEach((p) => {
    pillarAgg[p] = { erSum: 0, n: 0, kpiPass: 0, kpiTot: 0 };
  });

  const formatAgg: Record<
    ContentFormat,
    { erSum: number; n: number }
  > = {} as Record<ContentFormat, { erSum: number; n: number }>;
  CONTENT_FORMATS_ALL.forEach((f) => {
    formatAgg[f] = { erSum: 0, n: 0 };
  });

  for (const item of withPerf) {
    const fm = item.performance!.finalMetrics ?? item.performance!.snapshot24h!;
    const er = calcEngagementRate(
      fm.likes,
      fm.comments,
      fm.shares,
      fm.saves,
      fm.reach
    );
    const sr = calcSaveRate(fm.saves, fm.reach);
    const shr = calcShareRate(fm.shares, fm.reach);

    sumEr += er;
    sumSr += sr;
    sumShr += shr;
    sumWt += fm.watchTimePercent ?? 0;
    totalReach += fm.reach;
    totalSaves += fm.saves;
    erCount++;

    if (er > topEr) {
      topEr = er;
      topPost = item;
    }
    if (er < worstEr) {
      worstEr = er;
      worstPost = item;
    }

    const kp = summarizeKPIResults(item.performance?.kpiResults);
    kpiPassed += kp.passed;
    kpiTotal += kp.total;

    pillarAgg[item.pillar].erSum += er;
    pillarAgg[item.pillar].n++;
    pillarAgg[item.pillar].kpiPass += kp.passed;
    pillarAgg[item.pillar].kpiTot += kp.total;

    formatAgg[item.format].erSum += er;
    formatAgg[item.format].n++;
  }

  const byPillar = {} as Record<
    ContentPillar,
    { avgEngagementRate: number; kpiPassRate: number; count: number }
  >;
  PILLAR_KEYS.forEach((p) => {
    const a = pillarAgg[p];
    byPillar[p] = {
      avgEngagementRate: a.n ? a.erSum / a.n : 0,
      kpiPassRate: a.kpiTot ? (100 * a.kpiPass) / a.kpiTot : 0,
      count: a.n,
    };
  });

  const byFormat = {} as Record<
    ContentFormat,
    { avgEngagementRate: number; count: number }
  >;
  CONTENT_FORMATS_ALL.forEach((f) => {
    const a = formatAgg[f];
    byFormat[f] = {
      avgEngagementRate: a.n ? a.erSum / a.n : 0,
      count: a.n,
    };
  });

  return {
    avgEngagementRate: erCount ? sumEr / erCount : 0,
    avgSaveRate: erCount ? sumSr / erCount : 0,
    avgShareRate: erCount ? sumShr / erCount : 0,
    avgWatchTime: erCount ? sumWt / erCount : 0,
    totalReach,
    totalSaves,
    kpiPassRate: kpiTotal ? (100 * kpiPassed) / kpiTotal : 0,
    topPost,
    worstPost: worstPost && erCount > 1 ? worstPost : null,
    byPillar,
    byFormat,
  };
}

function isPublishedLike(status: ContentStatus): boolean {
  return status === "published" || status === "kpi_pending";
}

/** publishDate เป็นจุดอ้างอิงหลัก */
export function getAtRiskItems(items: ContentItem[]): {
  overdue: ContentItem[];
  critical: ContentItem[];
  warning: ContentItem[];
} {
  const now = startOfDay(new Date());
  const overdue: ContentItem[] = [];
  const critical: ContentItem[] = [];
  const warning: ContentItem[] = [];

  for (const item of items) {
    if (isPublishedLike(item.status)) continue;
    const pub = startOfDay(new Date(item.publishDate));
    const diffMs = pub.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (86400000));

    if (diffDays < 0) {
      overdue.push(item);
    } else if (diffDays <= 1) {
      critical.push(item);
    } else if (diffDays <= 3) {
      warning.push(item);
    }
  }

  return { overdue, critical, warning };
}

export function getTopPosts(items: ContentItem[], n: number): ContentItem[] {
  const ranked = [...items]
    .map((item) => ({ item, er: engagementFromSnapshot(item) }))
    .filter((x) => x.er !== null)
    .sort((a, b) => (b.er ?? 0) - (a.er ?? 0));
  return ranked.slice(0, n).map((x) => x.item);
}

export function generateRecommendations(
  stats: ReturnType<typeof aggregateStats>,
  perf: ReturnType<typeof aggregatePerformance>
): string[] {
  const recs: string[] = [];

  PILLAR_KEYS.forEach((p) => {
    if (stats.byPillar[p] === 0) {
      recs.push(`Add content for ${PILLAR_CONFIG[p].label}`);
    }
  });

  if (perf.kpiPassRate < 50 && perf.kpiPassRate > 0) {
    recs.push("Review content strategy for low KPIs");
  }

  if (stats.needsRework > 3) {
    recs.push("High revision rate — review Brief quality");
  }

  if (stats.pendingApproval > 5) {
    recs.push("Approval bottleneck detected");
  }

  let bestPillar: ContentPillar | null = null;
  let bestEr = -1;
  PILLAR_KEYS.forEach((p) => {
    const row = perf.byPillar[p];
    if (row.count > 0 && row.avgEngagementRate > bestEr) {
      bestEr = row.avgEngagementRate;
      bestPillar = p;
    }
  });
  if (bestPillar !== null && bestEr > 0) {
    const pillarKey = bestPillar as keyof typeof PILLAR_CONFIG;
    recs.push(`Double down on ${PILLAR_CONFIG[pillarKey].label} content`);
  }

  if (recs.length === 0) {
    recs.push("Maintain publishing cadence and KPI discipline");
  }

  return recs.slice(0, 5);
}

export function formatReachK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** สำหรับตาราง workload */
export function aggregateWorkloadByOwner(items: ContentItem[]): Array<{
  owner: string;
  count: number;
  byStatus: Partial<Record<ContentStatus, number>>;
}> {
  const map = new Map<
    string,
    { count: number; byStatus: Partial<Record<ContentStatus, number>> }
  >();
  for (const item of items) {
    const o = item.owner || "(ไม่ระบุ)";
    const cur = map.get(o) ?? { count: 0, byStatus: {} };
    cur.count++;
    cur.byStatus[item.status] = (cur.byStatus[item.status] ?? 0) + 1;
    map.set(o, cur);
  }
  return Array.from(map.entries())
    .map(([owner, v]) => ({ owner, ...v }))
    .sort((a, b) => b.count - a.count);
}
