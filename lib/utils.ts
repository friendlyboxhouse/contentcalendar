import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SLA_PRESETS } from "@/lib/constants";
import type { ContentFormat, SLAPresetKey } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  if (days === 0) return result;
  const step = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result.setDate(result.getDate() + step);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return result;
}

export function resolveSLAKey(
  format: ContentFormat,
  preset?: SLAPresetKey
): keyof typeof SLA_PRESETS {
  if (preset) return preset;
  switch (format) {
    case "reel":
      return "reel";
    case "carousel":
      return "carousel";
    case "story":
      return "story";
    case "ugc":
    case "static_post":
    default:
      return "static_post";
  }
}

export function calculateDeadlines(publishDate: Date, formatOrPreset: ContentFormat | SLAPresetKey) {
  const key =
    formatOrPreset in SLA_PRESETS
      ? (formatOrPreset as keyof typeof SLA_PRESETS)
      : resolveSLAKey(formatOrPreset as ContentFormat);
  const sla = SLA_PRESETS[key] ?? SLA_PRESETS.static_post;

  const approvalDeadline = addBusinessDays(
    publishDate,
    -(sla.buffer + sla.managementApproval)
  );
  const reviewDeadline = addBusinessDays(approvalDeadline, -sla.internalReview);
  const productionDeadline = addBusinessDays(reviewDeadline, -sla.production);
  const briefApprovalDeadline = addBusinessDays(
    productionDeadline,
    -sla.briefApproval
  );
  const briefDeadline = addBusinessDays(briefApprovalDeadline, -sla.briefWriting);

  return {
    briefDeadline,
    briefApprovalDeadline,
    productionDeadline,
    reviewDeadline,
    approvalDeadline,
    latestStartDate: briefDeadline,
    totalLeadDays: sla.totalDays,
  };
}

export function getCountdown(targetDate: Date): {
  days: number;
  hours: number;
  isOverdue: boolean;
  urgency: "safe" | "warning" | "critical" | "overdue";
} {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const isOverdue = diff < 0;

  let urgency: "safe" | "warning" | "critical" | "overdue";
  if (isOverdue) urgency = "overdue";
  else if (days <= 1) urgency = "critical";
  else if (days <= 3) urgency = "warning";
  else urgency = "safe";

  return {
    days: Math.abs(days),
    hours: Math.abs(hours),
    isOverdue,
    urgency,
  };
}

export const COUNTDOWN_COLORS = {
  safe: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "#10B981",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    dot: "#F59E0B",
  },
  critical: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    dot: "#EF4444",
  },
  overdue: {
    text: "text-red-800 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-950/60",
    dot: "#991B1B",
  },
};

export function calcEngagementRate(
  likes: number,
  comments: number,
  shares: number,
  saves: number,
  reach: number
): number {
  if (reach === 0) return 0;
  return +(((likes + comments + shares + saves) / reach) * 100).toFixed(2);
}

export function calcSaveRate(saves: number, reach: number): number {
  if (reach === 0) return 0;
  return +((saves / reach) * 100).toFixed(2);
}

export function calcShareRate(shares: number, reach: number): number {
  if (reach === 0) return 0;
  return +((shares / reach) * 100).toFixed(2);
}

export function generatePostId(existingItems: { id: string }[]): string {
  const nums = existingItems
    .map((i) => parseInt(i.id.replace("POST-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `POST-${String(next).padStart(3, "0")}`;
}

/** Synthetic trend vs “last month” for dashboard cards */
export function pseudoTrend(seed: string, value: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 97;
  const jitter = ((h % 11) - 5) / 10;
  const base = value <= 0 ? 0 : Math.min(0.35, 8 / (value + 4));
  return Math.round((base + jitter) * 100) / 100;
}
