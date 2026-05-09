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
import { EmptyState } from "@/components/ui/feedback/EmptyState";

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
      <EmptyState
        compact
        icon="pie_chart"
        title="ยังไม่มีข้อมูลหมวดคอนเทนต์"
        description="เมื่อมีบรีฟในระบบ กราฟจะแสดงสัดส่วนตาม Pillar"
        className="h-[280px] border-solid bg-card shadow-sm"
      />
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
