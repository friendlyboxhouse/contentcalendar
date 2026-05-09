import type {
  ContentItem,
  MetricsSnapshot,
  PerformanceData,
} from "@/lib/types";

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function reviveMetrics(raw: MetricsSnapshot): MetricsSnapshot {
  return {
    ...raw,
    recordedAt: toDate(raw.recordedAt),
  };
}

function revivePerformance(raw: PerformanceData): PerformanceData {
  return {
    ...raw,
    snapshot24h: raw.snapshot24h ? reviveMetrics(raw.snapshot24h) : undefined,
    finalMetrics: raw.finalMetrics ? reviveMetrics(raw.finalMetrics) : undefined,
  };
}

export function reviveContentItem(raw: ContentItem): ContentItem {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
    approvedAt: raw.approvedAt ? toDate(raw.approvedAt) : undefined,
    briefDeadline: toDate(raw.briefDeadline),
    productionDeadline: toDate(raw.productionDeadline),
    approvalDeadline: toDate(raw.approvalDeadline),
    publishDate: toDate(raw.publishDate),
    kpiReminderSentAt: raw.kpiReminderSentAt
      ? toDate(raw.kpiReminderSentAt)
      : undefined,
    kpiReminderSnoozedAt: raw.kpiReminderSnoozedAt
      ? toDate(raw.kpiReminderSnoozedAt)
      : undefined,
    publishedAt: raw.publishedAt ? toDate(raw.publishedAt) : undefined,
    performance: raw.performance ? revivePerformance(raw.performance) : undefined,
    approvalTrack: raw.approvalTrack?.map((r) => ({
      ...r,
      approvedAt: r.approvedAt ? toDate(r.approvedAt) : undefined,
    })),
    revisionHistory: raw.revisionHistory?.map((r) => ({
      ...r,
      date: toDate(r.date),
    })),
  };
}

export function reviveContentItems(items: ContentItem[]): ContentItem[] {
  return items.map(reviveContentItem);
}
