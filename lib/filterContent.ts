import type { ContentItem, PlannerFilters } from "@/lib/types";

export function filterContentItems(
  items: ContentItem[],
  f: PlannerFilters
): ContentItem[] {
  return items.filter((item) => {
    if (f.pillar && f.pillar !== "all" && item.pillar !== f.pillar) return false;
    if (
      f.platform &&
      f.platform !== "all" &&
      !item.platform.includes(f.platform)
    )
      return false;
    if (f.status && f.status !== "all" && item.status !== f.status) return false;
    if (f.format && f.format !== "all" && item.format !== f.format) return false;
    if (f.owner && f.owner !== "all" && item.owner !== f.owner) return false;
    if (
      f.funnelStage &&
      f.funnelStage !== "all" &&
      item.funnelStage !== f.funnelStage
    )
      return false;
    if (f.month && f.month !== "all") {
      const t = new Date(item.publishDate);
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
      if (key !== f.month) return false;
    }
    return true;
  });
}
