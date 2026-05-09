"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContentPillar, PlannerFilters } from "@/lib/types";
import { useContentStore } from "@/store/contentStore";
import { FilterBar } from "@/components/shared/FilterBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useContentStoreHydrated } from "@/hooks/useContentStoreHydrated";
import { cn } from "@/lib/utils";
import { PillarTag } from "@/components/shared/PillarTag";
import { Badge } from "@/components/ui/badge";
import { summarizeKPIResults } from "@/lib/kpi";
import {
  calcEngagementRate,
  calcSaveRate,
} from "@/lib/utils";
import { filterContentItems } from "@/lib/filterContent";

export function PerformanceOverviewClient() {
  const hydrated = useContentStoreHydrated();
  const items = useContentStore((s) => s.items);
  const [filters, setFilters] = useState<PlannerFilters>({
    pillar: "all",
    platform: "all",
    funnelStage: "all",
    kpiFilter: "all",
  });

  const published = useMemo(
    () =>
      items.filter((i) =>
        ["published", "kpi_pending"].includes(i.status)
      ),
    [items]
  );

  const filtered = useMemo(() => {
    let list = filterContentItems(published, filters);
    if (filters.kpiFilter === "passed") {
      list = list.filter((i) => {
        const { passed, total } = summarizeKPIResults(i.performance?.kpiResults);
        return total > 0 && passed === total;
      });
    }
    if (filters.kpiFilter === "failed") {
      list = list.filter((i) => {
        const { passed, total } = summarizeKPIResults(i.performance?.kpiResults);
        return total > 0 && passed < total;
      });
    }
    if (filters.kpiFilter === "not_reviewed") {
      list = list.filter((i) => !i.performance?.finalMetrics);
    }
    return list;
  }, [published, filters]);

  const reviewed = published.filter((i) => i.performance?.finalMetrics);
  const avgER = useMemo(() => {
    if (!reviewed.length) return 0;
    const sum = reviewed.reduce((acc, i) => {
      const fm = i.performance!.finalMetrics!;
      return (
        acc +
        calcEngagementRate(
          fm.likes,
          fm.comments,
          fm.shares,
          fm.saves,
          fm.reach
        )
      );
    }, 0);
    return Math.round((sum / reviewed.length) * 10) / 10;
  }, [reviewed]);

  const pillarBest = useMemo(() => {
    const map = new Map<string, number[]>();
    reviewed.forEach((i) => {
      const fm = i.performance!.finalMetrics!;
      const er = calcEngagementRate(
        fm.likes,
        fm.comments,
        fm.shares,
        fm.saves,
        fm.reach
      );
      const arr = map.get(i.pillar) ?? [];
      arr.push(er);
      map.set(i.pillar, arr);
    });
    let best = "";
    let bestAvg = -1;
    map.forEach((arr, pillar) => {
      const a = arr.reduce((s, x) => s + x, 0) / arr.length;
      if (a > bestAvg) {
        bestAvg = a;
        best = pillar;
      }
    });
    return { pillar: best, er: bestAvg };
  }, [reviewed]);

  const passRate = useMemo(() => {
    let totalK = 0;
    let passedK = 0;
    reviewed.forEach((i) => {
      Object.values(i.performance?.kpiResults ?? {}).forEach((r) => {
        totalK++;
        if (r.passed) passedK++;
      });
    });
    if (!totalK) return 0;
    return Math.round((passedK / totalK) * 100);
  }, [reviewed]);

  if (!hydrated) {
    return (
      <div className="min-h-[min(60vh,420px)] py-8">
        <PageSpinner label="กำลังโหลดผลงาน…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ประสิทธิภาพ</h1>
        <p className="text-sm text-muted-foreground">
          ดูผลหลังโพสต์และ KPI scorecard
        </p>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        options={["pillar", "platform", "funnelStage", "kpiFilter"]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            โพสต์แล้วทั้งหมด
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {published.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Engagement เฉลี่ย
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{avgER}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            Pillar สูงสุด (ER เฉลี่ย)
          </CardHeader>
          <CardContent className="text-sm font-semibold">
            {pillarBest.pillar ? (
              <>
                <PillarTag
                  pillar={pillarBest.pillar as ContentPillar}
                  size="sm"
                />{" "}
                <span className="tabular-nums">{pillarBest.er.toFixed(1)}%</span>
              </>
            ) : (
              "—"
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 text-xs font-medium text-muted-foreground">
            อัตราผ่าน KPI
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{passRate}%</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const fm = item.performance?.finalMetrics;
          const snap = item.performance?.snapshot24h;
          const { passed, total } = summarizeKPIResults(item.performance?.kpiResults);
          const pendingKpi =
            item.status === "kpi_pending" && !fm;
          const er = fm
            ? calcEngagementRate(
                fm.likes,
                fm.comments,
                fm.shares,
                fm.saves,
                fm.reach
              )
            : snap
              ? calcEngagementRate(
                  snap.likes,
                  snap.comments,
                  snap.shares,
                  snap.saves,
                  snap.reach
                )
              : 0;
          const sr = fm ? calcSaveRate(fm.saves, fm.reach) : 0;
          const rating = item.performance?.overallRating ?? 0;

          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="space-y-2 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PillarTag pillar={item.pillar} size="sm" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.id}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-snug">
                  {item.topic}
                </p>
                <p className="text-xs text-muted-foreground">
                  โพสต์เมื่อ{" "}
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString("th-TH")
                    : "—"}
                </p>
                {pendingKpi ? (
                  <Badge variant="secondary" className="w-fit bg-amber-100 text-amber-900">
                    รอรีวิว KPI
                  </Badge>
                ) : total ? (
                  <Badge
                    variant="secondary"
                    className={
                      passed === total
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                    }
                  >
                    KPI {passed}/{total}
                  </Badge>
                ) : (
                  <Badge variant="outline">ยังไม่มีสกอร์การ์ด</Badge>
                )}
              </CardHeader>
              <CardContent className="mt-auto space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">อัตรา Engagement</div>
                  <div className="text-xl font-semibold tabular-nums">{er.toFixed(1)}%</div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>อัตรา Save</span>
                  <span className="font-medium text-foreground">{sr.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-0.5" aria-label={`คะแนน ${rating} จาก 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MaterialIcon
                      key={i}
                      name="star"
                      size={18}
                      filled={i < rating}
                      className={
                        i < rating ? "text-amber-500" : "text-muted-foreground"
                      }
                    />
                  ))}
                </div>
                <Link
                  href={`/performance/${item.id}`}
                  className={cn(
                    buttonVariants({
                      variant: pendingKpi ? "default" : "secondary",
                      size: "sm",
                      className: "w-full",
                    })
                  )}
                >
                  {pendingKpi ? "กรอกการรีวิว →" : "ดูการรีวิว →"}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!filtered.length ? (
        <EmptyState
          icon="analytics"
          title="ไม่มีคอนเทนต์ในตัวกรองนี้"
          description="แสดงเฉพาะคอนเทนต์ที่โพสต์แล้ว (published / kpi_pending) — ปรับตัวกรองหรืออัปเดตสถานะและผลวัด"
        >
          <Link href="/briefs">
            <Button variant="outline" size="sm">
              ไปที่บรีฟทั้งหมด
            </Button>
          </Link>
        </EmptyState>
      ) : null}
    </div>
  );
}
