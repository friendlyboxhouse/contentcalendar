"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { PILLAR_CONFIG, STATUS_CONFIG, CONTENT_STATUSES_ORDERED } from "@/lib/constants";
import type { ContentPillar, ContentStatus } from "@/lib/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useContentStore } from "@/store/contentStore";
import { useEffect, useState } from "react";
import { ExportModal } from "@/components/export/ExportModal";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEMO_KEY = "content-planner-demo-seeded-v1";

const nav: {
  href: string;
  label: string;
  mobileLabel: string;
  symbol: string;
}[] = [
  { href: "/", label: "ภาพรวม", mobileLabel: "ภาพรวม", symbol: "dashboard" },
  { href: "/calendar", label: "ปฏิทิน", mobileLabel: "ปฏิทิน", symbol: "calendar_month" },
  {
    href: "/briefs",
    label: "คอนเทนต์บรีฟ",
    mobileLabel: "บรีฟ",
    symbol: "assignment",
  },
  {
    href: "/performance",
    label: "ประสิทธิภาพ",
    mobileLabel: "สถิติ",
    symbol: "analytics",
  },
  { href: "/settings", label: "ตั้งค่า", mobileLabel: "ตั้งค่า", symbol: "settings" },
];

export function SideNav() {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [demoResetOpen, setDemoResetOpen] = useState(false);
  const items = useContentStore((s) => s.items);
  const seedFromDemo = useContentStore((s) => s.seedFromDemo);
  const {
    configured,
    session,
    signOut,
    workspaceId,
    workspaces,
    setActiveWorkspace,
    canAccessAdmin,
    displayName,
    organizationName,
    organizationTagline,
    reportFooterNote,
  } = useSupabaseApp();

  useEffect(() => setMounted(true), []);

  const confirmDemoReset = () => {
    seedFromDemo(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_KEY, "1");
    }
    setDemoResetOpen(false);
  };

  const links = [
    ...nav,
    ...(configured && session && canAccessAdmin
      ? ([
          {
            href: "/admin",
            label: "หลังบ้าน",
            mobileLabel: "หลังบ้าน",
            symbol: "admin_panel_settings",
          },
        ] as const)
      : []),
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r bg-sidebar text-sidebar-foreground",
        "max-xl:w-[72px] max-xl:items-center max-xl:px-2 max-xl:py-4",
        "max-md:bottom-0 max-md:top-auto max-md:min-h-[64px] max-md:h-auto max-md:w-full max-md:flex-row max-md:justify-around max-md:border-t max-md:border-r-0 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 max-xl:items-center max-md:flex-row max-md:gap-1 max-md:p-2 max-md:overflow-visible max-md:justify-between">
        <div className="flex items-center gap-2 px-1 max-xl:hidden max-md:hidden">
          <MaterialIcon name="event_available" size={32} className="text-primary" />
          <div>
            <div className="text-sm font-semibold leading-tight">Content Planner</div>
            <div
              className="max-w-[180px] truncate text-xs leading-snug text-muted-foreground"
              title={organizationTagline || organizationName}
            >
              {organizationTagline || organizationName}
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 max-xl:w-full max-md:flex-1 max-md:flex-row max-md:justify-stretch max-md:gap-0">
          {links.map(({ href, label, mobileLabel, symbol }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  "xl:py-2",
                  "max-xl:justify-center max-xl:px-2 max-xl:rounded-lg",
                  "max-md:flex max-md:min-h-[52px] max-md:min-w-[44px] max-md:flex-1 max-md:flex-col max-md:justify-center max-md:gap-1 max-md:px-1 max-md:py-2",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground max-md:active:scale-[0.98]"
                )}
              >
                <MaterialIcon name={symbol} className="shrink-0" size={24} />
                <span className="hidden xl:inline">{label}</span>
                <span className="hidden max-md:block max-w-[4.25rem] truncate text-center text-[11px] font-semibold leading-tight xl:hidden">
                  {mobileLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        {configured && session && workspaces.length > 0 ? (
          <div className="space-y-1 max-xl:hidden max-md:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </p>
            <Select
              value={workspaceId ?? ""}
              onValueChange={(v) => {
                if (v) setActiveWorkspace(v);
              }}
            >
              <SelectTrigger className="h-9 w-full bg-sidebar-accent/40">
                <SelectValue placeholder="เลือก workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="no-print w-full justify-start gap-2 border-border text-[13px] font-medium hover:bg-muted max-xl:px-2 max-md:hidden"
          onClick={() => setExportOpen(true)}
        >
          <MaterialIcon name="file_download" size={18} className="shrink-0" />
          <span className="max-xl:hidden">ส่งออกรายงาน</span>
        </Button>

        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          items={items}
          brandName={organizationName}
          reportFooterNote={reportFooterNote}
        />

        <Dialog open={demoResetOpen} onOpenChange={setDemoResetOpen}>
          <DialogContent showCloseButton className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>รีเซ็ตข้อมูลตัวอย่าง?</DialogTitle>
              <DialogDescription>
                การแก้ไขปัจจุบันจะถูกแทนที่ด้วยชุดข้อมูลตัวอย่าง — ดำเนินการต่อเมื่อแน่ใจ
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDemoResetOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="button" onClick={confirmDemoReset}>
                รีเซ็ตข้อมูลตัวอย่าง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Link
          href="/briefs/new"
          className={cn(
            buttonVariants({ size: "sm", className: "w-full gap-2 shadow-md max-xl:px-2" }),
            "max-md:hidden"
          )}
        >
          <MaterialIcon name="add_circle" size={18} className="shrink-0" />
          <span className="max-xl:hidden">สร้างบรีฟใหม่</span>
        </Link>

        <div className="space-y-3 max-md:hidden">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground max-xl:hidden">
            <MaterialIcon name="category" size={14} />
            หมวดคอนเทนต์
          </p>
          <ul className="space-y-1.5 max-xl:space-y-2">
            {(Object.keys(PILLAR_CONFIG) as ContentPillar[]).map((key) => {
              const c = PILLAR_CONFIG[key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 text-xs max-xl:justify-center"
                  title={c.label}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="max-xl:hidden">{c.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <Collapsible defaultOpen={false} className="max-md:hidden">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent min-h-10">
            <span className="flex items-center gap-1 max-xl:hidden">
              <MaterialIcon name="flag" size={14} />
              สถานะ
            </span>
            <MaterialIcon name="expand_more" size={18} className="max-xl:hidden opacity-70" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {CONTENT_STATUSES_ORDERED.map((key) => {
              const s = STATUS_CONFIG[key as ContentStatus];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs max-xl:justify-center"
                  title={s.label}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.dotColor }}
                  />
                  <span className="max-xl:hidden">
                    {s.emoji} {s.label}
                  </span>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-auto space-y-3 pt-4 max-md:hidden">
          {configured && session?.user && (
            <div className="space-y-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 max-xl:hidden">
              <div className="flex items-start gap-2 text-xs">
                <MaterialIcon name="person" size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {displayName ?? session.user.email ?? session.user.id.slice(0, 8)}
                  </div>
                  {displayName && session.user.email && (
                    <div className="truncate text-xs text-muted-foreground">
                      {session.user.email}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">ซิงค์คลาวด์เปิดอยู่</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs min-h-9"
                type="button"
                onClick={() => void signOut()}
              >
                <MaterialIcon name="logout" size={16} />
                ออกจากระบบ
              </Button>
            </div>
          )}
          {mounted && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 min-h-9"
              type="button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <MaterialIcon
                name={resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
                size={18}
              />
              <span className="max-xl:hidden">
                {theme === "system" ? "ระบบ" : theme === "dark" ? "มืด" : "สว่าง"}
              </span>
            </Button>
          )}
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-1 rounded-lg px-2 text-left text-xs text-muted-foreground underline-offset-2 hover:bg-sidebar-accent hover:underline max-xl:hidden"
            onClick={() => setDemoResetOpen(true)}
          >
            <MaterialIcon name="restart_alt" size={14} />
            รีเซ็ตข้อมูลตัวอย่าง
          </button>
          <div className="text-xs text-muted-foreground max-xl:hidden">
            v1.1.0
          </div>
        </div>
      </div>
    </aside>
  );
}

export { DEMO_KEY };
