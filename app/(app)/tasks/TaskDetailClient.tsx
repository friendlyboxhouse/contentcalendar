"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/store/taskStore";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { FormSection } from "@/components/ui/form-section";
import { MaterialIcon } from "@/components/ui/material-icon";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import { AssigneePicker } from "@/components/shared/AssigneePicker";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";
import type { TaskItem, TaskAssignee } from "@/lib/types";
import { toast } from "sonner";

export function TaskDetailClient({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const { workspaceId } = useSupabaseApp();
  const { canEdit } = usePlannerPermissions();
  const { activeItems: lists } = useTaskLists();
  const { activeItems: types } = useTaskTypes();
  const items = useTaskStore((s) => s.items);
  const addItem = useTaskStore((s) => s.addItem);
  const updateItem = useTaskStore((s) => s.updateItem);
  const existing = items.find((entry) => entry.id === taskId);

  const [draft, setDraft] = useState<TaskItem | null>(() => {
    if (existing) return existing;
    if (!workspaceId) return null;
    const now = new Date();
    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `task-${Date.now()}`,
      workspace_id: workspaceId,
      title: "",
      description: null,
      task_type_id: null,
      list_id: null,
      due_at: null,
      due_time: null,
      position: Date.now(),
      payload: {},
      created_by: null,
      created_at: now,
      updated_at: now,
    };
  });

  const dateValue = useMemo(() => {
    if (!draft?.due_at) return "";
    const d = new Date(draft.due_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [draft?.due_at]);

  if (!draft) {
    return <div className="text-sm text-muted-foreground">ไม่พบงาน</div>;
  }

  const save = () => {
    if (!canEdit) {
      toast.error("บัญชีนี้เป็นโหมดดูอย่างเดียว");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("กรอกชื่องาน");
      return;
    }
    const payload = {
      ...(draft.payload ?? {}),
    };
    const finalTask: TaskItem = {
      ...draft,
      payload,
      updated_at: new Date(),
    };
    if (existing) {
      updateItem(existing.id, finalTask);
      toast.success("บันทึกงานแล้ว");
    } else {
      addItem(finalTask);
      toast.success("สร้างงานแล้ว");
    }
    router.push("/board");
  };

  const hasScheduleData =
    draft.list_id || draft.task_type_id || draft.due_at || (draft.payload?.assignees as TaskAssignee[] | undefined)?.length;

  return (
    <div className="space-y-3">
      <FormSection
        icon="assignment"
        title={existing ? "แก้ไขงาน" : "สร้างงานใหม่"}
        description="ชื่องานและรายละเอียด"
        defaultOpen
        requiredHint={!draft.title.trim() ? "⚠ ยังไม่มีชื่องาน" : undefined}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              ชื่องาน <span className="text-destructive">*</span>
            </Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <MaterialIcon name="edit_note" size={16} className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                disabled={!canEdit}
                placeholder="ชื่องานที่ต้องทำ"
              />
            </InputGroup>
          </div>
          <div className="space-y-1.5">
            <Label>รายละเอียด <span className="text-muted-foreground text-xs">(ไม่บังคับ)</span></Label>
            <Textarea
              rows={4}
              value={draft.description ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  description: e.target.value || null,
                })
              }
              disabled={!canEdit}
              placeholder="รายละเอียดเพิ่มเติม บริบท หรือขั้นตอน"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        icon="event_available"
        title="กำหนดการและผู้รับผิดชอบ"
        description="คอลัมน์, ประเภทงาน, วันครบกำหนด, ผู้รับผิดชอบ"
        badge={hasScheduleData ? "มีข้อมูล" : ""}
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MaterialIcon name="category" size={15} className="text-muted-foreground" />
                คอลัมน์
              </Label>
              <Select
                value={draft.list_id ?? ""}
                onValueChange={(v) => setDraft({ ...draft, list_id: v || null })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกคอลัมน์" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MaterialIcon name="layers" size={15} className="text-muted-foreground" />
                ประเภทงาน
              </Label>
              <Select
                value={draft.task_type_id ?? ""}
                onValueChange={(v) =>
                  setDraft({ ...draft, task_type_id: v || null })
                }
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MaterialIcon name="schedule" size={15} className="text-muted-foreground" />
                กำหนดส่ง
              </Label>
              <InputGroup>
                <InputGroupAddon align="inline-start">
                  <MaterialIcon name="calendar_month" size={15} className="text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="date"
                  value={dateValue}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      due_at: e.target.value
                        ? new Date(`${e.target.value}T12:00:00`)
                        : null,
                    })
                  }
                  disabled={!canEdit}
                />
              </InputGroup>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ผู้รับผิดชอบ</Label>
            <AssigneePicker
              value={(draft.payload?.assignees as TaskAssignee[]) ?? []}
              onChange={(next) =>
                setDraft({
                  ...draft,
                  payload: { ...(draft.payload ?? {}), assignees: next },
                })
              }
              disabled={!canEdit}
            />
          </div>
        </div>
      </FormSection>

      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={!canEdit} className="gap-1">
          <MaterialIcon name="save" size={16} />
          บันทึก
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/board")}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
