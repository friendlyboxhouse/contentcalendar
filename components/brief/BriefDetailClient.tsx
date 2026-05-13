"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  ApprovalTrackRow,
  RevisionHistoryEntry,
  MilestoneKind,
  MilestoneStateEntry,
  TaskAssignee,
} from "@/lib/types";
import {
  PILLAR_CONFIG,
  CONTENT_STATUSES_ORDERED,
  FORMAT_LABELS,
  PLATFORM_LABELS,
  FUNNEL_CONFIG,
  STATUS_CONFIG,
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
import { MaterialIcon } from "@/components/ui/material-icon";
import { FormSection } from "@/components/ui/form-section";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  useSupabaseApp,
} from "@/components/supabase/SupabaseAppProvider";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";
import { reviveContentItems } from "@/lib/revive";
import { toastSupabasePersistError } from "@/lib/supabase/persistErrors";
import {
  OwnerMemberSelect,
  ownerStoredFromMember,
} from "@/components/shared/OwnerMemberSelect";
import { resolveOwnerUserId } from "@/lib/ownerMapping";
import {
  AssetFolderLinkField,
  ReferenceLinksField,
} from "@/components/shared/ReferenceLinksField";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { useContentStoreHydrated } from "@/hooks/useContentStoreHydrated";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContentTypes } from "@/hooks/useContentTypes";
import { AssigneePicker } from "@/components/shared/AssigneePicker";

const RevisionHistoryCard = dynamic(
  () =>
    import("@/components/brief/RevisionHistoryCard").then(
      (mod) => mod.RevisionHistoryCard
    ),
  { ssr: false }
);

const APPROVAL_ROLE_LABELS: Record<ApprovalTrackRow["role"], string> = {
  creative_lead: "Creative Lead",
  brand_manager: "Brand Manager",
  final: "Final approval",
};

const DEFAULT_APPROVAL_ROWS: ApprovalTrackRow[] = [
  { role: "creative_lead", name: "", approved: false },
  { role: "brand_manager", name: "", approved: false },
  { role: "final", name: "", approved: false },
];

function mergeApprovalTrack(rows?: ApprovalTrackRow[]): ApprovalTrackRow[] {
  return DEFAULT_APPROVAL_ROWS.map((base, i) => ({
    ...base,
    ...(rows?.[i] ?? {}),
    role: base.role,
  }));
}

function mergeBriefDraft(item: ContentItem): ContentItem {
  return {
    ...item,
    approvalTrack: mergeApprovalTrack(item.approvalTrack),
    revisionHistory: item.revisionHistory ?? [],
  };
}

type Props = { briefId?: string };

