"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import type { AssignmentRole } from "@/lib/types";

export function useAssignmentRoles() {
  const { supabase, workspaceId } = useSupabaseApp();
  const [items, setItems] = useState<AssignmentRole[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !workspaceId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("assignment_roles")
      .select("id,workspace_id,slug,label,position,archived_at")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as AssignmentRole[]);
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
