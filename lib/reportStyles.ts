/** Inject into `<head>` before `window.print()` */
export function buildReportPrintStyles(
  orientation: "portrait" | "landscape"
): string {
  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const pageHeight = orientation === "landscape" ? "210mm" : "297mm";
  const pagePadding = orientation === "landscape" ? "12mm 14mm" : "14mm";

  return `
<style id="report-print-styles">
  @media print {
    @page {
      size: A4 ${orientation};
      margin: 0;
    }

    body * {
      visibility: hidden;
    }

    #report-print-root,
    #report-print-root * {
      visibility: visible;
    }

    #report-print-root {
      width: 100%;
      margin: 0 auto;
    }

    .report-scale-wrapper {
      transform: none !important;
      transform-origin: unset !important;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .page-break-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    * {
      box-shadow: none !important;
      text-shadow: none !important;
    }

    * {
      border-radius: 4px !important;
    }

    .no-print,
    nav,
    aside,
    #report-print-root button {
      display: none !important;
    }

    .report-page {
      width: ${pageWidth};
      min-height: ${pageHeight};
      padding: ${pagePadding};
      box-sizing: border-box;
      background: white;
      position: relative;
    }

    body {
      font-family: "Inter", "Helvetica Neue", Arial, sans-serif !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      color: #111827 !important;
    }

    table {
      page-break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
    }
    .content-chip-print {
      page-break-inside: avoid;
    }
    .stat-card {
      page-break-inside: avoid;
    }
    .top-post-card {
      page-break-inside: avoid;
    }
  }
</style>
`;
}

export const REPORT_FONT_SIZES = {
  reportTitle: "text-[28px]",
  sectionTitle: "text-[18px]",
  subsectionTitle: "text-[11px]",
  bodyPrimary: "text-[13px]",
  bodySecondary: "text-[12px]",
  heroNumber: "text-[36px]",
  cardNumber: "text-[24px]",
  label: "text-[11px]",
  caption: "text-[10px]",
} as const;

export const RT = {
  sectionLabel:
    "text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400",
  sectionTitle: "text-[18px] font-semibold text-gray-900 leading-tight",
  reportTitle: "text-[28px] font-bold text-gray-900 tracking-tight leading-none",
  heroNumber: "text-[36px] font-bold tabular-nums leading-none text-gray-900",
  cardNumber: "text-[24px] font-bold tabular-nums leading-none text-gray-900",
  medNumber: "text-[20px] font-bold tabular-nums leading-none",
  body: "text-[13px] font-normal text-gray-700 leading-relaxed",
  bodyMuted: "text-[12px] font-normal text-gray-500 leading-relaxed",
  label: "text-[11px] font-medium uppercase tracking-[0.08em]",
  caption: "text-[10px] font-normal text-gray-400",
  tableHeader:
    "text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500",
  tableCell: "text-[13px] font-normal text-gray-700",
  emphasis: "text-[13px] font-semibold text-gray-900",
} as const;

export const SECTION = {
  wrapper: "mb-8",
  header: "flex items-center gap-2 mb-4",
  headerWithLine:
    "flex items-center gap-3 mb-4 pb-3 border-b border-gray-200",
  divider: "w-3 h-[2px] bg-gray-900 rounded-full",
} as const;
