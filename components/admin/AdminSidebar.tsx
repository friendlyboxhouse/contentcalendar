"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/ui/material-icon";

const links: {
  href: string;
  label: string;
  symbol: string;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "ภาพรวม", symbol: "dashboard", exact: true },
  { href: "/admin/emails", label: "อีเมลที่อนุญาต", symbol: "mark_email_read" },
  { href: "/admin/admins", label: "แอดมินหลังบ้าน", symbol: "shield_person" },
  { href: "/admin/roles", label: "สิทธิ์ผู้ใช้", symbol: "group" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 md:w-52">
      <div className="mb-4 rounded-lg border bg-card px-3 py-2 md:sticky md:top-4">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          หลังบ้าน
        </p>
        <nav className="flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {links.map(({ href, label, symbol, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <MaterialIcon name={symbol} size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="mt-3 flex items-center gap-2 border-t px-2 pt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <MaterialIcon name="arrow_back" size={18} />
          กลับแอปหลัก
        </Link>
      </div>
    </aside>
  );
}
