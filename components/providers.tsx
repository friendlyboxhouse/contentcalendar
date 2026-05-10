"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { useContentStore } from "@/store/contentStore";
import { useKPIReminder } from "@/hooks/useKPIReminder";
import { CommandPaletteGate } from "@/components/command-palette-gate";
import { DEMO_KEY } from "@/components/shared/SideNav";
import { SupabaseAppProvider } from "@/components/supabase/SupabaseAppProvider";
import type { SupabasePublicEnv } from "@/lib/supabase/config";
import { isLocalhostHost } from "@/lib/clientStorage";

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
        if (typeof window === "undefined") return;
        if (!isLocalhostHost(window.location.hostname)) return;
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
        <Toaster richColors position="top-center" theme="system" />
        <CommandPaletteGate />
        <Analytics />
        <SpeedInsights />
      </SupabaseAppProvider>
    </ThemeProvider>
  );
}
