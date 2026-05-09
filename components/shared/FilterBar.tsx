"use client";

import { useState } from "react";
import {
  PILLAR_CONFIG,
  STATUS_CONFIG,
  FORMAT_LABELS,
  PLATFORM_LABELS,
  CONTENT_STATUSES_ORDERED,
} from "@/lib/constants";
import type {
  ContentPillar,
  ContentStatus,
  ContentFormat,
  Platform,
  FunnelStage,
  PlannerFilters,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

export type FilterOption =
  | "pillar"
  | "platform"
  | "status"
  | "format"
  | "month"
  | "owner"
  | "funnelStage"
  | "kpiFilter";

interface FilterBarProps {
  filters: PlannerFilters;
  onChange: (next: PlannerFilters) => void;
  options: FilterOption[];
  monthOptions?: { value: string; label: string }[];
  owners?: string[];
  className?: string;
}

const EMPTY: PlannerFilters = {
  pillar: "all",
  platform: "all",
  status: "all",
  format: "all",
  month: "all",
  owner: "all",
  funnelStage: "all",
  kpiFilter: "all",
};

function countActive(filters: PlannerFilters) {
  return Object.values(filters).filter((v) => v && v !== "all").length;
}

export function FilterBar({
  filters,
  onChange,
  options,
  monthOptions = [],
  owners = [],
  className,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const patch = (partial: Partial<PlannerFilters>) =>
    onChange({ ...filters, ...partial });

  const activeCount = countActive(filters);
  const hasFilters = activeCount > 0;

  // Split options: first 2 always visible, rest behind "more"
  const alwaysVisible = options.slice(0, 2);
  const extra = options.slice(2);
  const showExpand = extra.length > 0;

  const renderSelect = (opt: FilterOption) => {
    switch (opt) {
      case "status":
        return (
          <Select
            key="status"
            value={filters.status ?? "all"}
            onValueChange={(v) =>
              patch({ status: v === "all" ? "all" : (v as ContentStatus) })
            }
          >
            <SelectTrigger className="h-9 min-w-[150px] text-sm">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              {CONTENT_STATUSES_ORDERED.map((key) => {
                const s = STATUS_CONFIG[key];
                return (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.dotColor }}
                      />
                      {s.emoji} {s.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "pillar":
        return (
          <Select
            key="pillar"
            value={filters.pillar ?? "all"}
            onValueChange={(v) =>
              patch({ pillar: v === "all" ? "all" : (v as ContentPillar) })
            }
          >
            <SelectTrigger className="h-9 min-w-[140px] text-sm">
              <SelectValue placeholder="หมวด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวด</SelectItem>
              {(Object.keys(PILLAR_CONFIG) as ContentPillar[]).map((key) => {
                const c = PILLAR_CONFIG[key];
                return (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.emoji} {c.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "platform":
        return (
          <Select
            key="platform"
            value={filters.platform ?? "all"}
            onValueChange={(v) =>
              patch({ platform: v === "all" ? "all" : (v as Platform) })
            }
          >
            <SelectTrigger className="h-9 min-w-[140px] text-sm">
              <SelectValue placeholder="แพลตฟอร์ม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแพลตฟอร์ม</SelectItem>
              {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "format":
        return (
          <Select
            key="format"
            value={filters.format ?? "all"}
            onValueChange={(v) =>
              patch({ format: v === "all" ? "all" : (v as ContentFormat) })
            }
          >
            <SelectTrigger className="h-9 min-w-[130px] text-sm">
              <SelectValue placeholder="ฟอร์แมต" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกฟอร์แมต</SelectItem>
              {(Object.keys(FORMAT_LABELS) as ContentFormat[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FORMAT_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "month":
        return (
          <Select
            key="month"
            value={filters.month ?? "all"}
            onValueChange={(v) => patch({ month: v ?? "all" })}
          >
            <SelectTrigger className="h-9 min-w-[130px] text-sm">
              <SelectValue placeholder="เดือน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกเดือน</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "owner":
        return (
          <Select
            key="owner"
            value={filters.owner ?? "all"}
            onValueChange={(v) => patch({ owner: v ?? "all" })}
          >
            <SelectTrigger className="h-9 min-w-[120px] text-sm">
              <SelectValue placeholder="ผู้รับผิดชอบ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกคน</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "funnelStage":
        return (
          <Select
            key="funnelStage"
            value={filters.funnelStage ?? "all"}
            onValueChange={(v) =>
              patch({ funnelStage: v === "all" ? "all" : (v as FunnelStage) })
            }
          >
            <SelectTrigger className="h-9 min-w-[140px] text-sm">
              <SelectValue placeholder="Funnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Funnel</SelectItem>
              <SelectItem value="awareness">Awareness</SelectItem>
              <SelectItem value="consideration">Consideration</SelectItem>
              <SelectItem value="conversion">Conversion</SelectItem>
              <SelectItem value="loyalty">Loyalty</SelectItem>
            </SelectContent>
          </Select>
        );

      case "kpiFilter":
        return (
          <Select
            key="kpiFilter"
            value={filters.kpiFilter ?? "all"}
            onValueChange={(v) =>
              patch({ kpiFilter: (v ?? "all") as PlannerFilters["kpiFilter"] })
            }
          >
            <SelectTrigger className="h-9 min-w-[150px] text-sm">
              <SelectValue placeholder="KPI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">KPI ทั้งหมด</SelectItem>
              <SelectItem value="passed">ผ่านครบ</SelectItem>
              <SelectItem value="failed">มีที่ไม่ผ่าน</SelectItem>
              <SelectItem value="not_reviewed">ยังไม่รีวิว</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Always-visible selects */}
      {alwaysVisible.map(renderSelect)}

      {/* Expandable extra selects */}
      {showExpand && (
        <>
          <Button
            type="button"
            variant={expanded || extra.some((opt) => {
              const v = filters[opt as keyof PlannerFilters];
              return v && v !== "all";
            }) ? "secondary" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-sm"
            onClick={() => setExpanded((e) => !e)}
          >
            <MaterialIcon name="tune" size={16} />
            <span className="hidden sm:inline">ตัวกรองเพิ่มเติม</span>
            {extra.filter((opt) => {
              const v = filters[opt as keyof PlannerFilters];
              return v && v !== "all";
            }).length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {extra.filter((opt) => {
                  const v = filters[opt as keyof PlannerFilters];
                  return v && v !== "all";
                }).length}
              </span>
            )}
            <MaterialIcon
              name={expanded ? "expand_less" : "expand_more"}
              size={16}
              className="opacity-70"
            />
          </Button>
          {expanded && extra.map(renderSelect)}
        </>
      )}

      {/* Clear button with active count */}
      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => onChange(EMPTY)}
        >
          <MaterialIcon name="filter_alt_off" size={16} />
          <span className="hidden sm:inline">ล้างตัวกรอง</span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
            {activeCount}
          </span>
        </Button>
      )}
    </div>
  );
}
