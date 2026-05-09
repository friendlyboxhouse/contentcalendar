"use client";

import { useMemo } from "react";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/**
 * สิทธิ์การแก้ไขคอนเทนต์ใช้บทบาทใน **workspace** (ไม่ใช่แค่ profiles.role)
 * ระหว่าง workspaceLoading ให้ conservative เป็น read-only ก่อน เพื่อลด UI flicker สิทธิ์
 */
export function usePlannerPermissions() {
  const { workspaceRole, workspaceLoading, role: profileRole } = useSupabaseApp();

  const effectiveRole = workspaceRole ?? profileRole;
  const resolvedCanEdit = !workspaceLoading && effectiveRole !== "viewer";

  return useMemo(
    () => ({
      workspaceLoading,
      effectiveRole,
      /** viewer = อ่านอย่างเดียวในทีม */
      canEdit: resolvedCanEdit,
      canDelete: resolvedCanEdit,
      canDragCalendar: resolvedCanEdit,
      canChangeStatus: resolvedCanEdit,
      /** admin ของ workspace */
      isWorkspaceAdmin: effectiveRole === "admin",
    }),
    [effectiveRole, workspaceLoading, resolvedCanEdit]
  );
}
