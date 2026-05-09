import type { ContentItem, DashboardStats } from "@/lib/types";

export function computeDashboardStats(items: ContentItem[]): DashboardStats {
  return {
    total: items.length,
    inStock: items.filter((i) =>
      ["approved", "scheduled"].includes(i.status)
    ).length,
    pendingApproval: items.filter((i) => i.status === "pending_approval").length,
    needsRework: items.filter((i) => i.status === "revision").length,
    planned: items.filter((i) =>
      ["idea", "in_brief", "in_production", "in_review"].includes(i.status)
    ).length,
    published: items.filter((i) =>
      ["published", "kpi_pending"].includes(i.status)
    ).length,
    kpiPending: items.filter((i) => i.status === "kpi_pending").length,
  };
}
