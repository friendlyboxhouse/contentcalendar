"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { ContentItem } from "@/lib/types";
import { PILLAR_CONFIG } from "@/lib/constants";

export function PillarBreakdown({ items }: { items: ContentItem[] }) {
  const counts = items.reduce(
    (acc, item) => {
      acc[item.pillar] = (acc[item.pillar] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = Object.keys(PILLAR_CONFIG).map((key) => ({
    name: PILLAR_CONFIG[key as keyof typeof PILLAR_CONFIG].label,
    key,
    value: counts[key] ?? 0,
    color: PILLAR_CONFIG[key as keyof typeof PILLAR_CONFIG].color,
  }));

  if (!items.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        ยังไม่มีข้อมูล
      </div>
    );
  }

  return (
    <div className="h-[320px] min-h-[280px] min-w-0 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">Pillar breakdown</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [Number(v ?? 0), "โพสต์"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
