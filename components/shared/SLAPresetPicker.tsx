"use client";

import { SLA_PRESETS } from "@/lib/constants";
import type { SLAPresetKey } from "@/lib/types";
import { calculateDeadlines } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SLAPresetPickerProps {
  publishDate: Date;
  selectedPreset: SLAPresetKey;
  onPresetChange: (preset: SLAPresetKey) => void;
  onDeadlinesCalculated?: (
    deadlines: ReturnType<typeof calculateDeadlines>
  ) => void;
  disabled?: boolean;
}

export function SLAPresetPicker({
  publishDate,
  selectedPreset,
  onPresetChange,
  onDeadlinesCalculated,
  disabled = false,
}: SLAPresetPickerProps) {
  const sla = SLA_PRESETS[selectedPreset];
  const deadlines = calculateDeadlines(publishDate, selectedPreset);

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

      <Card className="border-0 bg-slate-50 dark:bg-slate-900/40">
        <CardContent className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Deadline Timeline · {sla.emoji} {sla.label}
          </p>
          {[
            { label: "📝 เริ่มเขียน Brief", date: deadlines.briefDeadline },
            {
              label: "✅ Approve Brief",
              date: deadlines.briefApprovalDeadline,
            },
            { label: "🎨 Production Done", date: deadlines.productionDeadline },
            { label: "🔍 Internal Review", date: deadlines.reviewDeadline },
            {
              label: "⏳ Management Approve",
              date: deadlines.approvalDeadline,
            },
            { label: "🚀 Publish", date: publishDate },
          ].map((step, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {step.label}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {step.date.toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
