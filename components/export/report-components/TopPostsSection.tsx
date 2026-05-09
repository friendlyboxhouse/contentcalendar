"use client";

import { FORMAT_LABELS, PLATFORM_LABELS, PILLAR_CONFIG } from "@/lib/constants";
import type { ContentItem } from "@/lib/types";
import {
  calcEngagementRate,
  calcSaveRate,
} from "@/lib/utils";
import { formatReachK } from "@/lib/reportUtils";

const RANK_STYLE = [
  { bg: "#F59E0B", label: "#1" },
  { bg: "#9CA3AF", label: "#2" },
  { bg: "#D97706", label: "#3" },
];

function postIdShort(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface TopPostsSectionProps {
  posts: ContentItem[];
}

export function TopPostsSection({ posts }: TopPostsSectionProps) {
  const list = posts.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {list.map((item, idx) => {
        const pc = PILLAR_CONFIG[item.pillar];
        const fm =
          item.performance?.finalMetrics ?? item.performance?.snapshot24h;
        const er = fm
          ? calcEngagementRate(
              fm.likes,
              fm.comments,
              fm.shares,
              fm.saves,
              fm.reach
            )
          : null;
        const sr = fm ? calcSaveRate(fm.saves, fm.reach) : null;
        const rank = RANK_STYLE[idx] ?? RANK_STYLE[2];
        const plats = item.platform
          .map((p) => PLATFORM_LABELS[p] ?? p)
          .join(", ");

        return (
          <div
            key={item.id}
            className="top-post-card relative overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: pc.color }}
            />
            <div
              className="absolute top-2 right-2 rounded px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: rank.bg }}
            >
              {rank.label}
            </div>
            <div className="p-4 pt-6">
              <div className="text-[11px] tabular-nums text-gray-400">
                {postIdShort(item.id)}
              </div>
              <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-gray-900">
                {item.topic}
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                {FORMAT_LABELS[item.format]} · {plats}
              </div>
              <hr className="my-3 border-gray-100" />
              {fm && er != null && sr != null ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900">
                      {er.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Engagement rate
                    </div>
                  </div>
                  <div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900">
                      {sr.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-500">Save rate</div>
                  </div>
                  <div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900">
                      {formatReachK(fm.reach)}
                    </div>
                    <div className="text-[10px] text-gray-500">Reach</div>
                  </div>
                  <div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900">
                      {fm.saves}
                    </div>
                    <div className="text-[10px] text-gray-500">Saves</div>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-gray-500">No metrics yet</p>
              )}
              <p className="mt-3 line-clamp-2 text-[12px] italic text-gray-600">
                {item.performance?.whatWorked
                  ? `What worked: ${item.performance.whatWorked}`
                  : "—"}
              </p>
            </div>
          </div>
        );
      })}
      {list.length === 0 && (
        <div className="col-span-full rounded-lg border border-dashed border-gray-200 p-8 text-center text-[13px] text-gray-500">
          No qualifying posts for this period.
        </div>
      )}
    </div>
  );
}
