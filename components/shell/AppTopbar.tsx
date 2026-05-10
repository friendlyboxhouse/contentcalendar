"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { buildUserInitials } from "@/lib/initials";

function pathTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/briefs")) return "Briefs";
  if (pathname.startsWith("/performance")) return "Performance";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Workspace";
}

export function AppTopbar() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const {
    workspaceId,
    workspaces,
    setActiveWorkspace,
    displayName,
    session,
    signOut,
    avatarUrl,
    avatarColor,
  } = useSupabaseApp();

  const activeWorkspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const initials = useMemo(
    () => buildUserInitials(displayName, session?.user?.email ?? null),
    [displayName, session?.user?.email]
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
            {activeWorkspace?.name ?? "Workspace"}
          </p>
          <p className="truncate text-sm font-medium">{pathTitle(pathname)}</p>
        </div>

        <div className="relative hidden w-full max-w-sm shrink md:block">
          <MaterialIcon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search (coming soon)"
            className="h-9 pl-8"
            readOnly
            aria-label="Global search placeholder"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
            <MaterialIcon name="groups" size={16} />
            <span className="hidden sm:inline">{activeWorkspace?.name ?? "Workspace"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => setActiveWorkspace(workspace.id)}
              >
                <span className="truncate">{workspace.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <MaterialIcon
            name={resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
            size={16}
          />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Open user menu"
              />
            }
          >
            <Avatar
              src={avatarUrl}
              fallback={initials}
              colorClassName={avatarColor || undefined}
              className="h-9 w-9"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="space-y-0.5">
                <p className="truncate text-sm font-medium">
                  {displayName || session?.user?.email || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/settings" className="flex w-full items-center gap-2">
                <MaterialIcon name="settings" size={16} />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void signOut()}>
              <MaterialIcon name="logout" size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
