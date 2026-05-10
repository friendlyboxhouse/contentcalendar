"use client";

import { useMemo } from "react";
import { useTaskStore } from "@/store/taskStore";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

export function useTasks() {
  const { workspaceId } = useSupabaseApp();
  const items = useTaskStore((s) => s.items);

  const workspaceItems = useMemo(() => {
    if (!workspaceId) return [];
    return items.filter((item) => item.workspace_id === workspaceId);
  }, [items, workspaceId]);

  return { items: workspaceItems };
}
