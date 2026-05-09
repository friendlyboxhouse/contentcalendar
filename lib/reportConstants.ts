import { PILLAR_CONFIG, CONTENT_STATUSES_ORDERED } from "@/lib/constants";
import type { ContentFormat, ContentPillar } from "@/lib/types";

export const PILLAR_KEYS = Object.keys(PILLAR_CONFIG) as ContentPillar[];

export const CONTENT_FORMATS_ALL: ContentFormat[] = [
  "reel",
  "carousel",
  "static_post",
  "story",
  "ugc",
];

export { CONTENT_STATUSES_ORDERED };
