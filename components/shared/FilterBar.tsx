"use client";

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

export function FilterBar({
  filters,
  onChange,
  options,
  monthOptions = [],
  owners = [],
  className,
}: FilterBarProps) {
  const patch = (partial: Partial<PlannerFilters>) =>
    onChange({ ...filters, ...partial });

  const active =
    (filters.pillar && filters.pillar !== "all") ||
    (filters.platform && filters.platform !== "all") ||
    (filters.status && filters.status !== "all") ||
    (filters.format && filters.format !== "all") ||
    (filters.month && filters.month !== "all") ||
    (filters.owner && filters.owner !== "all") ||
    (filters.funnelStage && filters.funnelStage !== "all") ||
    (filters.kpiFilter && filters.kpiFilter !== "all");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm",
        className
      )}
    >
      {options.includes("pillar") && (
        <Select
          value={filters.pillar ?? "all"}
          onValueChange={(v) => {
            const nv = v ?? "all";
            patch({
              pillar: nv === "all" ? "all" : (nv as ContentPillar),
            });
          }}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Pillar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Pillar</SelectItem>
            {(Object.keys(PILLAR_CONFIG) as ContentPillar[]).map((key) => {
              const c = PILLAR_CONFIG[key];
              return (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.emoji} {c.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {options.includes("platform") && (
        <Select
          value={filters.platform ?? "all"}
          onValueChange={(v) => {
            const nv = v ?? "all";
            patch({
              platform: nv === "all" ? "all" : (nv as Platform),
            });
          }}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Platform" />
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
      )}

      {options.includes("status") && (
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => {
            const nv = v ?? "all";
            patch({
              status: nv === "all" ? "all" : (nv as ContentStatus),
            });
          }}
        >
          <SelectTrigger className="min-w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            {CONTENT_STATUSES_ORDERED.map((key) => {
              const s = STATUS_CONFIG[key];
              return (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.dotColor }}
                    />
                    {s.emoji} {s.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {options.includes("format") && (
        <Select
          value={filters.format ?? "all"}
          onValueChange={(v) => {
            const nv = v ?? "all";
            patch({
              format: nv === "all" ? "all" : (nv as ContentFormat),
            });
          }}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Format" />
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
      )}

      {options.includes("month") && (
        <Select
          value={filters.month ?? "all"}
          onValueChange={(v) => patch({ month: v ?? "all" })}
        >
          <SelectTrigger className="min-w-[140px]">
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
      )}

      {options.includes("owner") && (
        <Select
          value={filters.owner ?? "all"}
          onValueChange={(v) => patch({ owner: v ?? "all" })}
        >
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Owner</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {options.includes("funnelStage") && (
        <Select
          value={filters.funnelStage ?? "all"}
          onValueChange={(v) => {
            const nv = v ?? "all";
            patch({
              funnelStage: nv === "all" ? "all" : (nv as FunnelStage),
            });
          }}
        >
          <SelectTrigger className="min-w-[150px]">
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
      )}

      {options.includes("kpiFilter") && (
        <Select
          value={filters.kpiFilter ?? "all"}
          onValueChange={(v) =>
            patch({
              kpiFilter: (v ?? "all") as PlannerFilters["kpiFilter"],
            })
          }
        >
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="KPI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">KPI ทั้งหมด</SelectItem>
            <SelectItem value="passed">ผ่านครบ</SelectItem>
            <SelectItem value="failed">มีที่ไม่ผ่าน</SelectItem>
            <SelectItem value="not_reviewed">ยังไม่รีวิว</SelectItem>
          </SelectContent>
        </Select>
      )}

      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() =>
            onChange({
              pillar: "all",
              platform: "all",
              status: "all",
              format: "all",
              month: "all",
              owner: "all",
              funnelStage: "all",
              kpiFilter: "all",
            })
          }
        >
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
