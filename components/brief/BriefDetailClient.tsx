"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import type {
  ContentItem,
  ContentPillar,
  ContentFormat,
  Platform,
  ContentType,
  FunnelStage,
  ContentStatus,
  RevisionRound,
  SLAPresetKey,
} from "@/lib/types";
import {
  PILLAR_CONFIG,
  CONTENT_STATUSES_ORDERED,
  FORMAT_LABELS,
  PLATFORM_LABELS,
  FUNNEL_CONFIG,
} from "@/lib/constants";
import { useContentStore } from "@/store/contentStore";
import { createEmptyBrief } from "@/lib/createBrief";
import { calculateDeadlines, resolveSLAKey } from "@/lib/utils";
import { SLAPresetPicker } from "@/components/shared/SLAPresetPicker";
import { PillarTag } from "@/components/shared/PillarTag";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = { briefId?: string };

export function BriefDetailClient({ briefId }: Props) {
  const router = useRouter();
  const items = useContentStore((s) => s.items);
  const addItem = useContentStore((s) => s.addItem);
  const updateItem = useContentStore((s) => s.updateItem);
  const updateStatus = useContentStore((s) => s.updateStatus);

  const isNew = !briefId;
  const seedNewRef = useRef<ContentItem | null>(null);
  if (isNew && !seedNewRef.current) {
    seedNewRef.current = createEmptyBrief(items);
  }

  const existing = briefId
    ? items.find((i) => i.id === briefId)
    : undefined;

  const [draft, setDraft] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (isNew && seedNewRef.current) {
      setDraft(seedNewRef.current);
      return;
    }
    if (!isNew && existing) {
      setDraft({ ...existing });
    }
  }, [isNew, existing, briefId]);

  const slaPreset: SLAPresetKey =
    draft?.slaPresetKey ?? resolveSLAKey(draft?.format ?? "static_post");

  const syncDeadlines = (publish: Date, preset: SLAPresetKey, fmt: ContentFormat) => {
    const key = preset ?? resolveSLAKey(fmt);
    const dl = calculateDeadlines(publish, key);
    setDraft((d) =>
      d
        ? {
            ...d,
            publishDate: publish,
            slaPresetKey: key,
            briefDeadline: dl.briefDeadline,
            productionDeadline: dl.productionDeadline,
            approvalDeadline: dl.approvalDeadline,
          }
        : d
    );
  };

  const funnelStage = draft?.funnelStage;
  const kpiFields = useMemo(() => {
    if (!funnelStage) return [];
    const m = FUNNEL_CONFIG[funnelStage].metrics as readonly string[];
    const rows: { key: keyof ContentItem["kpiTargets"]; label: string; suffix: string }[] =
      [];
    if (m.includes("reach")) rows.push({ key: "reachTarget", label: "Reach Target", suffix: "" });
    if (m.includes("impressions"))
      rows.push({ key: "impressionTarget", label: "Impression Target", suffix: "" });
    if (m.includes("engagementRate"))
      rows.push({ key: "engagementRateTarget", label: "Engagement Rate", suffix: "%" });
    if (m.includes("saveRate"))
      rows.push({ key: "saveRateTarget", label: "Save Rate", suffix: "%" });
    if (m.includes("shareRate"))
      rows.push({ key: "shareRateTarget", label: "Share Rate", suffix: "%" });
    if (m.includes("watchTime"))
      rows.push({ key: "watchTimeTarget", label: "Watch Time", suffix: "%" });
    if (m.includes("linkClicks"))
      rows.push({ key: "linkClicksTarget", label: "Link Clicks", suffix: "" });
    if (m.includes("dmVolume"))
      rows.push({ key: "dmVolumeTarget", label: "DM Volume", suffix: "" });
    if (m.includes("ugcVolume"))
      rows.push({ key: "ugcVolumeTarget", label: "UGC Volume", suffix: "" });
    return rows;
  }, [funnelStage]);

  if (!isNew && !existing) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-muted-foreground">ไม่พบ Brief นี้</p>
        <Link
          href="/briefs"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          ← กลับ
        </Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-8 text-sm text-muted-foreground">กำลังโหลด…</div>
    );
  }

  const setField = <K extends keyof ContentItem>(key: K, val: ContentItem[K]) =>
    setDraft((d) => (d ? { ...d, [key]: val } : d));

  const applyStatus = (next: ContentStatus) => {
    if (next === "published") {
      if (
        !confirm(
          "ตั้งเป็น Published จะเริ่มนับ KPI reminder — ยืนยัน?"
        )
      )
        return;
      if (!isNew) {
        updateStatus(draft.id, "published");
      }
      setField("status", "published");
      setField("publishedAt", new Date());
      toast.success("ตั้งเป็น Published แล้ว");
      return;
    }
    if (next === "revision") {
      const round = (prompt("รอบ Revision (R1 / R2 / R3+)", "R1") ||
        "R1") as RevisionRound;
      if (!isNew) {
        updateItem(draft.id, { status: next, revisionRound: round });
      }
      setField("status", next);
      setField("revisionRound", round);
      toast.success("อัปเดตสถานะ");
      return;
    }
    if (!isNew) {
      updateStatus(draft.id, next);
    }
    setField("status", next);
    toast.success("อัปเดตสถานะ");
  };

  const validate = () => {
    if (!draft.topic.trim()) return "กรอก Topic";
    if (!draft.owner.trim()) return "กรอก Owner";
    if (!draft.platform.length) return "เลือก Platform อย่างน้อย 1";
    const dos = draft.dos.filter((x) => x.trim());
    const donts = draft.donts.filter((x) => x.trim());
    if (!dos.length || !donts.length) return "DOs / DON'Ts อย่างน้อยอย่างละ 1 ข้อ";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    const cleaned: ContentItem = {
      ...draft,
      dos: draft.dos.filter((x) => x.trim()),
      donts: draft.donts.filter((x) => x.trim()),
      updatedAt: new Date(),
    };
    if (isNew) {
      addItem(cleaned);
      toast.success(`✅ บันทึก ${cleaned.id} และเพิ่มใน Calendar แล้ว`);
      router.replace(`/briefs/${cleaned.id}`);
    } else {
      updateItem(cleaned.id, cleaned);
      toast.success(`✅ บันทึก ${cleaned.id}`);
    }
  };

  const dateStr = (d: Date) => format(new Date(d), "yyyy-MM-dd");

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/briefs"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold">{draft.id}</h1>
          <PillarTag pillar={draft.pillar} size="sm" />
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Link
              href={`/performance/${draft.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" })
              )}
            >
              Performance
            </Link>
          )}
          <Button size="sm" onClick={save}>
            Save Brief
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status pipeline</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex min-w-max gap-1 pb-1">
            {CONTENT_STATUSES_ORDERED.map((st, idx) => (
              <div key={st} className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-2 py-1 text-xs transition",
                    draft.status === st
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => {
                    if (!confirm(`เปลี่ยนสถานะเป็น ${st}?`)) return;
                    applyStatus(st);
                  }}
                >
                  {st.replace(/_/g, " ")}
                </button>
                {idx < CONTENT_STATUSES_ORDERED.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Label>Owner</Label>
              <Input
                value={draft.owner}
                onChange={(e) => setField("owner", e.target.value)}
              />
            </div>
            <div>
              <Label>Pillar</Label>
              <Select
                value={draft.pillar}
                onValueChange={(v) => setField("pillar", v as ContentPillar)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PILLAR_CONFIG) as ContentPillar[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PILLAR_CONFIG[p].emoji} {PILLAR_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select
                value={draft.format}
                onValueChange={(v) => {
                  const f = v as ContentFormat;
                  setField("format", f);
                  const preset =
                    draft.slaPresetKey ?? resolveSLAKey(f);
                  syncDeadlines(new Date(draft.publishDate), preset, f);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FORMAT_LABELS) as ContentFormat[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FORMAT_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content type</Label>
              <Select
                value={draft.contentType}
                onValueChange={(v) => setField("contentType", v as ContentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "educational",
                      "entertaining",
                      "promotional",
                      "inspirational",
                      "ugc",
                    ] as ContentType[]
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funnel</Label>
              <Select
                value={draft.funnelStage}
                onValueChange={(v) => setField("funnelStage", v as FunnelStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FUNNEL_CONFIG) as FunnelStage[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FUNNEL_CONFIG[f].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campaign (optional)</Label>
              <Input
                value={draft.campaign ?? ""}
                onChange={(e) => setField("campaign", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {(
                  ["instagram", "tiktok", "facebook", "youtube", "threads"] as Platform[]
                ).map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.platform.includes(p)}
                      onCheckedChange={(c) => {
                        const on = Boolean(c);
                        setField(
                          "platform",
                          on
                            ? [...draft.platform, p]
                            : draft.platform.filter((x) => x !== p)
                        );
                      }}
                    />
                    {PLATFORM_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deadlines & SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Publish date</Label>
                <Input
                  type="date"
                  value={dateStr(draft.publishDate)}
                  onChange={(e) => {
                    const next = new Date(e.target.value + "T12:00:00");
                    const preset =
                      draft.slaPresetKey ?? resolveSLAKey(draft.format);
                    syncDeadlines(next, preset, draft.format);
                  }}
                />
              </div>
              <div>
                <Label>Publish time</Label>
                <Input
                  type="time"
                  value={draft.publishTime ?? ""}
                  onChange={(e) => setField("publishTime", e.target.value)}
                />
              </div>
            </div>
            <SLAPresetPicker
              publishDate={new Date(draft.publishDate)}
              selectedPreset={slaPreset}
              onPresetChange={(preset) => {
                const dl = calculateDeadlines(
                  new Date(draft.publishDate),
                  preset
                );
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        slaPresetKey: preset,
                        briefDeadline: dl.briefDeadline,
                        productionDeadline: dl.productionDeadline,
                        approvalDeadline: dl.approvalDeadline,
                      }
                    : d
                );
              }}
            />
            <Separator />
            <div className="grid gap-2 text-xs">
              <CountdownTimer targetDate={new Date(draft.briefDeadline)} label="Brief Due" />
              <CountdownTimer
                targetDate={new Date(draft.productionDeadline)}
                label="Production Due"
              />
              <CountdownTimer
                targetDate={new Date(draft.approvalDeadline)}
                label="Approval Due"
              />
              <CountdownTimer targetDate={new Date(draft.publishDate)} label="Publish" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Brief content</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label>Topic *</Label>
            <Input value={draft.topic} onChange={(e) => setField("topic", e.target.value)} />
          </div>
          <div>
            <Label>Angle</Label>
            <Input value={draft.angle} onChange={(e) => setField("angle", e.target.value)} />
          </div>
          <div>
            <Label>Target audience</Label>
            <Textarea
              rows={2}
              value={draft.targetAudience}
              onChange={(e) => setField("targetAudience", e.target.value)}
            />
          </div>
          <div>
            <Label>Hook</Label>
            <Input value={draft.hook} onChange={(e) => setField("hook", e.target.value)} />
          </div>
          <div>
            <Label>Caption direction</Label>
            <Textarea
              rows={4}
              value={draft.captionDirection}
              onChange={(e) => setField("captionDirection", e.target.value)}
            />
          </div>
          <div>
            <Label>Visual direction</Label>
            <Textarea
              rows={4}
              value={draft.visualDirection}
              onChange={(e) => setField("visualDirection", e.target.value)}
            />
          </div>
          <div>
            <Label>CTA</Label>
            <Input value={draft.cta} onChange={(e) => setField("cta", e.target.value)} />
          </div>
          <div>
            <Label>Strategic notes</Label>
            <Textarea
              rows={2}
              value={draft.strategicNotes}
              onChange={(e) => setField("strategicNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">DO&apos;s</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setField("dos", [...draft.dos, ""])}
            >
              + Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.dos.map((line, i) => (
              <Input
                key={i}
                value={line}
                onChange={(e) => {
                  const next = [...draft.dos];
                  next[i] = e.target.value;
                  setField("dos", next);
                }}
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">DON&apos;Ts</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setField("donts", [...draft.donts, ""])}
            >
              + Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {draft.donts.map((line, i) => (
              <Input
                key={i}
                value={line}
                onChange={(e) => {
                  const next = [...draft.donts];
                  next[i] = e.target.value;
                  setField("donts", next);
                }}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">References & assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between gap-2">
            <Label className="flex-1">Reference links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setField("referenceLinks", [...draft.referenceLinks, ""])
              }
            >
              + Link
            </Button>
          </div>
          {draft.referenceLinks.map((url, i) => (
            <Input
              key={i}
              placeholder="https://"
              value={url}
              onChange={(e) => {
                const next = [...draft.referenceLinks];
                next[i] = e.target.value;
                setField("referenceLinks", next);
              }}
            />
          ))}
          <div>
            <Label>Asset folder link</Label>
            <Input
              placeholder="Drive / Dropbox URL"
              value={draft.assetFolderLink ?? ""}
              onChange={(e) => setField("assetFolderLink", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">KPI targets ({FUNNEL_CONFIG[draft.funnelStage].label})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {kpiFields.map(({ key, label, suffix }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={draft.kpiTargets[key] ?? ""}
                  onChange={(e) => {
                    const n = e.target.value === "" ? undefined : Number(e.target.value);
                    setField("kpiTargets", { ...draft.kpiTargets, [key]: n });
                  }}
                />
                {suffix && (
                  <span className="text-xs text-muted-foreground">{suffix}</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-4 backdrop-blur md:left-[240px] max-xl:md:left-[72px] max-md:left-0">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Link
            href="/briefs"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </Link>
          <Button onClick={save}>Save Brief</Button>
        </div>
      </div>
    </div>
  );
}
