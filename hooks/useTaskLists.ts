"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import type { TaskList } from "@/lib/types";

export function useTaskLists() {
  const { supabase, workspaceId } = useSupabaseApp();
  const [items, setItems] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !workspaceId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("task_lists")
      .select("id,workspace_id,slug,label,position,archived_at")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as TaskList[]);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeItems = useMemo(
    () => items.filter((row) => !row.archived_at),
    [items]
  );

  return { items, activeItems, loading, refresh };
}
