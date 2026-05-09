"use client";

import { format } from "date-fns";
import {
  FORMAT_LABELS,
  PILLAR_CONFIG,
  PLATFORM_LABELS,
  STATUS_CONFIG,
} from "@/lib/constants";
import type { ContentItem } from "@/lib/types";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { buildKPIResults, summarizeKPIResults } from "@/lib/kpi";
import { calcEngagementRate } from "@/lib/utils";
import { formatReachK } from "@/lib/reportUtils";
import { cn } from "@/lib/utils";

function postIdShort(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface ContentDetailTableProps {
  items: ContentItem[];
  showPerformance?: boolean;
}

export function ContentDetailTable({
  items,
  showPerformance = false,
}: ContentDetailTableProps) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="w-[70px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              #
            </th>
            <th className="w-6 px-1 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              ●
            </th>
            <th className="min-w-[180px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Content
            </th>
            <th className="w-[80px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Owner
            </th>
            <th className="w-[72px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Publish
            </th>
            <th className="w-[120px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Status
            </th>
            <th className="w-[100px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Deadline
            </th>
            {showPerformance && (
              <>
                <th className="w-[72px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Reach
                </th>
                <th className="w-[60px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  ER
                </th>
                <th className="w-[60px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  Saves
                </th>
                <th className="w-[60px] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                  KPI
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const pc = PILLAR_CONFIG[item.pillar];
            const sc = STATUS_CONFIG[item.status];
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
            const target = item.kpiTargets.engagementRateTarget;
            const kr =
              item.performance?.kpiResults ??
              (fm ? buildKPIResults(item.kpiTargets, fm) : undefined);
            const kp = summarizeKPIResults(kr);

            const plats = item.platform
              .map((p) => PLATFORM_LABELS[p] ?? p)
              .join(" · ");

            return (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-gray-100 transition-colors print:hover:bg-transparent",
                  idx % 2 === 1 && "bg-gray-50",
                  "hover:bg-blue-50 print:hover:bg-inherit",
                  item.status === "revision" && "border-l-[3px] border-l-red-400"
                )}
              >
                <td className="px-3 py-2.5 align-top text-[10px] tabular-nums text-gray-400">
                  {postIdShort(item.id)}
                </td>
                <td className="px-1 py-2.5 align-top">
                  <span
                    className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: pc.color }}
                  />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <div className="text-[13px] font-semibold text-gray-900">
                    {item.topic}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    {FORMAT_LABELS[item.format]} · {plats}
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top text-[12px] text-gray-600">
                  {item.owner}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <div className="text-[12px] tabular-nums text-gray-900">
                    {format(new Date(item.publishDate), "d MMM")}
                  </div>
                  {item.publishTime && (
                    <div className="text-[11px] text-gray-400">
                      {item.publishTime}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <span
                    className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: sc.bgColor,
                      color: sc.color,
                    }}
                  >
                    {sc.emoji} {sc.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <CountdownTimer
                    compact
                    targetDate={new Date(item.publishDate)}
                  />
                </td>
                {showPerformance && (
                  <>
                    <td className="px-3 py-2.5 align-top text-[12px] tabular-nums text-gray-700">
                      {fm ? formatReachK(fm.reach) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 align-top text-[12px] font-medium tabular-nums",
                        er == null && "text-gray-400",
                        er != null &&
                          target != null &&
                          er >= target &&
                          "text-green-600",
                        er != null &&
                          target != null &&
                          er < target &&
                          "text-red-600",
                        er != null && target == null && "text-gray-800"
                      )}
                    >
                      {er != null ? `${er.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-[12px] tabular-nums text-gray-700">
                      {fm ? fm.saves : "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-[11px] tabular-nums text-gray-700">
                      {kp.total ? `${kp.passed}/${kp.total} ✅` : "—"}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
