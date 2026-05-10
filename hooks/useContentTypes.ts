"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

export type WorkspaceContentType = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_archived: boolean;
};

const FALLBACK_TYPES: WorkspaceContentType[] = [
  {
    id: "fallback-educational",
    slug: "educational",
    label: "Educational",
    description: null,
    color: "#5B6CFF",
    icon: "school",
    sort_order: 10,
    is_archived: false,
  },
  {
    id: "fallback-entertaining",
    slug: "entertaining",
    label: "Entertaining",
    description: null,
    color: "#00A76F",
    icon: "celebration",
    sort_order: 20,
    is_archived: false,
  },
  {
    id: "fallback-promotional",
    slug: "promotional",
    label: "Promotional",
    description: null,
    color: "#F59E0B",
    icon: "campaign",
    sort_order: 30,
    is_archived: false,
  },
  {
    id: "fallback-inspirational",
    slug: "inspirational",
    label: "Inspirational",
    description: null,
    color: "#A855F7",
    icon: "auto_awesome",
    sort_order: 40,
    is_archived: false,
  },
  {
    id: "fallback-ugc",
    slug: "ugc",
    label: "UGC",
    description: null,
    color: "#0EA5E9",
    icon: "group",
    sort_order: 50,
    is_archived: false,
  },
];

export function useContentTypes() {
  const { supabase, workspaceId } = useSupabaseApp();
  const [items, setItems] = useState<WorkspaceContentType[]>(FALLBACK_TYPES);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !workspaceId) {
      setItems(FALLBACK_TYPES);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("content_types")
      .select("id,slug,label,description,color,icon,sort_order,is_archived")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error || !data?.length) {
      setItems(FALLBACK_TYPES);
      setLoading(false);
      return;
    }
    setItems(data as WorkspaceContentType[]);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    let cancelled = false;
    void refresh().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const activeItems = useMemo(
    () => items.filter((item) => !item.is_archived),
    [items]
  );

  return { items, activeItems, loading, refresh };
}
