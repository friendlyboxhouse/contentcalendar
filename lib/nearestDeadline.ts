import type { ContentItem } from "@/lib/types";

export function getNearestDeadline(
  item: ContentItem,
  options?: { includeProduction?: boolean }
): { label: string; date: Date } {
  const includeProduction = options?.includeProduction ?? false;
  const now = Date.now();
  const candidates: { label: string; date: Date }[] = [
    { label: "บรีฟ", date: new Date(item.briefDeadline) },
    { label: "อนุมัติ", date: new Date(item.approvalDeadline) },
    { label: "เผยแพร่", date: new Date(item.publishDate) },
  ];
  if (includeProduction) {
    candidates.push({
      label: "โปรดักชัน",
      date: new Date(item.productionDeadline),
    });
  }
  const future = candidates
    .filter((c) => Number.isFinite(c.date.getTime()) && c.date.getTime() > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (future.length > 0) {
    return future[0];
  }
  return { label: "เผยแพร่", date: new Date(item.publishDate) };
}
