"use client";

import { SLA_PRESETS } from "@/lib/constants";
import type {
  ContentStatus,
  MilestoneKind,
  MilestoneStateEntry,
  SLAPresetKey,
} from "@/lib/types";
import { calculateDeadlines } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CALENDAR_EVENT_META } from "@/lib/calendarEvents";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TIMELINE_KINDS: MilestoneKind[] = [
  "brief",
  "briefApprove",
  "production",
  "review",
  "mgmtApprove",
  "publish",
];

const MILESTONE_DEFAULT_STATUS: Record<MilestoneKind, ContentStatus> = {
  brief: "in_brief",
  briefApprove: "pending_approval",
  production: "in_production",
  review: "in_review",
  mgmtApprove: "pending_approval",
  publish: "scheduled",
};

function dateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface SLAPresetPickerProps {
  publishDate: Date;
  selectedPreset: SLAPresetKey;
  fallbackStatus?: ContentStatus;
  milestoneState?: Partial<Record<MilestoneKind, MilestoneStateEntry>>;
  onPresetChange: (preset: SLAPresetKey) => void;
  onMilestoneStatusChange?: (kind: MilestoneKind, status: ContentStatus) => void;
  onMilestoneDoneToggle?: (kind: MilestoneKind, checked: boolean) => void;
  onMilestoneDateChange?: (kind: MilestoneKind, date: Date) => void;
  onMilestoneDateReset?: (kind: MilestoneKind) => void;
  onDeadlinesCalculated?: (
    deadlines: ReturnType<typeof calculateDeadlines>
  ) => void;
  disabled?: boolean;
}

export function SLAPresetPicker({
  publishDate,
  selectedPreset,
  fallbackStatus = "in_brief",
  milestoneState,
  onPresetChange,
  onMilestoneStatusChange,
  onMilestoneDoneToggle,
  onMilestoneDateChange,
  onMilestoneDateReset,
  onDeadlinesCalculated,
  disabled = false,
}: SLAPresetPickerProps) {
  const sla = SLA_PRESETS[selectedPreset];
  const deadlines = calculateDeadlines(publishDate, selectedPreset);
  const recommendedDates: Record<MilestoneKind, Date> = {
    brief: deadlines.briefDeadline,
    briefApprove: deadlines.briefApprovalDeadline,
    production: deadlines.productionDeadline,
    review: deadlines.reviewDeadline,
    mgmtApprove: deadlines.approvalDeadline,
    publish: publishDate,
  };

  const handleChange = (value: string | null) => {
    if (!value) return;
    const preset = value as SLAPresetKey;
    onPresetChange(preset);
    onDeadlinesCalculated?.(calculateDeadlines(publishDate, preset));
  };

  return (
    <div className="space-y-3">
      <Select
        value={selectedPreset}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="เลือก SLA Preset" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SLA_PRESETS) as SLAPresetKey[]).map((key) => {
            const preset = SLA_PRESETS[key];
            return (
              <SelectItem key={key} value={key}>
                {preset.emoji} {preset.label} ({preset.totalDays} วันทำการ)
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Card className="border-0 bg-muted/40">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Deadline Timeline · {sla.emoji} {sla.label}
          </p>
          {TIMELINE_KINDS.map((kind) => {
            const state = milestoneState?.[kind];
            const recommended = new Date(recommendedDates[kind]);
            const effective = state?.dateOverride
              ? new Date(state.dateOverride)
              : recommended;
            const status =
              state?.status ?? fallbackStatus ?? MILESTONE_DEFAULT_STATUS[kind];
            return (
              <div key={kind} className="space-y-1 rounded-md border border-border/60 bg-background/80 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {CALENDAR_EVENT_META[kind].label}
                  </span>
                  <div className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(state?.done)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        onMilestoneDoneToggle?.(kind, checked === true)
                      }
                      aria-label={`toggle ${kind} done`}
                    />
                    <StatusBadge
                      status={status}
                      editable={!disabled}
                      onChange={(next) => onMilestoneStatusChange?.(kind, next)}
                      className="min-h-6 px-2 py-0 text-[10px]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={dateInputValue(effective)}
                    disabled={disabled}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onMilestoneDateChange?.(
                        kind,
                        new Date(`${e.target.value}T12:00:00`)
                      );
                    }}
                    className="h-8 w-[150px] text-xs"
                  />
                  {state?.dateOverride ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => onMilestoneDateReset?.(kind)}
                    >
                      Reset
                    </Button>
                  ) : null}
                  <span className="text-[11px] text-muted-foreground">
                    แนะนำ {recommended.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
