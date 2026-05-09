"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  BarChart3,
  CalendarHeart,
  Plus,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react";
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

const DEMO_KEY = "content-planner-demo-seeded-v1";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/briefs", label: "Content Briefs", icon: ClipboardList },
  { href: "/performance", label: "Performance", icon: BarChart3 },
];

export function SideNav() {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const seedFromDemo = useContentStore((s) => s.seedFromDemo);

  useEffect(() => setMounted(true), []);

  const resetDemo = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("โหลดข้อมูลตัวอย่างใหม่ทั้งหมด? การแก้ไขปัจจุบันจะถูกแทนที่")
    )
      return;
    seedFromDemo(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_KEY, "1");
    }
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r bg-sidebar text-sidebar-foreground",
        "max-xl:w-[72px] max-xl:items-center max-xl:px-2 max-xl:py-4",
        "max-md:bottom-0 max-md:top-auto max-md:h-14 max-md:w-full max-md:flex-row max-md:justify-around max-md:border-t max-md:border-r-0"
      )}
    >
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 max-xl:items-center max-md:flex-row max-md:gap-2 max-md:p-2 max-md:overflow-visible">
        <div className="flex items-center gap-2 px-1 max-xl:hidden max-md:hidden">
          <CalendarHeart className="h-8 w-8 text-primary" />
          <div>
            <div className="text-sm font-semibold leading-tight">Content Planner</div>
            <div className="text-[10px] text-muted-foreground">DINKR</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 max-xl:w-full max-md:flex-row max-md:justify-center">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors max-xl:justify-center max-xl:px-2 max-md:px-2",
                  active
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                    : "hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-xl:hidden max-md:hidden">{label}</span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/briefs/new"
          className={cn(
            buttonVariants({ size: "sm", className: "w-full gap-2 shadow-md max-xl:px-2" }),
            "max-md:hidden"
          )}
        >
          <Plus className="h-4 w-4" />
          <span className="max-xl:hidden">New Brief</span>
        </Link>

        <div className="space-y-3 max-md:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground max-xl:hidden">
            Pillars
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
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-sidebar-accent">
            <span className="max-xl:hidden">สถานะ</span>
            <ChevronDown className="h-4 w-4 max-xl:hidden" />
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
          {mounted && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              type="button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="max-xl:hidden">
                {theme === "system" ? "ระบบ" : theme === "dark" ? "มืด" : "สว่าง"}
              </span>
            </Button>
          )}
          <button
            type="button"
            className="w-full text-left text-[11px] text-muted-foreground underline-offset-2 hover:underline max-xl:hidden"
            onClick={resetDemo}
          >
            Reset เป็นข้อมูลตัวอย่าง
          </button>
          <div className="text-[10px] text-muted-foreground max-xl:hidden">
            v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
}

export { DEMO_KEY };
