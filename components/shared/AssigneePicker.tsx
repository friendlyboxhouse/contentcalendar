"use client";

import { useMemo, useState } from "react";
import type { TaskAssignee } from "@/lib/types";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { useAssignmentRoles } from "@/hooks/useAssignmentRoles";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildUserInitials } from "@/lib/initials";
import { MaterialIcon } from "@/components/ui/material-icon";

interface AssigneePickerProps {
  value: TaskAssignee[];
  onChange: (next: TaskAssignee[]) => void;
  disabled?: boolean;
}

export function AssigneePicker({
  value,
  onChange,
  disabled,
}: AssigneePickerProps) {
  const { workspaceMembers } = useSupabaseApp();
  const { activeItems: roles } = useAssignmentRoles();
  const [userIdDraft, setUserIdDraft] = useState("");
  const [roleIdDraft, setRoleIdDraft] = useState("");

  const memberById = useMemo(
    () => new Map(workspaceMembers.map((m) => [m.user_id, m])),
    [workspaceMembers]
  );
  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles]
  );

  const addAssignee = () => {
    if (!userIdDraft || !roleIdDraft) return;
    const exists = value.some(
      (entry) => entry.userId === userIdDraft && entry.roleId === roleIdDraft
    );
    if (exists) return;
    onChange([
      ...value,
      {
        userId: userIdDraft,
        roleId: roleIdDraft,
        addedAt: new Date(),
      },
    ]);
    setUserIdDraft("");
  };

  const removeAssignee = (entry: TaskAssignee) => {
    onChange(
      value.filter(
        (item) =>
          !(item.userId === entry.userId && item.roleId === entry.roleId)
      )
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select
          value={userIdDraft}
          onValueChange={(v) => setUserIdDraft(v ?? "")}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกสมาชิก" />
          </SelectTrigger>
          <SelectContent>
            {workspaceMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.display_name || member.email || member.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={roleIdDraft}
          onValueChange={(v) => setRoleIdDraft(v ?? "")}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกบทบาท" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={addAssignee} disabled={disabled}>
          add
        </Button>
      </div>

      <ul className="space-y-1 rounded-md border p-2 text-sm">
        {value.length ? (
          value.map((entry) => {
            const member = memberById.get(entry.userId);
            const role = roleById.get(entry.roleId);
            return (
              <li
                key={`${entry.userId}:${entry.roleId}`}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar
                    fallback={buildUserInitials(
                      member?.display_name ?? null,
                      member?.email ?? null
                    )}
                    className="h-6 w-6 text-[10px]"
                  />
                  <span className="truncate">
                    {member?.display_name || member?.email || entry.userId}
                  </span>
                  <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                    {role?.label || entry.roleId}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAssignee(entry)}
                  disabled={disabled}
                  className="h-7 px-2"
                >
                  <MaterialIcon name="close" size={14} />
                </Button>
              </li>
            );
          })
        ) : (
          <li className="px-1 py-1 text-xs text-muted-foreground">
            ยังไม่มีผู้รับผิดชอบ
          </li>
        )}
      </ul>
    </div>
  );
}
