// lib/constants.ts — design tokens & SLA

export const PILLAR_CONFIG = {
  fact: {
    label: "Fact",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    darkBg: "#1E3A5F",
    emoji: "🔵",
    icon: "BookOpen",
  },
  micro_wellness: {
    label: "Micro Wellness",
    color: "#10B981",
    bgColor: "#ECFDF5",
    darkBg: "#064E3B",
    emoji: "🌿",
    icon: "Heart",
  },
  sport: {
    label: "Sport",
    color: "#84CC16",
    bgColor: "#F7FEE7",
    darkBg: "#1A2E05",
    emoji: "🟢",
    icon: "Zap",
  },
  recommend_review: {
    label: "Recommend & Review",
    color: "#F97316",
    bgColor: "#FFF7ED",
    darkBg: "#431407",
    emoji: "🟠",
    icon: "Star",
  },
  mood: {
    label: "Mood",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    darkBg: "#500724",
    emoji: "🩷",
    icon: "Sparkles",
  },
  fun_content: {
    label: "Fun Content",
    color: "#EAB308",
    bgColor: "#FEFCE8",
    darkBg: "#422006",
    emoji: "🟡",
    icon: "Laugh",
  },
} as const;

export const STATUS_CONFIG = {
  idea: {
    label: "Idea",
    color: "#6B7280",
    bgColor: "#F9FAFB",
    dotColor: "#9CA3AF",
    emoji: "💡",
    order: 1,
  },
  in_brief: {
    label: "In Brief",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    dotColor: "#3B82F6",
    emoji: "📝",
    order: 2,
  },
  in_production: {
    label: "In Production",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    dotColor: "#8B5CF6",
    emoji: "🎨",
    order: 3,
  },
  in_review: {
    label: "In Review",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    dotColor: "#F59E0B",
    emoji: "🔍",
    order: 4,
  },
  revision: {
    label: "Revision",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    dotColor: "#EF4444",
    emoji: "🔄",
    order: 5,
  },
  pending_approval: {
    label: "Pending Approval",
    color: "#F97316",
    bgColor: "#FFEDD5",
    dotColor: "#F97316",
    emoji: "⏳",
    order: 6,
  },
  approved: {
    label: "Approved",
    color: "#10B981",
    bgColor: "#D1FAE5",
    dotColor: "#10B981",
    emoji: "✅",
    order: 7,
  },
  scheduled: {
    label: "Scheduled",
    color: "#06B6D4",
    bgColor: "#CFFAFE",
    dotColor: "#06B6D4",
    emoji: "📅",
    order: 8,
  },
  published: {
    label: "Published",
    color: "#22C55E",
    bgColor: "#DCFCE7",
    dotColor: "#22C55E",
    emoji: "🚀",
    order: 9,
  },
  kpi_pending: {
    label: "KPI Pending",
    color: "#A855F7",
    bgColor: "#F3E8FF",
    dotColor: "#A855F7",
    emoji: "📊",
    order: 10,
  },
} as const;

export const SLA_PRESETS = {
  static_post: {
    label: "Static Post",
    emoji: "🖼️",
    briefWriting: 1,
    briefApproval: 1,
    production: 2,
    internalReview: 1,
    managementApproval: 1,
    buffer: 1,
    totalDays: 7,
  },
  carousel: {
    label: "Carousel",
    emoji: "📖",
    briefWriting: 1,
    briefApproval: 1,
    production: 3,
    internalReview: 1,
    managementApproval: 1,
    buffer: 1,
    totalDays: 8,
  },
  reel: {
    label: "Reel / Video",
    emoji: "🎬",
    briefWriting: 1,
    briefApproval: 1,
    production: 5,
    internalReview: 1,
    managementApproval: 2,
    buffer: 1,
    totalDays: 11,
  },
  story: {
    label: "Story",
    emoji: "⭕",
    briefWriting: 1,
    briefApproval: 1,
    production: 1,
    internalReview: 1,
    managementApproval: 1,
    buffer: 1,
    totalDays: 5,
  },
  campaign: {
    label: "Campaign / Special",
    emoji: "🎯",
    briefWriting: 2,
    briefApproval: 2,
    production: 7,
    internalReview: 2,
    managementApproval: 2,
    buffer: 2,
    totalDays: 17,
  },
  emergency: {
    label: "⚡ Emergency (24H)",
    emoji: "🚨",
    briefWriting: 0,
    briefApproval: 0,
    production: 0,
    internalReview: 0,
    managementApproval: 0,
    buffer: 0,
    totalDays: 1,
  },
} as const;

export const KPI_REMINDER_DAYS = [14, 28];

export const FUNNEL_CONFIG = {
  awareness: {
    label: "Awareness",
    color: "#6366F1",
    metrics: ["reach", "impressions", "followerGrowth"],
  },
  consideration: {
    label: "Consideration",
    color: "#F59E0B",
    metrics: ["engagementRate", "saveRate", "shareRate", "watchTime"],
  },
  conversion: {
    label: "Conversion",
    color: "#10B981",
    metrics: ["linkClicks", "dmVolume", "signupRate"],
  },
  loyalty: {
    label: "Loyalty",
    color: "#EC4899",
    metrics: ["repeatEngagement", "commentSentiment", "ugcVolume"],
  },
} as const;

export const CONTENT_STATUSES_ORDERED = Object.entries(STATUS_CONFIG)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([k]) => k) as (keyof typeof STATUS_CONFIG)[];

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  threads: "Threads",
};

export const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  carousel: "Carousel",
  static_post: "Static Post",
  story: "Story",
  ugc: "UGC",
};
