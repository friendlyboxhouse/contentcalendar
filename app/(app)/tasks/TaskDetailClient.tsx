"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/store/taskStore";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existing ? "แก้ไขงาน" : "สร้างงานใหม่"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>ชื่องาน</Label>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>รายละเอียด</Label>
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
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>คอลัมน์</Label>
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
          <div className="space-y-2">
            <Label>ประเภทงาน</Label>
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
          <div className="space-y-2">
            <Label>กำหนดส่ง</Label>
            <Input
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
          </div>
        </div>
        <div className="space-y-2">
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
        <div className="flex gap-2">
          <Button type="button" onClick={save} disabled={!canEdit}>
            บันทึก
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/board")}>
            ยกเลิก
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
