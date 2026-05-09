"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { ContentItem } from "@/lib/types";
import { PRINT_STYLES } from "@/lib/reportStyles";
import { getMonthlyItems, getWeeklyItems } from "@/lib/reportUtils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WeeklyReport } from "@/components/export/WeeklyReport";
import { MonthlyReport } from "@/components/export/MonthlyReport";
import { cn } from "@/lib/utils";
import { CalendarDays, FileDown, Eye, Link2, BarChart3 } from "lucide-react";

type ReportKind = "weekly" | "monthly";

function injectHeadFragment(html: string) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  const node = tpl.content.firstElementChild;
  if (node) document.head.appendChild(node);
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  items: ContentItem[];
  brandName?: string;
  reportFooterNote?: string;
}

export function ExportModal({
  open,
  onClose,
  items,
  brandName = "DINKR",
  reportFooterNote = "",
}: ExportModalProps) {
  const [kind, setKind] = useState<ReportKind>("weekly");
  const [weekIdx, setWeekIdx] = useState(4);
  const [monthIdx, setMonthIdx] = useState(3);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [includeDeadlineAlerts, setIncludeDeadlineAlerts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [showTeamWorkload, setShowTeamWorkload] = useState(true);

  const generatedAt = useMemo(() => new Date(), []);

  const weekOptions = useMemo(() => {
    const anchor = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 9 }, (_, i) => addWeeks(anchor, i - 4));
  }, []);

  const monthOptions = useMemo(() => {
    const start = startOfMonth(new Date());
    return Array.from({ length: 6 }, (_, i) => addMonths(start, i - 3));
  }, []);

  const selectedWeekStart = weekOptions[weekIdx] ?? weekOptions[4];
  const selectedMonth = monthOptions[monthIdx] ?? monthOptions[3];
  const selYear = selectedMonth.getFullYear();
  const selMonthNum = selectedMonth.getMonth() + 1;

  const scrollPreview = () => {
    document.getElementById("report-print-root")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleExportPdf = () => {
    injectHeadFragment(PRINT_STYLES);

    const orientationStyle = document.createElement("style");
    orientationStyle.id = "report-orientation";
    orientationStyle.textContent =
      "@media print { @page { size: A4 portrait; margin: 0; } }";
    document.head.appendChild(orientationStyle);

    window.setTimeout(() => {
      window.print();
      const cleanup = () => {
        document.getElementById("report-print-styles")?.remove();
        document.getElementById("report-orientation")?.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed inset-0 left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 shadow-none sm:max-w-none",
          "flex-col md:flex-row"
        )}
      >
        <DialogTitle className="sr-only">Export Report</DialogTitle>

        <aside className="no-print flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:h-full md:w-[280px] md:border-r md:border-b-0">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-[18px] font-semibold text-gray-900">
              Export Report
            </h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Report type
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setKind("weekly")}
                  className={cn(
                    "flex w-full flex-col rounded-xl border-2 bg-white p-3 text-left transition-colors",
                    kind === "weekly"
                      ? "border-gray-900"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
                    <CalendarDays className="h-4 w-4" />
                    Weekly Action Plan
                  </span>
                  <span className="mt-1 text-[12px] text-gray-500">
                    7-day schedule + pipeline
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind("monthly")}
                  className={cn(
                    "flex w-full flex-col rounded-xl border-2 bg-white p-3 text-left transition-colors",
                    kind === "monthly"
                      ? "border-gray-900"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
                    <BarChart3 className="h-4 w-4" />
                    Monthly Executive Report
                  </span>
                  <span className="mt-1 text-[12px] text-gray-500">
                    Full analysis + performance
                  </span>
                </button>
              </div>
            </section>

            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {kind === "weekly" ? "Select week" : "Select month"}
              </p>
              {kind === "weekly" ? (
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                  value={weekIdx}
                  onChange={(e) => setWeekIdx(Number(e.target.value))}
                >
                  {weekOptions.map((w, i) => (
                    <option key={w.toISOString()} value={i}>
                      Week of {format(w, "d MMM yyyy")} ({getWeeklyItems(items, w).length}{" "}
                      posts)
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px]"
                  value={monthIdx}
                  onChange={(e) => setMonthIdx(Number(e.target.value))}
                >
                  {monthOptions.map((m, i) => (
                    <option key={m.toISOString()} value={i}>
                      {format(m, "MMMM yyyy")} (
                      {getMonthlyItems(items, m.getFullYear(), m.getMonth() + 1).length}{" "}
                      posts)
                    </option>
                  ))}
                </select>
              )}
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Options
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includePerformance}
                  onCheckedChange={(v) =>
                    setIncludePerformance(v === true)
                  }
                />
                Include performance data
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includeDeadlineAlerts}
                  onCheckedChange={(v) =>
                    setIncludeDeadlineAlerts(v === true)
                  }
                />
                Include deadline alerts
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includeRecommendations}
                  onCheckedChange={(v) =>
                    setIncludeRecommendations(v === true)
                  }
                />
                Include recommendations
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={showTeamWorkload}
                  onCheckedChange={(v) =>
                    setShowTeamWorkload(v === true)
                  }
                />
                Show team workload
              </label>
            </section>
          </div>

          <div className="no-print space-y-2 border-t border-gray-200 p-4">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={handleExportPdf}
            >
              <FileDown className="h-4 w-4" />
              Export as PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-gray-300"
              onClick={scrollPreview}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-gray-500"
              disabled
            >
              <Link2 className="h-4 w-4" />
              Copy share link
            </Button>
            <p className="text-center text-[10px] text-gray-400">
              PDF exports best in Chrome or Edge
            </p>
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="report-scale-wrapper mx-auto origin-top scale-[0.75]">
              <div id="report-print-root" className="bg-white">
                {kind === "weekly" ? (
                  <WeeklyReport
                    items={items}
                    weekStart={selectedWeekStart}
                    brandName={brandName}
                    generatedAt={generatedAt}
                    reportFooterNote={reportFooterNote}
                    options={{
                      includeDeadlineAlerts,
                      showTeamWorkload,
                    }}
                  />
                ) : (
                  <MonthlyReport
                    items={items}
                    year={selYear}
                    month={selMonthNum}
                    brandName={brandName}
                    generatedAt={generatedAt}
                    reportFooterNote={reportFooterNote}
                    options={{
                      includePerformance,
                      includeDeadlineAlerts,
                      includeRecommendations,
                    }}
                  />
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-gray-400">
              Preview at 75% — exported PDF will be full size
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
