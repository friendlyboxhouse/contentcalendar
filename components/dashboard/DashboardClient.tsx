"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useContentStore } from "@/store/contentStore";
import type { PlannerFilters, StatCardKey, ContentItem } from "@/lib/types";
import { FilterBar } from "@/components/shared/FilterBar";
import { KPIReminderBanner } from "@/components/shared/KPIReminderBanner";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PillarBreakdown } from "@/components/dashboard/PillarBreakdown";
import { StatusDistribution } from "@/components/dashboard/StatusDistribution";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { pseudoTrend } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants";
import { filterContentItems } from "@/lib/filterContent";
import { computeDashboardStats } from "@/lib/dashboardStats";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function nearestDeadline(item: ContentItem): { label: string; date: Date } {
  const candidates: { label: string; date: Date }[] = [
    { label: "Brief", date: new Date(item.briefDeadline) },
    { label: "Production", date: new Date(item.productionDeadline) },
    { label: "Approval", date: new Date(item.approvalDeadline) },
    { label: "Publish", date: new Date(item.publishDate) },
  ];
  const future = candidates.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  return future[0];
}

export function DashboardClient() {
  const router = useRouter();
  const items = useContentStore((s) => s.items);
  const getKPIReminderItems = useContentStore((s) => s.getKPIReminderItems);
  const [filters, setFilters] = useState<PlannerFilters>({
    pillar: "all",
    platform: "all",
    status: "all",
    format: "all",
    month: "all",
    owner: "all",
    funnelStage: "all",
    kpiFilter: "all",
  });

  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const t = new Date(item.publishDate);
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
      const label = t.toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
      });
      map.set(key, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [items]);

  const filteredForCharts = useMemo(
    () => filterContentItems(items, filters),
    [items, filters]
  );

  const stats = useMemo(
    () => computeDashboardStats(filteredForCharts),
    [filteredForCharts]
  );

  const [activeStat, setActiveStat] = useState<StatCardKey | null>(null);

  const reminderItems = getKPIReminderItems();

  const upcoming = useMemo(() => {
    return [...items]
      .map((item) => ({ item, ...nearestDeadline(item) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [items]);

  const recent = useMemo(() => {
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 10)
      .map((item) => ({
        item,
        msg: `${item.id} · ${STATUS_CONFIG[item.status].emoji} ${STATUS_CONFIG[item.status].label}`,
      }));
  }, [items]);

  const goBriefs = (fs: string) => {
    router.push(`/briefs?fs=${encodeURIComponent(fs)}`);
  };

  const onStatPress = (key: StatCardKey) => {
    setActiveStat(key);
    switch (key) {
      case "total":
        router.push("/briefs");
        break;
      case "inStock":
        goBriefs("approved,scheduled");
        break;
      case "pendingApproval":
        goBriefs("pending_approval");
        break;
      case "needsRework":
        goBriefs("revision");
        break;
      case "planned":
        goBriefs("idea,in_brief,in_production,in_review");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            สรุปคอนเทนต์ สถานะ และ KPI ที่ต้องตาม
          </p>
        </div>
        <Link href="/briefs/new">
          <Button size="sm">+ New Brief</Button>
        </Link>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={["pillar", "platform", "status", "format", "month"]}
        monthOptions={monthOptions}
      />

      <div className="flex flex-wrap gap-3">
        <StatsCard
          title="Total Content"
          value={stats.total}
          trend={pseudoTrend("total", stats.total)}
          statKey="total"
          active={activeStat === "total"}
          onPress={onStatPress}
        />
        <StatsCard
          title="In Stock"
          value={stats.inStock}
          trend={pseudoTrend("stock", stats.inStock)}
          statKey="inStock"
          active={activeStat === "inStock"}
          onPress={onStatPress}
        />
        <StatsCard
          title="Pending Approval"
          value={stats.pendingApproval}
          trend={pseudoTrend("pend", stats.pendingApproval)}
          statKey="pendingApproval"
          active={activeStat === "pendingApproval"}
          onPress={onStatPress}
        />
        <StatsCard
          title="Needs Rework"
          value={stats.needsRework}
          trend={pseudoTrend("rev", stats.needsRework)}
          statKey="needsRework"
          active={activeStat === "needsRework"}
          onPress={onStatPress}
        />
        <StatsCard
          title="Planned"
          value={stats.planned}
          trend={pseudoTrend("plan", stats.planned)}
          statKey="planned"
          active={activeStat === "planned"}
          onPress={onStatPress}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <PillarBreakdown items={filteredForCharts} />
        <StatusDistribution items={filteredForCharts} />
      </div>

      <KPIReminderBanner items={reminderItems} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Deadline ถัดไป</h3>
          <ul className="space-y-3">
            {upcoming.map(({ item, label, date }) => (
              <li key={item.id} className="flex flex-col gap-1 border-b pb-3 last:border-0">
                <Link
                  href={`/briefs/${encodeURIComponent(item.id)}`}
                  className="text-sm font-medium hover:underline"
                >
                  {item.id} · {label}
                </Link>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {item.topic}
                </p>
                <CountdownTimer targetDate={date} compact />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Recent activity</h3>
          <ul className="space-y-2 text-sm">
            {recent.map(({ item, msg }) => (
              <li key={`${item.id}-${item.updatedAt.toString()}`}>
                <Link
                  href={`/briefs/${encodeURIComponent(item.id)}`}
                  className="hover:underline"
                >
                  {msg}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
