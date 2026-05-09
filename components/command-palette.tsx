"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useContentStore } from "@/store/contentStore";
import { CONTENT_STATUSES_ORDERED, STATUS_CONFIG } from "@/lib/constants";
import { MaterialIcon } from "@/components/ui/material-icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "ภาพรวม (Dashboard)", icon: "dashboard" },
  { href: "/calendar", label: "ปฏิทินคอนเทนต์", icon: "calendar_month" },
  { href: "/briefs", label: "คอนเทนต์บรีฟทั้งหมด", icon: "assignment" },
  { href: "/performance", label: "ประสิทธิภาพ / Performance", icon: "analytics" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const briefs = useContentStore((s) => s.items);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isInputFocus = !!(e.target as HTMLElement | null)?.closest(
        "input, textarea, [contenteditable]"
      );
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // Single-key shortcuts only when not focused on input
      if (isInputFocus) return;
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        router.push("/briefs/new");
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [router]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const filterByStatus = (statusKey: string) => {
    setOpen(false);
    router.push(`/briefs?fs=${encodeURIComponent(statusKey)}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton>
      <Command className="rounded-xl border-none shadow-none">
        <CommandInput placeholder="ค้นหา หรือพิมพ์คำสั่ง…" />
        <CommandList>
          <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>

          {/* Quick actions */}
          <CommandGroup heading="คำสั่งด่วน">
            <CommandItem
              value="สร้าง brief new ใหม่ create"
              onSelect={() => go("/briefs/new")}
            >
              <MaterialIcon name="add" size={16} className="mr-2 opacity-70" />
              <span>สร้างบรีฟใหม่</span>
              <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                N
              </kbd>
            </CommandItem>
            <CommandItem
              value="theme dark light mode สลับ"
              onSelect={() => {
                setOpen(false);
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
              }}
            >
              <MaterialIcon
                name={resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
                size={16}
                className="mr-2 opacity-70"
              />
              <span>
                สลับธีม: {resolvedTheme === "dark" ? "เป็นสว่าง" : "เป็นมืด"}
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Navigation */}
          <CommandGroup heading="ไปที่หน้า">
            {NAV.map((nav) => (
              <CommandItem
                key={nav.href}
                value={`${nav.label} ${nav.href}`}
                onSelect={() => go(nav.href)}
              >
                <MaterialIcon
                  name={nav.icon}
                  size={16}
                  className="mr-2 opacity-70"
                />
                <span>{nav.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Filter by status */}
          <CommandGroup heading="กรองบรีฟตามสถานะ">
            {CONTENT_STATUSES_ORDERED.map((key) => {
              const cfg = STATUS_CONFIG[key];
              return (
                <CommandItem
                  key={key}
                  value={`สถานะ ${cfg.label} ${key}`}
                  onSelect={() => filterByStatus(key)}
                >
                  <span
                    className="mr-2 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cfg.dotColor }}
                  />
                  <span>
                    {cfg.emoji} {cfg.label}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Briefs */}
          <CommandGroup heading={`บรีฟ (${briefs.length})`}>
            {briefs.slice(0, 30).map((b) => (
              <CommandItem
                key={b.id}
                value={`${b.id} ${b.topic} ${b.owner}`}
                onSelect={() => go(`/briefs/${b.id}`)}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {b.id}
                </span>
                <span className="ml-2 truncate">
                  {b.topic || "(ไม่มีหัวข้อ)"}
                </span>
                {b.owner && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {b.owner}
                  </span>
                )}
              </CommandItem>
            ))}
            {briefs.length > 30 && (
              <CommandItem
                value="ดูทั้งหมด briefs all"
                onSelect={() => go("/briefs")}
              >
                <MaterialIcon
                  name="more_horiz"
                  size={16}
                  className="mr-2 opacity-70"
                />
                <span>ดูบรีฟทั้งหมด ({briefs.length})</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
