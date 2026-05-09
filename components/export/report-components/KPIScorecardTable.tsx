"use client";

import { PillarTag } from "@/components/shared/PillarTag";
import type { ContentPillar } from "@/lib/types";
import { PILLAR_KEYS } from "@/lib/reportConstants";
import { cn } from "@/lib/utils";

interface KPIScorecardTableProps {
  perfByPillar: Record<
    ContentPillar,
    { avgEngagementRate: number; kpiPassRate: number; count: number }
  >;
}

function erBarColor(er: number): string {
  if (er > 8) return "bg-green-500";
  if (er >= 4) return "bg-amber-500";
  return "bg-red-500";
}

function kpiBadge(rate: number): { cls: string; label: string } {
  if (rate > 75) return { cls: "bg-green-100 text-green-800", label: `${rate.toFixed(0)}%` };
  if (rate >= 50) return { cls: "bg-amber-100 text-amber-800", label: `${rate.toFixed(0)}%` };
  return { cls: "bg-red-100 text-red-800", label: `${rate.toFixed(0)}%` };
}

function verdict(rate: number): { text: string; cls: string } {
  if (rate > 75) return { text: "✅ On Track", cls: "text-green-700" };
  if (rate >= 50) return { text: "⚠️ Watch", cls: "text-amber-700" };
  return { text: "❌ Needs Review", cls: "text-red-700" };
}

export function KPIScorecardTable({ perfByPillar }: KPIScorecardTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 bg-gray-50">
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Pillar
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Posts reviewed
            </th>
            <th className="min-w-[140px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Avg ER
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              KPI pass rate
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Verdict
            </th>
          </tr>
        </thead>
        <tbody>
          {PILLAR_KEYS.map((pillar) => {
            const row = perfByPillar[pillar];
            const er = row.avgEngagementRate;
            const barW = Math.min((er / 20) * 100, 100);
            const kb = kpiBadge(row.kpiPassRate);
            const v = verdict(row.kpiPassRate);

            return (
              <tr key={pillar} className="border-b border-gray-100">
                <td className="px-3 py-2 align-middle">
                  <PillarTag pillar={pillar} size="sm" />
                </td>
                <td className="px-3 py-2 text-right text-[13px] tabular-nums text-gray-800">
                  {row.count}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[13px] font-semibold tabular-nums">
                      {er.toFixed(1)}%
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn("h-full rounded-full", erBarColor(er))}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right align-middle">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums",
                      kb.cls
                    )}
                  >
                    {kb.label}
                  </span>
                </td>
                <td className={cn("px-3 py-2 text-[13px] font-medium", v.cls)}>
                  {v.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
