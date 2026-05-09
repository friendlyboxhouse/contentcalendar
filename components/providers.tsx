"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useContentStore } from "@/store/contentStore";
import { useKPIReminder } from "@/hooks/useKPIReminder";
import { CommandPalette } from "@/components/command-palette";
import { DEMO_KEY } from "@/components/shared/SideNav";

export function Providers({ children }: { children: React.ReactNode }) {
  useKPIReminder();

  useEffect(() => {
    const maybeSeed = () => {
      try {
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
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors position="top-center" />
      <CommandPalette />
    </ThemeProvider>
  );
}
