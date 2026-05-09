"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useContentStore } from "@/store/contentStore";
import { useKPIReminder } from "@/hooks/useKPIReminder";
import { CommandPalette } from "@/components/command-palette";
import { DEMO_KEY } from "@/components/shared/SideNav";
import { SupabaseAppProvider } from "@/components/supabase/SupabaseAppProvider";
import type { SupabasePublicEnv } from "@/lib/supabase/config";

export function Providers({
  children,
  supabasePublic,
}: {
  children: React.ReactNode;
  supabasePublic: SupabasePublicEnv;
}) {
  useKPIReminder();

  const cloudAuth =
    Boolean(supabasePublic.url?.trim()) &&
    Boolean(supabasePublic.anon?.trim());

  useEffect(() => {
    const maybeSeed = () => {
      try {
        if (cloudAuth) return;
        const done = localStorage.getItem(DEMO_KEY);
        const { items, seedFromDemo } = useContentStore.getState();
        if (!done && items.length === 0) {
          seedFromDemo(false);
          localStorage.setItem(DEMO_KEY, "1");
        }
      } catch {
        /* ignore */
      }
    };

    maybeSeed();
    const unsub =
      useContentStore.persist?.onFinishHydration?.((state) => {
        if (!state) return;
        maybeSeed();
      }) ?? undefined;

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [cloudAuth]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SupabaseAppProvider supabasePublic={supabasePublic}>
        {children}
        <Toaster richColors position="top-center" />
        <CommandPalette />
      </SupabaseAppProvider>
    </ThemeProvider>
  );
}
