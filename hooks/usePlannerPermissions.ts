"use client";

import { useMemo } from "react";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";

/**
 * สิทธิ์การแก้ไขคอนเทนต์ใช้บทบาทใน **workspace** (ไม่ใช่แค่ profiles.role)
 * ถ้ายังโหลด workspace ไม่เสร็จ — ถอยไปใช้ profiles.role ชั่วคราว
 */
export function usePlannerPermissions() {
  const { workspaceRole, workspaceLoading, role: profileRole } = useSupabaseApp();

  const effectiveRole = workspaceRole ?? profileRole;

  return useMemo(
    () => ({
      workspaceLoading,
      effectiveRole,
      /** viewer = อ่านอย่างเดียวในทีม */
      canEdit: effectiveRole !== "viewer",
      canDelete: effectiveRole !== "viewer",
      canDragCalendar: effectiveRole !== "viewer",
      canChangeStatus: effectiveRole !== "viewer",
      /** admin ของ workspace */
      isWorkspaceAdmin: effectiveRole === "admin",
    }),
    [effectiveRole, workspaceLoading]
  );
}
