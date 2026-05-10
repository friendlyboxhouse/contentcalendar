"use client";

import {
  addMonths,
  differenceInCalendarDays,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { ContentFormat, ContentItem } from "@/lib/types";
import {
  aggregatePerformance,
  aggregateStats,
  formatReachK,
  generateRecommendations,
  getAtRiskItems,
  getMonthlyItems,
  getTopPosts,
} from "@/lib/reportUtils";
import { CONTENT_FORMATS_ALL, PILLAR_KEYS } from "@/lib/reportConstants";
import { SECTION, RT } from "@/lib/reportStyles";
import {
  FORMAT_LABELS,
  PILLAR_CONFIG,
  PLATFORM_LABELS,
} from "@/lib/constants";
import { ReportHeader } from "@/components/export/report-components/ReportHeader";
import { ExecSummaryStrip } from "@/components/export/report-components/ExecSummaryStrip";
import { PillarDonutChart } from "@/components/export/report-components/PillarDonutChart";
import { PipelineStatusBar } from "@/components/export/report-components/PipelineStatusBar";
import { MonthlyCalendarGrid } from "@/components/export/report-components/MonthlyCalendarGrid";
import { TopPostsSection } from "@/components/export/report-components/TopPostsSection";
import { KPIScorecardTable } from "@/components/export/report-components/KPIScorecardTable";
import { FormatComparisonBar } from "@/components/export/report-components/FormatComparisonBar";
import { DeadlineAlertSection } from "@/components/export/report-components/DeadlineAlertSection";
import { ActionItemsSection } from "@/components/export/report-components/ActionItemsSection";
import { ReportFooter } from "@/components/export/report-components/ReportFooter";

export interface MonthlyReportOptions {
  includePerformance: boolean;
  includeDeadlineAlerts: boolean;
  includeRecommendations: boolean;
}

interface MonthlyReportProps {
  items: ContentItem[];
  year: number;
  month: number;
  brandName: string;
  generatedAt: Date;
  reportFooterNote?: string;
  options?: MonthlyReportOptions;
}

const defaultOpts: MonthlyReportOptions = {
  includePerformance: true,
  includeDeadlineAlerts: true,
  includeRecommendations: true,
};

function hasPerformanceSnapshot(item: ContentItem): boolean {
  return !!(item.performance?.finalMetrics ?? item.performance?.snapshot24h);
}

export function MonthlyReport({
  items,
  year,
  month,
  brandName,
  generatedAt,
  reportFooterNote,
  options = defaultOpts,
}: MonthlyReportProps) {
  const opts = { ...defaultOpts, ...options };
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthLabel = format(monthStart, "MMMM yyyy");
  const monthLabelCaps = format(monthStart, "MMMM yyyy").toUpperCase();

  const monthItems = getMonthlyItems(items, year, month);
  const stats = aggregateStats(monthItems);
  const perf = aggregatePerformance(monthItems);

  const prev = subMonths(monthStart, 1);
  const prevItems = getMonthlyItems(
    items,
    prev.getFullYear(),
    prev.getMonth() + 1
  );
  const prevStats = aggregateStats(prevItems);

  const next = addMonths(monthStart, 1);
  const nextItems = getMonthlyItems(
    items,
    next.getFullYear(),
    next.getMonth() + 1
  );

  const topPosts = getTopPosts(monthItems, 3);
  const recommendations = generateRecommendations(stats, perf).slice(0, 5);

  const atRisk = opts.includeDeadlineAlerts
    ? getAtRiskItems(monthItems)
    : { overdue: [], critical: [], warning: [] };

  let topFmt: ContentFormat | null = null;
  let topFmtCount = -1;
  CONTENT_FORMATS_ALL.forEach((f) => {
    const c = stats.byFormat[f];
    if (c > topFmtCount) {
      topFmtCount = c;
      topFmt = f;
    }
  });

  const pendingAll = items.filter((i) => i.status === "pending_approval");
  const now = new Date();

  const platformEntries = Object.entries(stats.byPlatform).sort(
    (a, b) => b[1] - a[1]
  );
  const platMax = Math.max(...platformEntries.map(([, n]) => n), 1);

  const anyPerf = monthItems.some(hasPerformanceSnapshot);

  const nextStats = aggregateStats(nextItems);
  const pillarTotalNext = PILLAR_KEYS.reduce((s, p) => s + nextStats.byPillar[p], 0) || 1;

  return (
    <div className="bg-white text-gray-900">
      {/* Page 1 */}
      <div className="report-page relative flex flex-col">
        <ReportHeader
          brandName={brandName}
          reportType="Monthly Executive Report"
          dateRange={monthLabel}
          generatedAt={generatedAt}
          subtitle={monthLabel}
        />

        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>{monthLabelCaps} at a glance</span>
          </div>
          <ExecSummaryStrip
            columns={6}
            stats={[
              {
                label: "Total content",
                value: stats.total,
                unit: "posts",
                trend: stats.total - prevStats.total,
                trendLabel: "vs last month",
                highlight: true,
                icon: "layers",
              },
              {
                label: "Published",
                value: stats.published,
                icon: "check",
              },
              {
                label: "Avg Eng. rate",
                value: perf.avgEngagementRate.toFixed(1),
                unit: "%",
                icon: "chart",
              },
              {
                label: "Total reach",
                value: formatReachK(perf.totalReach),
                icon: "send",
              },
              {
                label: "KPI pass rate",
                value: perf.kpiPassRate.toFixed(0),
                unit: "%",
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className={SECTION.headerWithLine}>
              <div className={SECTION.divider} />
              <span className={RT.sectionLabel}>Content by pillar</span>
            </div>
            <PillarDonutChart data={stats.byPillar} title="" size="lg" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>Pipeline status</span>
              </div>
              <PipelineStatusBar stats={stats} />
            </div>
            <div>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>Top format</span>
              </div>
              {topFmt && topFmtCount > 0 ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-[16px] font-semibold text-gray-900">
                    {FORMAT_LABELS[topFmt]}
                  </div>
                  <div className="mt-1 text-[12px] text-gray-500">
                    {topFmtCount} posts
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(100, (topFmtCount / Math.max(stats.total, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-gray-500">No format data</p>
              )}
            </div>
          </div>
        </div>

        <ReportFooter
          brandName={brandName}
          currentPage={1}
          totalPages={4}
          generatedAt={generatedAt}
          footerNote={reportFooterNote}
        />
      </div>

      <div className="page-break" />

      {/* Page 2 */}
      <div className="report-page relative flex flex-col">
        <div className={SECTION.wrapper}>
          <div className={SECTION.headerWithLine}>
            <div className={SECTION.divider} />
            <span className={RT.sectionLabel}>Full month calendar</span>
          </div>
          <p className={RT.bodyMuted + " mb-4"}>Color-coded by content pillar</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PILLAR_KEYS.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: PILLAR_CONFIG[p].color }}
                />
                {PILLAR_CONFIG[p].label}
                <span className="tabular-nums text-gray-500">
                  {stats.byPillar[p]}
                </span>
              </span>
            ))}
          </div>
          <MonthlyCalendarGrid
            items={monthItems}
            year={year}
            month={month}
          />
          <div className="mt-6">
            <div className={SECTION.header}>
              <span className={RT.sectionLabel}>Platform distribution</span>
            </div>
            <div className="space-y-2">
              {platformEntries.map(([pl, n]) => (
                <div key={pl} className="flex items-center gap-3">
                  <span className="w-[100px] shrink-0 text-[12px] font-medium text-gray-700">
                    {PLATFORM_LABELS[pl] ?? pl}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(n / platMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[12px] tabular-nums text-gray-600">
                    {n} posts
                  </span>
                </div>
              ))}
              {platformEntries.length === 0 && (
                <p className="text-[13px] text-gray-500">No platform data</p>
              )}
            </div>
          </div>
        </div>

        <ReportFooter
          brandName={brandName}
          currentPage={2}
          totalPages={4}
          generatedAt={generatedAt}
          footerNote={reportFooterNote}
        />
      </div>

      <div className="page-break" />

      {/* Page 3 */}
      <div className="report-page relative flex flex-col">
        {!opts.includePerformance ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-[16px] font-semibold text-gray-800">
              Performance sections disabled
            </p>
            <p className="mt-2 text-[13px] text-gray-500">
              Enable “Include performance data” in export options to show KPI
              scorecard and format comparison.
            </p>
          </div>
        ) : !anyPerf ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-[18px] font-semibold text-gray-800">
              No performance data yet
            </p>
            <p className="mt-2 text-[13px] text-gray-500">
              Add final metrics or 24h snapshots to posts to populate this
              section.
            </p>
          </div>
        ) : (
          <>
            <div className={SECTION.wrapper}>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>Top performing content</span>
              </div>
              <TopPostsSection posts={topPosts} />
            </div>
            <div className={SECTION.wrapper}>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>
                  KPI scorecard by content pillar
                </span>
              </div>
              <KPIScorecardTable perfByPillar={perf.byPillar} />
            </div>
            <div className={SECTION.wrapper}>
              <div className={SECTION.headerWithLine}>
                <div className={SECTION.divider} />
                <span className={RT.sectionLabel}>
                  Engagement rate by format
                </span>
              </div>
              <FormatComparisonBar data={perf.byFormat} />
            </div>
          </>
        )}

        <ReportFooter
          brandName={brandName}
          currentPage={3}
          totalPages={4}
          generatedAt={generatedAt}
          footerNote={reportFooterNote}
        />
      </div>

      <div className="page-break" />

      {/* Page 4 */}
      <div className="report-page relative flex flex-col">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <div className={SECTION.headerWithLine}>
              <div className={SECTION.divider} />
              <span className={RT.sectionLabel}>Next month pipeline</span>
            </div>
            {nextItems.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-[13px] text-gray-600">
                No content planned yet for{" "}
                {format(next, "MMMM yyyy")}. Add scheduled items to see this
                preview.
              </div>
            ) : (
              <div className="space-y-4">
                <p className={RT.emphasis}>
                  {nextStats.total} planned posts · earliest publish{" "}
                  {format(
                    new Date(
                      [...nextItems].sort(
                        (a, b) =>
                          new Date(a.publishDate).getTime() -
                          new Date(b.publishDate).getTime()
                      )[0].publishDate
                    ),
                    "d MMM yyyy"
                  )}
                </p>
                <div className="space-y-2">
                  <span className={RT.sectionLabel}>By pillar</span>
                  {PILLAR_KEYS.map((p) => {
                    const n = nextStats.byPillar[p];
                    const pct = (n / pillarTotalNext) * 100;
                    return (
                      <div key={p} className="flex items-center gap-2">
                        <span className="w-[120px] truncate text-[11px] text-gray-600">
                          {PILLAR_CONFIG[p].label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PILLAR_CONFIG[p].color,
                            }}
                          />
                        </div>
                        <span className="w-6 text-right text-[11px] tabular-nums">
                          {n}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <span className={RT.sectionLabel}>By format</span>
                  <ul className="mt-2 space-y-1 text-[13px] text-gray-700">
                    {CONTENT_FORMATS_ALL.map((f) =>
                      nextStats.byFormat[f] > 0 ? (
                        <li key={f}>
                          {FORMAT_LABELS[f]}: {nextStats.byFormat[f]}
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className={SECTION.headerWithLine}>
              <div className={SECTION.divider} />
              <span className={RT.sectionLabel}>Pending approvals</span>
            </div>
            {pendingAll.length === 0 ? (
              <p className="text-[14px] font-medium text-green-700">
                ✅ All content approved
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingAll.map((item) => {
                  const wait = differenceInCalendarDays(
                    now,
                    new Date(item.createdAt)
                  );
                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2 text-[12px]"
                    >
                      <span className="font-mono text-[10px] text-gray-400">
                        {item.id.slice(0, 8).toUpperCase()}
                      </span>{" "}
                      <span className="font-semibold text-gray-900">
                        {item.topic}
                      </span>
                      <div className="mt-1 text-[11px] text-gray-600">
                        {item.owner} · Waiting {wait}d
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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

        {opts.includeRecommendations && (
          <div className={SECTION.wrapper}>
            <div className={SECTION.headerWithLine}>
              <div className={SECTION.divider} />
              <span className={RT.sectionLabel}>Strategic recommendations</span>
            </div>
            <ActionItemsSection items={recommendations} />
          </div>
        )}

        <footer className="mt-auto border-t border-gray-200 pt-3 text-[10px] text-gray-400">
          {reportFooterNote?.trim() ? (
            <p className="mb-2 text-center text-[10px] italic leading-snug text-gray-400">
              {reportFooterNote.trim()}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Prepared by Content Team · {brandName}</span>
            <span>4 of 4</span>
            <span>{format(generatedAt, "d MMM yyyy · HH:mm")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
