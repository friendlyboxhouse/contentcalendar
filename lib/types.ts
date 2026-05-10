// lib/types.ts — Content Planner schema

export type ContentPillar =
  | "fact"
  | "micro_wellness"
  | "sport"
  | "recommend_review"
  | "mood"
  | "fun_content";

export type ContentFormat =
  | "reel"
  | "carousel"
  | "static_post"
  | "story"
  | "ugc";

export type ContentType = string;

export type Platform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "threads";

export type FunnelStage =
  | "awareness"
  | "consideration"
  | "conversion"
  | "loyalty";

export type ContentStatus =
  | "idea"
  | "in_brief"
  | "in_production"
  | "in_review"
  | "revision"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "kpi_pending";

export type RevisionRound = "R1" | "R2" | "R3+";

export interface ContentItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  pillar: ContentPillar;
  contentType: ContentType;
  format: ContentFormat;
  platform: Platform[];
  funnelStage: FunnelStage;

  topic: string;
  angle: string;
  targetAudience: string;
  hook: string;
  captionDirection: string;
  visualDirection: string;
  cta: string;
  dos: string[];
  donts: string[];
  referenceLinks: string[];
  strategicNotes: string;
  campaign?: string;

  owner: string;
  status: ContentStatus;
  revisionRound?: RevisionRound;
  approvedBy?: string;
  approvedAt?: Date;
  assetFolderLink?: string;

  slaPresetKey?: SLAPresetKey;

  briefDeadline: Date;
  productionDeadline: Date;
  approvalDeadline: Date;
  publishDate: Date;
  publishTime?: string;

  kpiTargets: KPITargets;
  kpiReminderSentAt?: Date;
  kpiReminderSnoozedAt?: Date;

  publishedAt?: Date;
  performance?: PerformanceData;

  approvalTrack?: ApprovalTrackRow[];
  revisionHistory?: RevisionHistoryEntry[];
}

export interface ApprovalTrackRow {
  role: "creative_lead" | "brand_manager" | "final";
  name: string;
  approved: boolean;
  approvedAt?: Date;
}

export interface RevisionHistoryEntry {
  round: RevisionRound;
  date: Date;
  note: string;
}

export interface KPITargets {
  reachTarget?: number;
  impressionTarget?: number;
  engagementRateTarget?: number;
  saveRateTarget?: number;
  shareRateTarget?: number;
  watchTimeTarget?: number;
  linkClicksTarget?: number;
  dmVolumeTarget?: number;
  ugcVolumeTarget?: number;
}

export interface PerformanceData {
  snapshot24h?: MetricsSnapshot;
  finalMetrics?: MetricsSnapshot;
  whatWorked: string;
  whatDidnt: string;
  nextAction: string;
  overallRating: 1 | 2 | 3 | 4 | 5;
  kpiResults?: KPIResults;
}

export interface MetricsSnapshot {
  recordedAt: Date;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  linkClicks?: number;
  profileVisits?: number;
  watchTimePercent?: number;
  engagementRate?: number;
  saveRate?: number;
  shareRate?: number;
}

export interface KPIResults {
  [key: string]: {
    target: number;
    actual: number;
    passed: boolean;
    delta: number;
  };
}

export type SLAPresetKey =
  | "static_post"
  | "carousel"
  | "reel"
  | "story"
  | "campaign"
  | "emergency";

export interface DashboardStats {
  total: number;
  inStock: number;
  pendingApproval: number;
  needsRework: number;
  planned: number;
  published: number;
  kpiPending: number;
}

export interface PlannerFilters {
  pillar?: ContentPillar | "all";
  platform?: Platform | "all";
  status?: ContentStatus | "all";
  format?: ContentFormat | "all";
  month?: string;
  owner?: string | "all";
  funnelStage?: FunnelStage | "all";
  kpiFilter?: "all" | "passed" | "failed" | "not_reviewed";
}

export type StatCardKey =
  | "total"
  | "inStock"
  | "pendingApproval"
  | "needsRework"
  | "planned";
