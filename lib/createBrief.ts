import type { ContentItem } from "@/lib/types";
import { calculateDeadlines, generatePostId, addBusinessDays } from "@/lib/utils";

export function createEmptyBrief(existing: Pick<ContentItem, "id">[]): ContentItem {
  const publishDate = addBusinessDays(new Date(), 14);
  const format = "static_post" as const;
  const dl = calculateDeadlines(publishDate, format);
  const now = new Date();
  return {
    id: generatePostId(existing),
    createdAt: now,
    updatedAt: now,
    pillar: "sport",
    contentType: "educational",
    format,
    platform: ["instagram"],
    funnelStage: "consideration",
    topic: "",
    angle: "",
    targetAudience: "",
    hook: "",
    captionDirection: "",
    visualDirection: "",
    cta: "",
    dos: ["", "", ""],
    donts: ["", "", ""],
    referenceLinks: [],
    strategicNotes: "",
    owner: "",
    status: "idea",
    briefDeadline: dl.briefDeadline,
    productionDeadline: dl.productionDeadline,
    approvalDeadline: dl.approvalDeadline,
    publishDate,
    publishTime: "18:00",
    slaPresetKey: "static_post",
    kpiTargets: {
      engagementRateTarget: 8,
      saveRateTarget: 5,
      shareRateTarget: 2,
      watchTimeTarget: 60,
    },
  };
}
