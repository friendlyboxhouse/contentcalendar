"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContentItem,
  ContentStatus,
  DashboardStats,
  Platform,
  ContentPillar,
} from "@/lib/types";
import { KPI_REMINDER_DAYS } from "@/lib/constants";
import { reviveContentItems } from "@/lib/revive";
import { SEED_DATA } from "@/lib/seedData";
import { computeDashboardStats } from "@/lib/dashboardStats";

interface ContentStore {
  items: ContentItem[];
  lastDeleted: ContentItem | null;

  addItem: (item: ContentItem) => void;
  updateItem: (id: string, updates: Partial<ContentItem>) => void;
  deleteItem: (id: string) => void;
  undoDelete: () => void;

  updateStatus: (id: string, status: ContentStatus) => void;

  getKPIReminderItems: () => ContentItem[];
  getStats: () => DashboardStats;
  getStatsByFilter: (
    pillar?: ContentPillar,
    platform?: Platform,
    filterMonth?: string
  ) => DashboardStats;

  seedFromDemo: (force?: boolean) => void;
}

function filterItems(
  items: ContentItem[],
  pillar?: ContentPillar,
  platform?: Platform,
  filterMonth?: string
): ContentItem[] {
  return items.filter((item) => {
    const pillarMatch = !pillar || item.pillar === pillar;
    const platformMatch =
      !platform || item.platform.includes(platform);
    let monthMatch = true;
    if (filterMonth && filterMonth !== "all") {
      const target = new Date(item.publishDate);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
      monthMatch = key === filterMonth;
    }
    return pillarMatch && platformMatch && monthMatch;
  });
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastDeleted: null,

      addItem: (item) =>
        set((s) => ({
          items: [...s.items, item],
          lastDeleted: null,
        })),

      updateItem: (id, updates) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          ),
        })),

      deleteItem: (id) =>
        set((s) => {
          const found = s.items.find((i) => i.id === id);
          return {
            items: s.items.filter((i) => i.id !== id),
            lastDeleted: found ?? s.lastDeleted,
          };
        }),

      undoDelete: () =>
        set((s) => {
          if (!s.lastDeleted) return s;
          return {
            items: [...s.items, s.lastDeleted],
            lastDeleted: null,
          };
        }),

      updateStatus: (id, status) => {
        const updates: Partial<ContentItem> = { status };
        if (status === "published") {
          updates.publishedAt = new Date();
        }
        get().updateItem(id, updates);
      },

      getKPIReminderItems: () => {
        const now = new Date();
        return get().items.filter((item) => {
          if (!item.publishedAt) return false;
          const daysSincePublish = Math.floor(
            (now.getTime() - item.publishedAt.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const isReminderDay = KPI_REMINDER_DAYS.some(
            (day) => daysSincePublish >= day
          );
          const hasNoPerformance = !item.performance?.finalMetrics;
          return isReminderDay && hasNoPerformance;
        });
      },

      getStats: () => computeDashboardStats(get().items),

      getStatsByFilter: (pillar, platform, filterMonth) =>
        computeDashboardStats(
          filterItems(get().items, pillar, platform, filterMonth)
        ),

      seedFromDemo: (force) => {
        const revived = reviveContentItems(
          JSON.parse(JSON.stringify(SEED_DATA)) as ContentItem[]
        );
        set((s) => {
          if (!force && s.items.length > 0) return s;
          return { items: revived, lastDeleted: null };
        });
      },
    }),
    {
      name: "content-planner-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<ContentStore, "items">>;
        const rawItems = (p.items ?? current.items) as ContentItem[];
        return {
          ...current,
          items: reviveContentItems(rawItems),
          lastDeleted: null,
        };
      },
    }
  )
);
