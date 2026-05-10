"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContentItem,
  ContentStatus,
  DashboardStats,
  Platform,
  ContentPillar,
  MilestoneKind,
  MilestoneStateEntry,
} from "@/lib/types";
import { KPI_REMINDER_DAYS } from "@/lib/constants";
import { reviveContentItems } from "@/lib/revive";
import { SEED_DATA } from "@/lib/seedData";
import { computeDashboardStats } from "@/lib/dashboardStats";
import {
  getMilestoneEffectiveDate,
  WORKFLOW_MILESTONE_KINDS,
} from "@/lib/calendarEvents";
import {
  emitBulkUpsert,
  emitLocalDelete,
  emitLocalUpsert,
} from "@/lib/syncBridge";

interface ContentStore {
  items: ContentItem[];
  lastDeleted: ContentItem | null;

  addItem: (item: ContentItem) => void;
  updateItem: (id: string, updates: Partial<ContentItem>) => void;
  deleteItem: (id: string) => void;
  undoDelete: () => void;

  replaceAllItems: (items: ContentItem[]) => void;
  applyRemoteUpsert: (item: ContentItem) => void;
  removeItemRemote: (id: string) => void;

  updateStatus: (id: string, status: ContentStatus) => void;
  updateMilestoneStatus: (
    id: string,
    kind: MilestoneKind,
    status: ContentStatus
  ) => void;
  toggleMilestoneDone: (id: string, kind: MilestoneKind, checked: boolean) => void;
  updateMilestoneDate: (id: string, kind: MilestoneKind, date: Date) => void;
  clearMilestoneDateOverride: (id: string, kind: MilestoneKind) => void;
  shiftMilestonesFrom: (
    id: string,
    sourceKind: MilestoneKind,
    dayDelta: number,
    mode: "following"
  ) => void;
  snoozeKPIReminder: (id: string) => void;

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

const MILESTONE_FALLBACK_STATUS: Record<MilestoneKind, ContentStatus> = {
  brief: "in_brief",
  briefApprove: "pending_approval",
  production: "in_production",
  review: "in_review",
  mgmtApprove: "pending_approval",
  publish: "scheduled",
};

function withMilestoneStateUpdate(
  item: ContentItem,
  kind: MilestoneKind,
  patch: Partial<MilestoneStateEntry>
): Partial<ContentItem> {
  return {
    milestoneState: {
      ...(item.milestoneState ?? {}),
      [kind]: {
        ...(item.milestoneState?.[kind] ?? {}),
        ...patch,
      },
    },
  };
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastDeleted: null,

      addItem: (item) => {
        set((s) => ({
          items: [...s.items, item],
          lastDeleted: null,
        }));
        emitLocalUpsert(item);
      },

      updateItem: (id, updates) => {
        let nextFull: ContentItem | undefined;
        set((s) => {
          const items = s.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date() }
              : item
          );
          nextFull = items.find((i) => i.id === id);
          return { items };
        });
        if (nextFull) emitLocalUpsert(nextFull);
      },

      deleteItem: (id) => {
        set((s) => {
          const found = s.items.find((i) => i.id === id);
          return {
            items: s.items.filter((i) => i.id !== id),
            lastDeleted: found ?? s.lastDeleted,
          };
        });
        emitLocalDelete(id);
      },

      undoDelete: () => {
        let restored: ContentItem | null = null;
        set((s) => {
          if (!s.lastDeleted) return s;
          restored = s.lastDeleted;
          return {
            items: [...s.items, s.lastDeleted],
            lastDeleted: null,
          };
        });
        if (restored) emitLocalUpsert(restored);
      },

      replaceAllItems: (items) =>
        set(() => ({
          items: reviveContentItems(items),
          lastDeleted: null,
        })),

      applyRemoteUpsert: (item) =>
        set((s) => {
          const revived = reviveContentItems([item])[0];
          const exists = s.items.some((i) => i.id === revived.id);
          const items = exists
            ? s.items.map((i) => (i.id === revived.id ? revived : i))
            : [...s.items, revived];
          return { items };
        }),

      removeItemRemote: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
        })),

      snoozeKPIReminder: (id) => {
        get().updateItem(id, { kpiReminderSnoozedAt: new Date() });
      },

      updateStatus: (id, status) => {
        const updates: Partial<ContentItem> = { status };
        if (status === "published" || status === "kpi_pending") {
          // Set publishedAt only on first transition to published; preserve if already set.
          const existing = get().items.find((i) => i.id === id);
          if (!existing?.publishedAt) {
            updates.publishedAt = new Date();
          }
        } else {
          // Reverting away from published-state — clear publishedAt so KPI timers reset.
          updates.publishedAt = undefined;
        }
        get().updateItem(id, updates);
      },

      updateMilestoneStatus: (id, kind, status) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        get().updateItem(id, withMilestoneStateUpdate(item, kind, { status }));
      },

      toggleMilestoneDone: (id, kind, checked) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        const current = item.milestoneState?.[kind];
        const nextStatus = checked
          ? kind === "publish"
            ? "published"
            : "approved"
          : (current?.status ?? MILESTONE_FALLBACK_STATUS[kind]);
        get().updateItem(
          id,
          withMilestoneStateUpdate(item, kind, {
            done: checked,
            status: nextStatus,
          })
        );
      },

      updateMilestoneDate: (id, kind, date) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        const nextDate = new Date(date);
        nextDate.setHours(12, 0, 0, 0);
        get().updateItem(
          id,
          withMilestoneStateUpdate(item, kind, {
            dateOverride: nextDate,
          })
        );
      },

      clearMilestoneDateOverride: (id, kind) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        const next = {
          ...(item.milestoneState ?? {}),
          [kind]: {
            ...(item.milestoneState?.[kind] ?? {}),
            dateOverride: undefined,
          },
        };
        get().updateItem(id, { milestoneState: next });
      },

      shiftMilestonesFrom: (id, sourceKind, dayDelta, mode) => {
        if (mode !== "following" || dayDelta === 0) return;
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        const sourceIdx = WORKFLOW_MILESTONE_KINDS.indexOf(sourceKind);
        if (sourceIdx < 0) return;
        const nextMilestoneState = { ...(item.milestoneState ?? {}) };
        const targets = WORKFLOW_MILESTONE_KINDS.slice(sourceIdx + 1);
        for (const kind of targets) {
          const baseDate = getMilestoneEffectiveDate(item, kind);
          const shifted = new Date(baseDate);
          shifted.setDate(shifted.getDate() + dayDelta);
          shifted.setHours(12, 0, 0, 0);
          nextMilestoneState[kind] = {
            ...(nextMilestoneState[kind] ?? {}),
            dateOverride: shifted,
          };
        }
        get().updateItem(id, { milestoneState: nextMilestoneState });
      },

      getKPIReminderItems: () => {
        const now = Date.now();
        const MAX_REMINDER_DAYS = Math.max(...KPI_REMINDER_DAYS) + 14; // sliding window
        return get().items.filter((item) => {
          if (!item.publishedAt) return false;
          if (item.kpiReminderSnoozedAt) {
            const snoozeMs = now - new Date(item.kpiReminderSnoozedAt).getTime();
            // Snooze for 3 days
            if (snoozeMs < 1000 * 60 * 60 * 24 * 3) return false;
          }
          const daysSincePublish = Math.floor(
            (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSincePublish > MAX_REMINDER_DAYS) return false;
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
        let applied = false;
        set((s) => {
          if (!force && s.items.length > 0) return s;
          applied = true;
          return { items: revived, lastDeleted: null };
        });
        if (applied) emitBulkUpsert(get().items);
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
