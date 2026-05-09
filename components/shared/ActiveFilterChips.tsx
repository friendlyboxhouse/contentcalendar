"use client";

import {
  PILLAR_CONFIG,
  STATUS_CONFIG,
  FORMAT_LABELS,
  PLATFORM_LABELS,
} from "@/lib/constants";
import type { PlannerFilters } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

interface ActiveFilterChipsProps {
  filters: PlannerFilters;
  onChange: (next: PlannerFilters) => void;
  className?: string;
}

interface ChipDef {
  key: keyof PlannerFilters;
  label: string;
  emoji?: string;
}

function buildChips(f: PlannerFilters): ChipDef[] {
  const chips: ChipDef[] = [];
  if (f.status && f.status !== "all") {
    const cfg = STATUS_CONFIG[f.status];
    chips.push({
      key: "status",
      label: cfg.label,
      emoji: cfg.emoji,
    });
  }
  if (f.pillar && f.pillar !== "all") {
    const cfg = PILLAR_CONFIG[f.pillar];
    chips.push({
      key: "pillar",
      label: cfg.label,
      emoji: cfg.emoji,
    });
  }
  if (f.platform && f.platform !== "all") {
    chips.push({
      key: "platform",
      label: PLATFORM_LABELS[f.platform] ?? f.platform,
    });
  }
  if (f.format && f.format !== "all") {
    chips.push({
      key: "format",
      label: FORMAT_LABELS[f.format] ?? f.format,
    });
  }
  if (f.owner && f.owner !== "all") {
    chips.push({ key: "owner", label: `ผู้รับผิดชอบ: ${f.owner}` });
  }
  if (f.month && f.month !== "all") {
    chips.push({ key: "month", label: `เดือน: ${f.month}` });
  }
  if (f.funnelStage && f.funnelStage !== "all") {
    chips.push({ key: "funnelStage", label: `Funnel: ${f.funnelStage}` });
  }
  if (f.kpiFilter && f.kpiFilter !== "all") {
    const map = {
      passed: "KPI ผ่านครบ",
      failed: "KPI มีไม่ผ่าน",
      not_reviewed: "ยังไม่รีวิว KPI",
    } as const;
    chips.push({ key: "kpiFilter", label: map[f.kpiFilter] });
  }
  return chips;
}

export function ActiveFilterChips({
  filters,
  onChange,
  className,
}: ActiveFilterChipsProps) {
  const chips = buildChips(filters);
  if (!chips.length) return null;

  const removeChip = (key: keyof PlannerFilters) => {
    onChange({ ...filters, [key]: "all" });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => removeChip(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 hover:border-primary/30 transition-colors"
          aria-label={`ลบตัวกรอง ${chip.label}`}
        >
          {chip.emoji && <span>{chip.emoji}</span>}
          <span>{chip.label}</span>
          <MaterialIcon name="close" size={12} className="opacity-70" />
        </button>
      ))}
    </div>
  );
}
