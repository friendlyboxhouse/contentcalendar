"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PILLAR_CONFIG } from "@/lib/constants";
import type { ContentPillar } from "@/lib/types";

interface PillarDonutChartProps {
  data: Record<ContentPillar, number>;
  title?: string;
  size?: "sm" | "lg";
}

export function PillarDonutChart({
  data,
  title = "Content by pillar",
  size = "lg",
}: PillarDonutChartProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chartData = (Object.keys(PILLAR_CONFIG) as ContentPillar[])
    .map((key) => ({
      key,
      name: PILLAR_CONFIG[key].label,
      value: data[key] ?? 0,
      color: PILLAR_CONFIG[key].color,
    }))
    .sort((a, b) => b.value - a.value);

  const outer = size === "lg" ? 72 : 58;
  const inner = size === "lg" ? 48 : 38;

  return (
    <div className="page-break-avoid">
      {title && (
        <div className="mb-2 text-[12px] font-semibold text-gray-800">{title}</div>
      )}
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={inner}
                outerRadius={outer}
                paddingAngle={2}
              >
                {chartData.map((e) => (
                  <Cell key={e.key} fill={e.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [Number(v ?? 0), "posts"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
            <div className="text-[28px] font-bold tabular-nums text-gray-900">
              {total}
            </div>
            <div className="text-[11px] text-gray-400">posts</div>
          </div>
        </div>
        <ul className="min-w-[160px] flex-1 space-y-2">
          {chartData.map((e) => {
            const pct = total ? Math.round((e.value / total) * 100) : 0;
            return (
              <li key={e.key} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: e.color }}
                />
                <span className="flex-1 truncate text-gray-700">{e.name}</span>
                <span className="font-bold tabular-nums text-gray-900">
                  {e.value}
                </span>
                <span className="w-10 text-right text-[11px] text-gray-400">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
