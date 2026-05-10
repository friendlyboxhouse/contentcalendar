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
import { buildReportPrintStyles } from "@/lib/reportStyles";
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
import { MaterialIcon } from "@/components/ui/material-icon";

type ReportKind = "weekly" | "monthly";
type OrientationMode = "auto" | "portrait" | "landscape";

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
  const [orientation, setOrientation] = useState<OrientationMode>("auto");
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
  const effectiveOrientation =
    orientation === "auto"
      ? kind === "monthly"
        ? "landscape"
        : "portrait"
      : orientation;
  const orientationLabel =
    effectiveOrientation === "landscape" ? "A4 - แนวนอน" : "A4 - แนวตั้ง";

  const scrollPreview = () => {
    document.getElementById("report-print-root")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleExportPdf = () => {
    injectHeadFragment(buildReportPrintStyles(effectiveOrientation));

    window.setTimeout(() => {
      window.print();
      const cleanup = () => {
        document.getElementById("report-print-styles")?.remove();
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
        <DialogTitle className="sr-only">ส่งออกรายงาน</DialogTitle>

        <aside className="no-print flex w-full shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:h-full md:w-[280px] md:border-r md:border-b-0">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-[18px] font-semibold text-gray-900">
              ส่งออกรายงาน
            </h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                ประเภทรายงาน
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
                    <MaterialIcon name="calendar_month" size={18} />
                    แผนรายสัปดาห์
                  </span>
                  <span className="mt-1 text-[12px] text-gray-500">
                    ตาราง 7 วัน + pipeline
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
                    <MaterialIcon name="bar_chart" size={18} />
                    รายงานผู้บริหารรายเดือน
                  </span>
                  <span className="mt-1 text-[12px] text-gray-500">
                    สรุปเชิงลึก + ผลงาน
                  </span>
                </button>
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {kind === "weekly" ? "เลือกสัปดาห์" : "เลือกเดือน"}
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

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                การวางหน้ากระดาษ
              </p>
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOrientation("auto")}
                  className={cn(
                    "px-2 py-2 text-center text-[12px] font-medium transition-colors",
                    orientation === "auto"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  className={cn(
                    "border-x border-gray-200 px-2 py-2 text-center text-[12px] font-medium transition-colors",
                    orientation === "portrait"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  แนวตั้ง
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  className={cn(
                    "px-2 py-2 text-center text-[12px] font-medium transition-colors",
                    orientation === "landscape"
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  แนวนอน
                </button>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Auto: รายสัปดาห์เป็นแนวตั้ง และรายเดือนเป็นแนวนอน
              </p>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                ตัวเลือก
              </p>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includePerformance}
                  onCheckedChange={(v) =>
                    setIncludePerformance(v === true)
                  }
                />
                รวมข้อมูลผลงาน
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includeDeadlineAlerts}
                  onCheckedChange={(v) =>
                    setIncludeDeadlineAlerts(v === true)
                  }
                />
                รวมการแจ้งเตือนเดดไลน์
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={includeRecommendations}
                  onCheckedChange={(v) =>
                    setIncludeRecommendations(v === true)
                  }
                />
                รวมข้อเสนอแนะ
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                <Checkbox
                  checked={showTeamWorkload}
                  onCheckedChange={(v) =>
                    setShowTeamWorkload(v === true)
                  }
                />
                แสดงภาระงานทีม
              </label>
            </section>
          </div>

          <div className="no-print space-y-2 border-t border-gray-200 p-4">
            <Button
              type="button"
              className="w-full gap-2"
              onClick={handleExportPdf}
            >
              <MaterialIcon name="picture_as_pdf" size={18} />
              ส่งออกเป็น PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-gray-300"
              onClick={scrollPreview}
            >
              <MaterialIcon name="visibility" size={18} />
              ดูตัวอย่าง
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-gray-500"
              disabled
            >
              <MaterialIcon name="link" size={18} />
              คัดลอกลิงก์แชร์
            </Button>
            <p className="text-center text-xs text-gray-400">
              PDF ออกแบบให้พิมพ์ได้ดีใน Chrome หรือ Edge
            </p>
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="mx-auto mb-4 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700">
              {orientationLabel}
            </div>
            <div
              className={cn(
                "report-scale-wrapper mx-auto origin-top scale-[0.75]",
                effectiveOrientation === "landscape"
                  ? "w-[1123px]"
                  : "w-[794px]"
              )}
            >
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
            <p className="mt-4 text-center text-xs text-gray-400">
              ตัวอย่างแสดง 75% ({orientationLabel}) - ไฟล์ PDF เต็มขนาดจริง
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
