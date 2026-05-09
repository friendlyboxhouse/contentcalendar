"use client";

import type { ContentItem } from "@/lib/types";
import {
  aggregateStats,
  getWeeklyItems,
  getAtRiskItems,
  aggregateWorkloadByOwner,
} from "@/lib/reportUtils";
import { SECTION, RT } from "@/lib/reportStyles";
import { ReportHeader, formatWeekRangeLabel } from "@/components/export/report-components/ReportHeader";
import { ExecSummaryStrip } from "@/components/export/report-components/ExecSummaryStrip";
import { WeeklyCalendarGrid } from "@/components/export/report-components/WeeklyCalendarGrid";
import { PipelineStatusBar } from "@/components/export/report-components/PipelineStatusBar";
import { ContentDetailTable } from "@/components/export/report-components/ContentDetailTable";
import { DeadlineAlertSection } from "@/components/export/report-components/DeadlineAlertSection";
import { ReportFooter } from "@/components/export/report-components/ReportFooter";
import { STATUS_CONFIG } from "@/lib/constants";

export interface WeeklyReportOptions {
  includeDeadlineAlerts: boolean;
  showTeamWorkload: boolean;
}

interface WeeklyReportProps {
  items: ContentItem[];
  weekStart: Date;
  brandName: string;
  generatedAt: Date;
  reportFooterNote?: string;
  options?: WeeklyReportOptions;
}

const defaultOptions: WeeklyReportOptions = {
  includeDeadlineAlerts: true,
  showTeamWorkload: true,
};

export function WeeklyReport({
  items,
  weekStart,
  brandName,
  generatedAt,
  reportFooterNote,
  options = defaultOptions,
}: WeeklyReportProps) {
  const opts = { ...defaultOptions, ...options };
  const weekItems = getWeeklyItems(items, weekStart);
  const stats = aggregateStats(weekItems);
  const atRisk = opts.includeDeadlineAlerts
    ? getAtRiskItems(weekItems)
    : { overdue: [], critical: [], warning: [] };
  const workload = aggregateWorkloadByOwner(weekItems);

  const dateRange = formatWeekRangeLabel(weekStart);

  return (
    <div className="bg-white text-gray-900">
      <div className="report-page relative flex flex-col">
        <ReportHeader
          brandName={brandName}
          reportType="Weekly Action Plan"
          dateRange={dateRange}
          generatedAt={generatedAt}
          weekAnchor={weekStart}
        />

        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>Week at a glance</span>
          </div>
          <ExecSummaryStrip
            columns={5}
            stats={[
              {
                label: "Total this week",
                value: weekItems.length,
                unit: "posts",
                icon: "layers",
              },
              {
                label: "Published",
                value: stats.published,
                icon: "check",
              },
              {
                label: "Scheduled",
                value: stats.scheduled,
                highlight: true,
                icon: "calendar",
              },
              {
                label: "In production",
                value: stats.inProduction,
                icon: "chart",
              },
              {
                label: "Pending approval",
                value: stats.pendingApproval,
                icon: "clock",
              },
            ]}
          />
        </div>

        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>Content schedule</span>
          </div>
          <WeeklyCalendarGrid items={weekItems} weekStart={weekStart} />
        </div>

        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>Production pipeline</span>
          </div>
          <PipelineStatusBar stats={stats} />
        </div>

        <ReportFooter
          brandName={brandName}
          currentPage={1}
          totalPages={2}
          generatedAt={generatedAt}
          footerNote={reportFooterNote}
        />
      </div>

      <div className="page-break" />

      <div className="report-page relative flex flex-col">
        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>All content this week</span>
          </div>
          <ContentDetailTable items={weekItems} showPerformance={false} />
        </div>

        {opts.includeDeadlineAlerts &&
          (atRisk.overdue.length > 0 ||
            atRisk.critical.length > 0 ||
            atRisk.warning.length > 0) && (
            <div className={SECTION.wrapper}>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>Deadline alerts</span>
              </div>
              <DeadlineAlertSection {...atRisk} />
            </div>
          )}

        {opts.showTeamWorkload && (
          <div className={SECTION.wrapper}>
            <div className={SECTION.headerWithLine}>
              <div className={SECTION.divider} />
              <span className={RT.sectionLabel}>Team workload</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className={RT.tableHeader + " px-3 py-2"}>Owner</th>
                    <th className={RT.tableHeader + " px-3 py-2 text-right"}>
                      Items
                    </th>
                    <th className={RT.tableHeader + " px-3 py-2"}>
                      Status breakdown
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workload.map((row) => (
                    <tr key={row.owner} className="border-b border-gray-100">
                      <td className={RT.tableCell + " px-3 py-2 font-medium"}>
                        {row.owner}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.count}
                      </td>
                      <td className={RT.tableCell + " px-3 py-2 text-[12px] text-gray-600"}>
                        {Object.entries(row.byStatus)
                          .filter(([, n]) => n && n > 0)
                          .map(([st, n]) => (
                            <span key={st} className="mr-2 inline-block">
                              {STATUS_CONFIG[st as keyof typeof STATUS_CONFIG].emoji}{" "}
                              {STATUS_CONFIG[st as keyof typeof STATUS_CONFIG].label}:{" "}
                              {n}
                            </span>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ReportFooter
          brandName={brandName}
          currentPage={2}
          totalPages={2}
          generatedAt={generatedAt}
          footerNote={reportFooterNote}
        />
      </div>
    </div>
  );
}