export function BriefDetailClient({ briefId }: Props) {
  const router = useRouter();
  const items = useContentStore((s) => s.items);
  const addItem = useContentStore((s) => s.addItem);
  const updateItem = useContentStore((s) => s.updateItem);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const {
    supabase,
    workspaceId,
    workspaceMembers,
    workspaceLoading,
    contentSyncedOnce,
    session,
  } = useSupabaseApp();
  const { canEdit } = usePlannerPermissions();
  const hydrated = useContentStoreHydrated();
  const { activeItems: contentTypes } = useContentTypes();

  const isNew = !briefId;
  const seedNewRef = useRef<ContentItem | null>(null);
  if (isNew && !seedNewRef.current) {
    seedNewRef.current = createEmptyBrief(items);
  }

  const existing = briefId
    ? items.find((i) => i.id === briefId)
    : undefined;

  useEffect(() => {
    if (!isNew || workspaceLoading) return;
    if (!canEdit) {
      toast.message("ไม่มีสิทธิ์สร้างบรีฟใหม่");
      router.replace("/briefs");
    }
  }, [isNew, canEdit, workspaceLoading, router]);

  const [draft, setDraft] = useState<ContentItem | null>(null);
  const [revNote, setRevNote] = useState("");
  const [revRound, setRevRound] = useState<RevisionRound>("R1");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionRoundPick, setRevisionRoundPick] =
    useState<RevisionRound>("R1");
  const [genericStatusOpen, setGenericStatusOpen] = useState(false);
  const [pendingGenericStatus, setPendingGenericStatus] =
    useState<ContentStatus | null>(null);

  const [secIdentity, setSecIdentity] = useState(true);
  const [secBrief, setSecBrief] = useState(true);
  const [secSchedule, setSecSchedule] = useState(true);
  const [secGuidelines, setSecGuidelines] = useState(false);
  const [secRefs, setSecRefs] = useState(false);
  const [secApproval, setSecApproval] = useState(false);
  const [secKpi, setSecKpi] = useState(false);
  const allOpen = secIdentity && secBrief && secSchedule && secGuidelines && secRefs && secApproval && secKpi;
  const expandAll = () => { setSecIdentity(true); setSecBrief(true); setSecSchedule(true); setSecGuidelines(true); setSecRefs(true); setSecApproval(true); setSecKpi(true); };
  const collapseAll = () => { setSecIdentity(false); setSecBrief(false); setSecSchedule(false); setSecGuidelines(false); setSecRefs(false); setSecApproval(false); setSecKpi(false); };

  useEffect(() => {
    if (isNew && seedNewRef.current) {
      setDraft((curr) => curr ?? mergeBriefDraft(seedNewRef.current!));
      return;
    }
    if (!isNew && existing) {
      // seed draft when store data arrives later (after workspace sync)
      setDraft((curr) => curr ?? mergeBriefDraft({ ...existing }));
    }
  }, [isNew, existing]);

  const slaPreset: SLAPresetKey =
    draft?.slaPresetKey ?? resolveSLAKey(draft?.format ?? "static_post");

  // Auto-save unsaved edits to localStorage every 1s for resilience.
  const autosaveKey = isNew ? "brief-new" : `brief-${briefId ?? ""}`;
  const { savedAt, hasUnsaved, clearDraft, loadDraft } = useDraftAutosave({
    key: autosaveKey,
    value: draft,
    debounceMs: 1000,
    disabled: !canEdit,
  });

  const draftHydratedRef = useRef<string | null>(null);

  useEffect(() => {
    const routeKey = `${isNew ? "new" : briefId}:${workspaceId ?? "offline"}`;
    if (draftHydratedRef.current === routeKey) return;

    const loc = loadDraft();
    const locTs = loc?.ts ?? 0;
    let best: ContentItem | null =
      loc?.value != null ? mergeBriefDraft(loc.value as ContentItem) : null;
    const localDraftTs = loc?.value != null ? locTs : -1;

    if (!supabase || !workspaceId || !session?.user) {
      if (best) setDraft(best);
      draftHydratedRef.current = routeKey;
      return;
    }

    draftHydratedRef.current = routeKey;

    const bk = isNew ? "new" : briefId!;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("brief_drafts")
        .select("payload, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("user_id", session.user.id)
        .eq("brief_key", bk)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.payload) {
        const cloudTs = new Date(data.updated_at as string).getTime();
        if (cloudTs > localDraftTs) {
          best = mergeBriefDraft(
            reviveContentItems([data.payload as ContentItem])[0]
          );
        }
      }

      if (best) setDraft(best);
    })();

    return () => {
      cancelled = true;
      if (draftHydratedRef.current === routeKey) draftHydratedRef.current = null;
    };
  }, [briefId, isNew, workspaceId, supabase, session?.user, loadDraft]);

  useEffect(() => {
    if (!canEdit || !supabase || !workspaceId || !session?.user || draft == null)
      return;

    const briefKey = isNew ? "new" : briefId!;
    const handle = window.setTimeout(() => {
      const payload = JSON.parse(JSON.stringify(draft)) as Record<
        string,
        unknown
      >;
      void supabase
        .from("brief_drafts")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: session.user.id,
            brief_key: briefKey,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,user_id,brief_key" }
        )
        .then(({ error }) => {
          if (error) toastSupabasePersistError(error);
        });
    }, 1800);

    return () => window.clearTimeout(handle);
  }, [draft, canEdit, workspaceId, supabase, session?.user, isNew, briefId]);

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

  const sectionBadges = useMemo(() => {
    if (!draft) return { identity: "", briefContent: "", schedule: "", guidelines: "", refs: "", approval: "", kpi: "" };

    const identityFields = [
      draft.owner.trim() !== "",
      (draft.assignees?.length ?? 0) > 0,
      true,
      true,
      true,
      true,
      (draft.campaign ?? "").trim() !== "",
      draft.platform.length > 0,
    ];
    const identityFilled = identityFields.filter(Boolean).length;

    const briefFields = [draft.topic, draft.angle, draft.targetAudience, draft.hook, draft.captionDirection, draft.visualDirection, draft.cta, draft.strategicNotes];
    const briefFilled = briefFields.filter((v) => (v ?? "").trim() !== "").length;

    const scheduleFields = [true, (draft.publishTime ?? "") !== "", true];
    const scheduleFilled = scheduleFields.filter(Boolean).length;

    const dosCount = draft.dos.filter((x) => x.trim()).length;
    const dontsCount = draft.donts.filter((x) => x.trim()).length;

    const refsFilled = [
      draft.referenceLinks.filter((x) => x.trim()).length > 0,
      (draft.assetFolderLink ?? "").trim() !== "",
    ].filter(Boolean).length;

    const approvalFilled = (draft.approvalTrack ?? []).filter((r) => r.name.trim() !== "").length;

    const kpiFilled = Object.values(draft.kpiTargets ?? {}).filter((v) => v !== undefined && v !== null).length;

    return {
      identity: `${identityFilled}/${identityFields.length}`,
      briefContent: `${briefFilled}/${briefFields.length}`,
      schedule: `${scheduleFilled}/${scheduleFields.length}`,
      guidelines: `${dosCount} DOs · ${dontsCount} DON'Ts`,
      refs: refsFilled > 0 ? `${refsFilled}/2` : "",
      approval: approvalFilled > 0 ? `${approvalFilled}/3` : "",
      kpi: kpiFilled > 0 ? `${kpiFilled} ฟิลด์` : "",
    };
  }, [draft]);

  if (!hydrated || workspaceLoading || !contentSyncedOnce) {
    return <PageSpinner label="กำลังซิงค์ข้อมูลบรีฟ…" />;
  }

  if (!isNew && !existing) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon="search_off"
          title="ไม่พบบรีฟนี้"
          description="อาจถูกลบแล้ว หรือ POST-ID ไม่ถูกต้อง — ลองกลับไปที่รายการบรีฟ"
        >
          <Link
            href="/briefs"
            className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
          >
            กลับไปรายการบรีฟ
          </Link>
        </EmptyState>
      </div>
    );
  }

  if (!draft) {
    return <PageSpinner label="กำลังเปิดบรีฟ…" />;
  }

  const setField = <K extends keyof ContentItem>(key: K, val: ContentItem[K]) =>
    setDraft((d) => (d ? { ...d, [key]: val } : d));

  const setMilestoneState = (
    kind: MilestoneKind,
    patch: Partial<MilestoneStateEntry>
  ) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            milestoneState: {
              ...(d.milestoneState ?? {}),
              [kind]: {
                ...(d.milestoneState?.[kind] ?? {}),
                ...patch,
              },
            },
          }
        : d
    );
  };

  const clearMilestoneOverride = (kind: MilestoneKind) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            milestoneState: {
              ...(d.milestoneState ?? {}),
              [kind]: {
                ...(d.milestoneState?.[kind] ?? {}),
                dateOverride: undefined,
              },
            },
          }
        : d
    );
  };

  const performStatusChange = (
    next: ContentStatus,
    revRoundArg?: RevisionRound
  ) => {
    if (!draft || !canEdit) return;
    if (next === "published") {
      if (!isNew) {
        updateStatus(draft.id, "published");
      }
      setField("status", "published");
      setField("publishedAt", new Date());
      toast.success("ตั้งเป็น Published แล้ว");
      return;
    }
    if (next === "revision") {
      const round = revRoundArg ?? "R1";
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

  const beginStatusChange = (next: ContentStatus) => {
    if (!canEdit || !draft) return;
    if (next === "published") {
      setPublishDialogOpen(true);
      return;
    }
    if (next === "revision") {
      setRevisionRoundPick(draft.revisionRound ?? "R1");
      setRevisionDialogOpen(true);
      return;
    }
    setPendingGenericStatus(next);
    setGenericStatusOpen(true);
  };

  const validateRequired = () => {
    if (!draft.topic.trim()) return "กรอก Topic ก่อนบันทึก";
    if (!draft.owner.trim()) return "กรอก Owner ก่อนบันทึก";
    return null;
  };

  const collectWarnings = (): string[] => {
    const w: string[] = [];
    if (!draft.platform.length) w.push("ยังไม่ได้เลือก Platform");
    const dos = draft.dos.filter((x) => x.trim());
    const donts = draft.donts.filter((x) => x.trim());
    if (!dos.length) w.push("ยังไม่มี DO's");
    if (!donts.length) w.push("ยังไม่มี DON'Ts");
    return w;
  };

  const save = () => {
    if (!canEdit) {
      toast.message("บัญชีของคุณเป็นโหมดดูอย่างเดียว");
      return;
    }
    const err = validateRequired();
    if (err) {
      toast.error(err);
      return;
    }
    const warnings = collectWarnings();
    for (const w of warnings) toast.warning(w);
    const cleaned: ContentItem = {
      ...draft,
      dos: draft.dos.filter((x) => x.trim()),
      donts: draft.donts.filter((x) => x.trim()),
      updatedAt: new Date(),
    };
    const cloudKey = isNew ? "new" : cleaned.id;
    if (supabase && workspaceId && session?.user) {
      void supabase
        .from("brief_drafts")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", session.user.id)
        .eq("brief_key", cloudKey)
        .then(({ error }) => {
          if (error) toastSupabasePersistError(error);
        });
    }

    if (isNew) {
      addItem(cleaned);
      clearDraft();
      toast.success(`บันทึก ${cleaned.id} และเพิ่มในปฏิทินแล้ว`);
      router.replace(`/briefs/${cleaned.id}`);
    } else {
      updateItem(cleaned.id, cleaned);
      clearDraft();
      toast.success(`บันทึก ${cleaned.id} แล้ว`);
    }
  };

  const dateStr = (d: Date) => format(new Date(d), "yyyy-MM-dd");

  const addRevisionEntry = () => {
    if (!canEdit) return;
    const note = revNote.trim();
    if (!note) {
      toast.error("กรอกบันทึก revision");
      return;
    }
    const entry: RevisionHistoryEntry = {
      round: revRound,
      date: new Date(),
      note,
    };
    setField("revisionHistory", [...(draft.revisionHistory ?? []), entry]);
    setRevNote("");
    toast.success("บันทึก revision แล้ว");
  };

  const setApprovalRow = (index: number, patch: Partial<ApprovalTrackRow>) => {
    const track = mergeApprovalTrack(draft.approvalTrack);
    track[index] = { ...track[index], ...patch };
    if (patch.approved === true && !track[index].approvedAt) {
      track[index].approvedAt = new Date();
    }
    if (patch.approved === false) {
      track[index].approvedAt = undefined;
    }
    setField("approvalTrack", track);
  };

  return (
    <div className="space-y-6 pb-28">
      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <MaterialIcon name="visibility" size={20} />
          โหมดดูอย่างเดียว — การแก้ไขและบันทึกถูกปิดสำหรับบทบาท viewer
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/briefs"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            ← กลับ
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MaterialIcon name="description" size={24} />
            {draft.id}
          </h1>
          <PillarTag pillar={draft.pillar} size="sm" />
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <span
              className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex"
              title={savedAt ? `บันทึกอัตโนมัติเมื่อ ${savedAt.toLocaleTimeString("th-TH")}` : ""}
            >
              {hasUnsaved ? (
                <>
                  <MaterialIcon
                    name="cloud_sync"
                    size={14}
                    className="animate-pulse text-amber-600 dark:text-amber-400"
                  />
                  <span>กำลังบันทึก…</span>
                </>
              ) : savedAt ? (
                <>
                  <MaterialIcon
                    name="cloud_done"
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  <span>บันทึกร่างอัตโนมัติแล้ว</span>
                </>
              ) : null}
            </span>
          )}
          {!isNew && (
            <Link
              href={`/performance/${draft.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm", className: "gap-1" })
              )}
            >
              <MaterialIcon name="bar_chart" size={18} />
              ผลงาน
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            className="hidden gap-1 sm:inline-flex"
            onClick={allOpen ? collapseAll : expandAll}
          >
            <MaterialIcon name={allOpen ? "expand_less" : "expand_more"} size={16} />
            {allOpen ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}
          </Button>
          <Button size="sm" onClick={save} disabled={!canEdit} className="gap-1">
            <MaterialIcon name="save" size={18} />
            บันทึกบรีฟ
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MaterialIcon name="timeline" size={18} />
            ท่อสถานะ
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 pb-1">
            {CONTENT_STATUSES_ORDERED.map((st, idx) => {
              const cfg = STATUS_CONFIG[st];
              const active = draft.status === st;
              return (
                <div key={st} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!canEdit}
                    aria-label={`เปลี่ยนสถานะเป็น ${cfg.label}`}
                    title={cfg.label}
                    className={cn(
                      "inline-flex min-h-10 min-w-[88px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition sm:min-w-[128px] disabled:pointer-events-none disabled:opacity-70",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    )}
                    onClick={() => beginStatusChange(st)}
                  >
                    <MaterialIcon
                      name={cfg.iconName}
                      size={14}
                      className={cn("shrink-0", !active && "text-muted-foreground")}
                    />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                  {idx < CONTENT_STATUSES_ORDERED.length - 1 && (
                    <MaterialIcon
                      name="chevron_right"
                      size={16}
                      className="shrink-0 text-muted-foreground/70"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection
          icon="person"
          title="Identity & Ownership"
          description="Owner, แพลตฟอร์ม, รูปแบบ, Funnel"
          badge={sectionBadges.identity}
          defaultOpen
          open={secIdentity}
          onOpenChange={setSecIdentity}
          requiredHint={!draft.owner.trim() ? "⚠ ยังไม่มี Owner" : undefined}
        >
          <div className="grid gap-3">
            <div>
              <Label>Owner <span className="text-destructive">*</span></Label>
              <OwnerMemberSelect
                members={workspaceMembers}
                ownerDisplay={draft.owner}
                disabled={!canEdit}
                onPickMember={(m) =>
                  setField("owner", ownerStoredFromMember(m))
                }
              />
              {draft.owner &&
                !resolveOwnerUserId(draft.owner, workspaceMembers) &&
                workspaceMembers.length > 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Owner &quot;{draft.owner}&quot; ยังไม่ตรงกับสมาชิกในทีม — กรุณาเลือกสมาชิกใหม่
                  </p>
                )}
            </div>
            <div>
              <Label>Assignees</Label>
              <AssigneePicker
                value={draft.assignees ?? []}
                disabled={!canEdit}
                onChange={(next) => setField("assignees", next as TaskAssignee[])}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Pillar</Label>
                <Select
                  value={draft.pillar}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                  onValueChange={(v) => setField("contentType", v as ContentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((t) => (
                      <SelectItem key={t.id} value={t.slug}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funnel</Label>
                <Select
                  value={draft.funnelStage}
                  disabled={!canEdit}
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
            </div>
            <div>
              <Label>Campaign <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MaterialIcon name="bolt" size={16} className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  value={draft.campaign ?? ""}
                  disabled={!canEdit}
                  placeholder="ชื่อแคมเปญ (ถ้ามี)"
                  onChange={(e) => setField("campaign", e.target.value)}
                />
              </InputGroup>
            </div>
            <div>
              <Label className="mb-2 block">Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {(
                  ["instagram", "tiktok", "facebook", "youtube", "threads"] as Platform[]
                ).map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
                    <Checkbox
                      checked={draft.platform.includes(p)}
                      disabled={!canEdit}
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
          </div>
        </FormSection>

        <FormSection
          icon="event_available"
          title="กำหนดการ & SLA"
          description="วันโพสต์, milestones, deadline"
          badge={sectionBadges.schedule}
          defaultOpen
          open={secSchedule}
          onOpenChange={setSecSchedule}
        >
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>วันที่โพสต์</Label>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <MaterialIcon name="calendar_month" size={16} className="text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="date"
                    value={dateStr(draft.publishDate)}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const next = new Date(e.target.value + "T12:00:00");
                      const preset =
                        draft.slaPresetKey ?? resolveSLAKey(draft.format);
                      syncDeadlines(next, preset, draft.format);
                    }}
                  />
                </InputGroup>
              </div>
              <div>
                <Label>เวลาโพสต์</Label>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <MaterialIcon name="schedule" size={16} className="text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="time"
                    value={draft.publishTime ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setField("publishTime", e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
            <SLAPresetPicker
              publishDate={new Date(draft.publishDate)}
              selectedPreset={slaPreset}
              fallbackStatus={draft.status}
              milestoneState={draft.milestoneState}
              disabled={!canEdit}
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
              onMilestoneStatusChange={(kind, status) => {
                if (!canEdit) return;
                setMilestoneState(kind, { status });
              }}
              onMilestoneDoneToggle={(kind, checked) => {
                if (!canEdit) return;
                setMilestoneState(kind, {
                  done: checked,
                  status: checked
                    ? kind === "publish"
                      ? "published"
                      : "approved"
                    : draft.status,
                });
              }}
              onMilestoneDateChange={(kind, date) => {
                if (!canEdit) return;
                const next = new Date(date);
                next.setHours(12, 0, 0, 0);
                setMilestoneState(kind, { dateOverride: next });
              }}
              onMilestoneDateReset={(kind) => {
                if (!canEdit) return;
                clearMilestoneOverride(kind);
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
          </div>
        </FormSection>
      </div>

      <FormSection
        icon="description"
        title="Brief Content"
        description="Topic, Angle, Hook, Caption, Visual, CTA"
        badge={sectionBadges.briefContent}
        defaultOpen
        open={secBrief}
        onOpenChange={setSecBrief}
        requiredHint={!draft.topic.trim() ? "⚠ ยังไม่มี Topic" : undefined}
      >
        <div className="grid gap-3">
          <div>
            <Label>Topic <span className="text-destructive">*</span></Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <MaterialIcon name="edit_note" size={16} className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={draft.topic}
                disabled={!canEdit}
                placeholder="หัวข้อหลักของคอนเทนต์"
                onChange={(e) => setField("topic", e.target.value)}
              />
            </InputGroup>
          </div>
          <div>
            <Label>Angle <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <Input
              value={draft.angle}
              disabled={!canEdit}
              placeholder="มุมมองหรือแนวทางที่ใช้"
              onChange={(e) => setField("angle", e.target.value)}
            />
          </div>
          <div>
            <Label>Target audience <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <Textarea
              rows={2}
              value={draft.targetAudience}
              disabled={!canEdit}
              placeholder="กลุ่มเป้าหมาย เช่น อายุ ความสนใจ"
              onChange={(e) => setField("targetAudience", e.target.value)}
            />
          </div>
          <div>
            <Label>Hook <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <MaterialIcon name="bolt" size={16} className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={draft.hook}
                disabled={!canEdit}
                placeholder="ประโยคแรกที่ดึงดูดความสนใจ"
                onChange={(e) => setField("hook", e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Caption direction <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
              <Textarea
                rows={4}
                value={draft.captionDirection}
                disabled={!canEdit}
                placeholder="แนวทางการเขียน caption"
                onChange={(e) => setField("captionDirection", e.target.value)}
              />
            </div>
            <div>
              <Label>Visual direction <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
              <Textarea
                rows={4}
                value={draft.visualDirection}
                disabled={!canEdit}
                placeholder="แนวทางภาพ โทนสี สไตล์"
                onChange={(e) => setField("visualDirection", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>CTA <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <MaterialIcon name="flag" size={16} className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={draft.cta}
                disabled={!canEdit}
                placeholder="Call to action ที่ต้องการให้ผู้ชมทำ"
                onChange={(e) => setField("cta", e.target.value)}
              />
            </InputGroup>
          </div>
          <div>
            <Label>Strategic notes <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <Textarea
              rows={2}
              value={draft.strategicNotes}
              disabled={!canEdit}
              placeholder="บันทึกเชิงกลยุทธ์หรือ insight เพิ่มเติม"
              onChange={(e) => setField("strategicNotes", e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        icon="fact_check"
        title="Guidelines — DO's & DON'Ts"
        description="สิ่งที่ควรทำและไม่ควรทำในคอนเทนต์นี้"
        badge={sectionBadges.guidelines}
        open={secGuidelines}
        onOpenChange={setSecGuidelines}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <MaterialIcon name="check_circle" size={15} />
                DO&apos;s
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit}
                onClick={() => setField("dos", [...draft.dos, ""])}
                className="h-7 gap-1 text-xs"
              >
                <MaterialIcon name="add" size={14} />
                เพิ่ม
              </Button>
            </div>
            {draft.dos.map((line, i) => (
              <InputGroup key={`dos-${i}-${line}`}>
                <InputGroupAddon align="inline-start">
                  <span className="text-[11px] font-bold text-emerald-500">{i + 1}</span>
                </InputGroupAddon>
                <InputGroupInput
                  value={line}
                  disabled={!canEdit}
                  placeholder="ควรทำ..."
                  onChange={(e) => {
                    const next = [...draft.dos];
                    next[i] = e.target.value;
                    setField("dos", next);
                  }}
                />
              </InputGroup>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <MaterialIcon name="close" size={15} />
                DON&apos;Ts
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit}
                onClick={() => setField("donts", [...draft.donts, ""])}
                className="h-7 gap-1 text-xs"
              >
                <MaterialIcon name="add" size={14} />
                เพิ่ม
              </Button>
            </div>
            {draft.donts.map((line, i) => (
              <InputGroup key={`donts-${i}-${line}`}>
                <InputGroupAddon align="inline-start">
                  <span className="text-[11px] font-bold text-rose-500">{i + 1}</span>
                </InputGroupAddon>
                <InputGroupInput
                  value={line}
                  disabled={!canEdit}
                  placeholder="ไม่ควรทำ..."
                  onChange={(e) => {
                    const next = [...draft.donts];
                    next[i] = e.target.value;
                    setField("donts", next);
                  }}
                />
              </InputGroup>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection
        icon="link"
        title="References & Assets"
        description="ลิงก์อ้างอิง, โฟลเดอร์ไฟล์งาน"
        badge={sectionBadges.refs}
        open={secRefs}
        onOpenChange={setSecRefs}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="flex-1">Reference links</Label>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  setField("referenceLinks", [...draft.referenceLinks, ""])
                }
              >
                <MaterialIcon name="add" size={14} />
                เพิ่มลิงก์
              </Button>
            ) : null}
          </div>
          <ReferenceLinksField
            links={draft.referenceLinks}
            canEdit={canEdit}
            onChange={(next) => setField("referenceLinks", next)}
          />
          <AssetFolderLinkField
            value={draft.assetFolderLink ?? ""}
            canEdit={canEdit}
            onChange={(v) => setField("assetFolderLink", v)}
          />
        </div>
      </FormSection>

      <FormSection
        icon="shield_person"
        title="Approval & Revisions"
        description="ผู้อนุมัติ, ประวัติการแก้ไข"
        badge={sectionBadges.approval}
        open={secApproval}
        onOpenChange={setSecApproval}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MaterialIcon name="fact_check" size={14} />
              Approval track
            </p>
            {(draft.approvalTrack ?? DEFAULT_APPROVAL_ROWS).map((row, idx) => (
              <div
                key={row.role}
                className="grid gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {APPROVAL_ROLE_LABELS[row.role]}
                  </Label>
                  <Input
                    placeholder="ชื่อผู้อนุมัติ"
                    value={row.name}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setApprovalRow(idx, { name: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 sm:items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={row.approved}
                      disabled={!canEdit}
                      onCheckedChange={(c) =>
                        setApprovalRow(idx, { approved: Boolean(c) })
                      }
                    />
                    อนุมัติแล้ว
                  </label>
                  {row.approvedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(row.approvedAt), "dd MMM yyyy HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <RevisionHistoryCard
            canEdit={canEdit}
            revRound={revRound}
            revNote={revNote}
            history={draft.revisionHistory ?? []}
            onRoundChange={setRevRound}
            onNoteChange={setRevNote}
            onAdd={addRevisionEntry}
          />
        </div>
      </FormSection>

      <FormSection
        icon="track_changes"
        title={`KPI Targets — ${FUNNEL_CONFIG[draft.funnelStage].label}`}
        description="เป้าหมายตัวชี้วัดตาม funnel stage"
        badge={sectionBadges.kpi}
        open={secKpi}
        onOpenChange={setSecKpi}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {kpiFields.map(({ key, label, suffix }) => (
            <div key={key}>
              <Label>{label}</Label>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MaterialIcon name="track_changes" size={15} className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="number"
                  value={draft.kpiTargets[key] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => {
                    const n = e.target.value === "" ? undefined : Number(e.target.value);
                    setField("kpiTargets", { ...draft.kpiTargets, [key]: n });
                  }}
                />
                {suffix && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{suffix}</InputGroupText>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
          ))}
        </div>
      </FormSection>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:left-[240px] max-xl:md:left-[72px] max-md:left-0">
        <div className="mx-auto flex max-w-5xl justify-end gap-2">
          <Link
            href="/briefs"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            ยกเลิก
          </Link>
          <Button onClick={save} disabled={!canEdit} className="gap-1">
            <MaterialIcon name="save" size={18} />
            บันทึกบรีฟ
          </Button>
        </div>
      </div>

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ตั้งเป็น Published?</DialogTitle>
            <DialogDescription>
              ระบบจะเริ่มนับ KPI reminder หลังโพสต์ — ตรวจสอบวันที่และข้อมูลให้ครบก่อนยืนยัน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => {
                performStatusChange("published");
                setPublishDialogOpen(false);
              }}
            >
              ยืนยัน Published
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เลือกรอบ Revision</DialogTitle>
            <DialogDescription>
              เลือกรอบที่สอดคล้องกับงานแก้ไขปัจจุบัน
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {(["R1", "R2", "R3+"] as RevisionRound[]).map((r) => (
              <Button
                key={r}
                type="button"
                variant={revisionRoundPick === r ? "default" : "outline"}
                size="sm"
                className="min-w-[4rem]"
                onClick={() => setRevisionRoundPick(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevisionDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => {
                performStatusChange("revision", revisionRoundPick);
                setRevisionDialogOpen(false);
              }}
            >
              ยืนยัน Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={genericStatusOpen} onOpenChange={setGenericStatusOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เปลี่ยนสถานะ?</DialogTitle>
            <DialogDescription>
              {pendingGenericStatus
                ? `เปลี่ยนเป็น “${STATUS_CONFIG[pendingGenericStatus].label}”`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGenericStatusOpen(false);
                setPendingGenericStatus(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingGenericStatus) {
                  performStatusChange(pendingGenericStatus);
                }
                setGenericStatusOpen(false);
                setPendingGenericStatus(null);
              }}
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
