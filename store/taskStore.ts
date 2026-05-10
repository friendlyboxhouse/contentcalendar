"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TaskItem } from "@/lib/types";
import { reviveTaskItems } from "@/lib/revive";
import {
  emitTaskBulkUpsert,
  emitTaskDelete,
  emitTaskUpsert,
} from "@/lib/syncBridge";

interface TaskStore {
  items: TaskItem[];
  addItem: (task: TaskItem) => void;
  updateItem: (id: string, updates: Partial<TaskItem>) => void;
  deleteItem: (id: string) => void;
  replaceAllItems: (items: TaskItem[]) => void;
  applyRemoteUpsert: (task: TaskItem) => void;
  removeItemRemote: (id: string) => void;
  bulkUpsert: (items: TaskItem[]) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (task) => {
        set((s) => ({ items: [...s.items, task] }));
        emitTaskUpsert(task);
      },
      updateItem: (id, updates) => {
        let nextFull: TaskItem | undefined;
        set((s) => {
          const items = s.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updated_at: new Date() }
              : item
          );
          nextFull = items.find((entry) => entry.id === id);
          return { items };
        });
        if (nextFull) emitTaskUpsert(nextFull);
      },
      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
        emitTaskDelete(id);
      },
      replaceAllItems: (items) =>
        set(() => ({
          items: reviveTaskItems(items),
        })),
      applyRemoteUpsert: (task) =>
        set((s) => {
          const revived = reviveTaskItems([task])[0];
          const exists = s.items.some((i) => i.id === revived.id);
          const items = exists
            ? s.items.map((i) => (i.id === revived.id ? revived : i))
            : [...s.items, revived];
          return { items };
        }),
      removeItemRemote: (id) =>
        set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
      bulkUpsert: (items) => {
        set((s) => {
          const map = new Map(s.items.map((item) => [item.id, item]));
          reviveTaskItems(items).forEach((item) => map.set(item.id, item));
          return { items: Array.from(map.values()) };
        });
        emitTaskBulkUpsert(get().items);
      },
    }),
    {
      name: "content-planner-task-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<TaskStore, "items">>;
        const rawItems = (p.items ?? current.items) as TaskItem[];
        return {
          ...current,
          items: reviveTaskItems(rawItems),
        };
      },
    }
  )
);
