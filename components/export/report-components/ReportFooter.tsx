"use client";

import { format } from "date-fns";

interface ReportFooterProps {
  brandName: string;
  currentPage: number;
  totalPages: number;
  generatedAt: Date;
  /** ข้อความจากการตั้งค่าโปรเจกต์ (ถ้ามี) */
  footerNote?: string;
}

export function ReportFooter({
  brandName,
  currentPage,
  totalPages,
  generatedAt,
  footerNote,
}: ReportFooterProps) {
  const note = footerNote?.trim();
  return (
    <footer className="mt-auto shrink-0 border-t border-gray-200 pt-3 text-[10px] text-gray-400">
      {note ? (
        <p className="mb-2 text-center text-[10px] italic leading-snug text-gray-400">
          {note}
        </p>
      ) : null}
      <div className="flex h-10 items-center justify-between">
      <span>
        {brandName} · Content Team
      </span>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <span>
        Generated {format(generatedAt, "d MMM yyyy · HH:mm")}
      </span>
      </div>
    </footer>
  );
}
