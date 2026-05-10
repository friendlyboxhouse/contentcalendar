"use client";

import type { WorkspaceMemberRow } from "@/components/supabase/SupabaseAppProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  memberLabel,
  ownerStoredFromMember,
} from "@/lib/ownerMapping";

export { memberLabel, ownerStoredFromMember };

export function OwnerMemberSelect({
  members,
  ownerDisplay,
  onPickMember,
  disabled,
  className,
}: {
  members: WorkspaceMemberRow[];
  /** ข้อความ owner ที่เก็บใน brief (อาจเป็น legacy ที่ไม่อยู่ในรายชื่อทีม) */
  ownerDisplay: string;
  onPickMember: (m: WorkspaceMemberRow) => void;
  disabled?: boolean;
  className?: string;
}) {
  const trimmedOwner = ownerDisplay.trim();
  const match = members.find(
    (m) => ownerStoredFromMember(m) === trimmedOwner
  );
  const legacy = Boolean(trimmedOwner) && !match;

  const selectValue =
    match?.user_id ?? (legacy ? "__legacy__" : "__none__");

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === "__legacy__" || v === "__none__") return;
        const m = members.find((x) => x.user_id === v);
        if (m) onPickMember(m);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder="เลือกผู้รับผิดชอบในทีม" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" disabled>
          — เลือก —
        </SelectItem>
        {legacy ? (
          <SelectItem value="__legacy__">
            {trimmedOwner}
            {" "}
            <span className="text-muted-foreground">
              (ไม่อยู่ในรายชื่อทีม — เลือกสมาชิกด้านล่าง)
            </span>
          </SelectItem>
        ) : null}
        {members.map((m) => (
          <SelectItem key={m.user_id} value={m.user_id}>
            {memberLabel(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
