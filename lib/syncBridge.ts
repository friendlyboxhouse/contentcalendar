import type { ContentItem, TaskItem } from "@/lib/types";

export type SyncHandlers = {
  upsertItem: (item: ContentItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  bulkUpsert: (items: ContentItem[]) => Promise<void>;
  upsertTask: (task: TaskItem) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkUpsertTasks: (tasks: TaskItem[]) => Promise<void>;
};

let handlers: Partial<SyncHandlers> = {};
let applyingRemote = false;

export function setSyncHandlers(next: Partial<SyncHandlers>) {
  handlers = next;
}

export function clearSyncHandlers() {
  handlers = {};
}

export function runAsRemoteApply<T>(fn: () => T): T {
  applyingRemote = true;
  try {
    return fn();
  } finally {
    applyingRemote = false;
  }
}

export function isApplyingRemoteSync(): boolean {
  return applyingRemote;
}

export function emitLocalUpsert(item: ContentItem) {
  if (applyingRemote) return;
  void handlers.upsertItem?.(item);
}

export function emitLocalDelete(id: string) {
  if (applyingRemote) return;
  void handlers.deleteItem?.(id);
}

export function emitBulkUpsert(items: ContentItem[]) {
  if (applyingRemote) return;
  void handlers.bulkUpsert?.(items);
}

export function emitTaskUpsert(task: TaskItem) {
  if (applyingRemote) return;
  void handlers.upsertTask?.(task);
}

export function emitTaskDelete(id: string) {
  if (applyingRemote) return;
  void handlers.deleteTask?.(id);
}

export function emitTaskBulkUpsert(tasks: TaskItem[]) {
  if (applyingRemote) return;
  void handlers.bulkUpsertTasks?.(tasks);
}
