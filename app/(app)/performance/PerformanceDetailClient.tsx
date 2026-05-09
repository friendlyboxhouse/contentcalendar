"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContentItem, MetricsSnapshot } from "@/lib/types";
import { useContentStore } from "@/store/contentStore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PillarTag } from "@/components/shared/PillarTag";
import { FunnelTag } from "@/components/shared/FunnelTag";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { FORMAT_LABELS, PLATFORM_LABELS, KPI_REMINDER_DAYS } from "@/lib/constants";
import {
  calcEngagementRate,
  calcSaveRate,
  calcShareRate,
  cn,
} from "@/lib/utils";
import {
  buildKPIResults,
  summarizeKPIResults,
  enrichPerformanceFromFinalMetrics,
} from "@/lib/kpi";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/ui/material-icon";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";

function emptyMetrics(): MetricsSnapshot {
  return {
    recordedAt: new Date(),
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    linkClicks: 0,
    watchTimePercent: 0,
  };
}

export function PerformanceDetailClient({ id }: { id: string }) {
  const items = useContentStore((s) => s.items);
  const updateItem = useContentStore((s) => s.updateItem);
  const { canEdit } = usePlannerPermissions();

  const base = items.find((i) => i.id === id);

  const [snap24, setSnap24] = useState<MetricsSnapshot>(emptyMetrics());
  const [finalM, setFinalM] = useState<MetricsSnapshot>(emptyMetrics());
  const [whatWorked, setWhatWorked] = useState("");
  const [whatDidnt, setWhatDidnt] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);

  useEffect(() => {
    if (!base?.performance) return;
    const p = base.performance;
    if (p.snapshot24h) setSnap24({ ...p.snapshot24h });
    if (p.finalMetrics) setFinalM({ ...p.finalMetrics });
    setWhatWorked(p.whatWorked ?? "");
    setWhatDidnt(p.whatDidnt ?? "");
    setNextAction(p.nextAction ?? "");
    setRating(p.overallRating ?? 3);
  }, [base]);

  const erFinal = useMemo(
    () =>
      calcEngagementRate(
        finalM.likes,
        finalM.comments,
        finalM.shares,
        finalM.saves,
        finalM.reach
      ),
    [finalM]
  );
  const srFinal = useMemo(
    () => calcSaveRate(finalM.saves, finalM.reach),
    [finalM]
  );
  const shrFinal = useMemo(
    () => calcShareRate(finalM.shares, finalM.reach),
    [finalM]
  );

  if (!base) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-muted-foreground">ไม่พบโพสต์นี้</p>
        <Link
          href="/performance"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          ← กลับ
        </Link>
      </div>
    );
  }

  const publishedAt = base.publishedAt
    ? new Date(base.publishedAt)
    : null;

  const reminderRows = KPI_REMINDER_DAYS.map((days) => {
    if (!publishedAt)
      return { label: `${days} วัน`, state: "—" as const, date: null as Date | null };
    const due = new Date(publishedAt);
    due.setDate(due.getDate() + days);
    const done = !!base.performance?.finalMetrics;
    const now = Date.now();
    if (done && due.getTime() < now)
      return {
        label: `${days}-Day Check`,
        state: "done" as const,
        date: due,
      };
    if (!done && now >= due.getTime())
      return {
        label: `${days}-Day Check`,
        state: "due" as const,
        date: due,
      };
    return {
      label: `${days}-Day Check`,
      state: "pending" as const,
      date: due,
    };
  });

  const kpiRows = buildKPIResults(base.kpiTargets, {
    ...finalM,
    engagementRate: erFinal,
    saveRate: srFinal,
    shareRate: shrFinal,
  });
  const summary = summarizeKPIResults(kpiRows);

  const metricInputs = (
    m: MetricsSnapshot,
    set: (u: MetricsSnapshot) => void,
    editable: boolean
  ) => (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {(
        [
          ["reach", "Reach"],
          ["impressions", "Impressions"],
          ["likes", "Likes"],
          ["comments", "Comments"],
          ["shares", "Shares"],
          ["saves", "Saves"],
          ["linkClicks", "Link clicks"],
          ["watchTimePercent", "Watch time %"],
        ] as const
      ).map(([key, lab]) => (
        <div key={key}>
          <Label className="text-xs">{lab}</Label>
          <Input
            type="number"
            disabled={!editable}
            value={(m as never)[key] ?? ""}
            onChange={(e) => {
              const v =
                e.target.value === "" ? 0 : Number(e.target.value);
              set({ ...m, [key]: v });
            }}
          />
        </div>
      ))}
      <div className="sm:col-span-3 lg:col-span-5 rounded-lg bg-muted/50 p-3 text-xs">
        <div>
          Engagement rate: <strong>{calcEngagementRate(m.likes, m.comments, m.shares, m.saves, m.reach)}%</strong>
        </div>
        <div>
          Save rate: <strong>{calcSaveRate(m.saves, m.reach)}%</strong> · Share rate:{" "}
          <strong>{calcShareRate(m.shares, m.reach)}%</strong>
        </div>
      </div>
    </div>
  );

  const save = () => {
    if (!canEdit) {
      toast.message("โหมดดูอย่างเดียว — ไม่สามารถบันทึกการรีวิวได้");
      return;
    }
    const perfBase: NonNullable<ContentItem["performance"]> =
      base.performance ?? {
        whatWorked: "",
        whatDidnt: "",
        nextAction: "",
        overallRating: 3,
      };
    const performance = {
      ...perfBase,
      snapshot24h: { ...snap24, recordedAt: new Date() },
      finalMetrics: { ...finalM, recordedAt: new Date() },
      whatWorked,
      whatDidnt,
      nextAction,
      overallRating: rating,
      kpiResults: buildKPIResults(base.kpiTargets, {
        ...finalM,
        engagementRate: erFinal,
        saveRate: srFinal,
        shareRate: shrFinal,
      }),
    };
    let next: ContentItem = {
      ...base,
      performance,
    };
    next = enrichPerformanceFromFinalMetrics(next);
    if (next.performance?.finalMetrics && base.status === "kpi_pending") {
      next = { ...next, status: "published" };
    }
    updateItem(base.id, next);
    toast.success(`บันทึกการรีวิว ${base.id} แล้ว`);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/performance"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            ← กลับ
          </Link>
          <h1 className="text-xl font-bold">{base.id} · ผลงาน</h1>
        </div>
        <Button size="sm" onClick={save} disabled={!canEdit}>
          บันทึกการรีวิว
        </Button>
      </div>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          สรุปบรีฟ{" "}
          <MaterialIcon name="expand_more" size={20} className="opacity-70" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2 rounded-xl border bg-card p-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <PillarTag pillar={base.pillar} size="sm" />
            <FunnelTag stage={base.funnelStage} />
            <span className="text-muted-foreground">
              {FORMAT_LABELS[base.format]} ·{" "}
              {base.platform.map((p) => PLATFORM_LABELS[p]).join(", ")}
            </span>
          </div>
          <p className="font-medium">{base.topic}</p>
          <p className="text-xs text-muted-foreground">{base.hook}</p>
          <p className="text-xs">
            Owner: {base.owner} · Publish:{" "}
            {new Date(base.publishDate).toLocaleString("th-TH")}
          </p>
        </CollapsibleContent>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">สถานะ KPI reminder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {reminderRows.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-2">
              <span>{row.label}</span>
              <span className="text-muted-foreground">
                {row.state === "done" && "เสร็จแล้ว"}
                {row.state === "due" && "ถึงกำหนด"}
                {row.state === "pending" && row.date && (
                  <CountdownTimer targetDate={row.date} compact />
                )}
                {row.state === "—" && "—"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">สแนปช็อต — 24 ชม.</CardTitle>
        </CardHeader>
        <CardContent>{metricInputs(snap24, setSnap24, canEdit)}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ตัวเลขสุดท้าย — 7 วัน</CardTitle>
        </CardHeader>
        <CardContent>
          {metricInputs(finalM, setFinalM, canEdit)}
          <div className="mt-2 text-xs text-muted-foreground">
            Live ER {erFinal}% · Save {srFinal}% · Share {shrFinal}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">สกอร์การ์ด KPI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(kpiRows).map(([key, row]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span>{key}</span>
                <span>
                  Target {row.target} · Actual {row.actual}{" "}
                  {row.passed ? "ผ่าน" : "ไม่ผ่าน"} ({row.delta > 0 ? "+" : ""}
                  {row.delta})
                </span>
              </div>
              <ProgressBar value={row.actual} target={row.target} passed={row.passed} />
            </div>
          ))}
          {!Object.keys(kpiRows).length && (
            <p className="text-xs text-muted-foreground">
              ตั้งค่า KPI targets ใน Brief ก่อนเพื่อแสดง scorecard
            </p>
          )}
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {summary.total
                ? `ผ่าน KPI ${summary.passed}/${summary.total}`
                : "—"}
            </span>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-label={`ให้คะแนน ${r} จาก 5`}
                  disabled={!canEdit}
                  onClick={() => setRating(r)}
                  className="rounded-sm border border-transparent p-2 hover:bg-muted max-md:min-h-11 max-md:min-w-11 max-md:p-0 disabled:pointer-events-none disabled:opacity-40"
                >
                  <MaterialIcon
                    name="star"
                    size={26}
                    filled={r <= rating}
                    className={
                      r <= rating ? "text-amber-500" : "text-muted-foreground"
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อคิดและขั้นตอนถัดไป</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>สิ่งที่ทำได้ดี</Label>
            <Textarea
              rows={4}
              value={whatWorked}
              disabled={!canEdit}
              onChange={(e) => setWhatWorked(e.target.value)}
              placeholder="สิ่งที่โดนใจผู้ชม..."
            />
          </div>
          <div>
            <Label>สิ่งที่ยังไม่โดน</Label>
            <Textarea
              rows={4}
              value={whatDidnt}
              disabled={!canEdit}
              onChange={(e) => setWhatDidnt(e.target.value)}
              placeholder="มุมที่ควรปรับ..."
            />
          </div>
          <div>
            <Label>แผนถัดไป</Label>
            <Textarea
              rows={4}
              value={nextAction}
              disabled={!canEdit}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="แผนต่อยอดครั้งถัดไป..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:left-[240px] max-xl:md:left-[72px] max-md:left-0">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Link
            href="/performance"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            ปิด
          </Link>
          <Button onClick={save} disabled={!canEdit}>
            บันทึกการรีวิว
          </Button>
        </div>
      </div>
    </div>
  );
}
