"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { ContentItem } from "@/lib/types";
import { STATUS_CONFIG, CONTENT_STATUSES_ORDERED } from "@/lib/constants";
import { EmptyState } from "@/components/ui/feedback/EmptyState";

export function StatusDistribution({ items }: { items: ContentItem[] }) {
  const data = CONTENT_STATUSES_ORDERED.map((key) => ({
    name: STATUS_CONFIG[key].label,
    count: items.filter((i) => i.status === key).length,
    fill: STATUS_CONFIG[key].color,
  }));

  if (!items.length) {
    return (
      <EmptyState
        compact
        icon="bar_chart"
        title="ยังไม่มีการกระจายสถานะ"
        description="เพิ่มบรีฟและอัปเดตสถานะเพื่อดูแผนภูมิ"
        className="h-[320px] min-h-[280px] border-solid bg-card shadow-sm"
      />
    );
  }

  return (
    <div className="h-[320px] min-h-[280px] min-w-0 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">การกระจายตามสถานะ</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [Number(v ?? 0), "โพสต์"]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
