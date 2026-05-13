"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import type { TaskAssignee, TaskItem } from "@/lib/types";

export function TaskQuickCreateDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCreate: (item: TaskItem) => void;
}) {
  const { activeItems: lists } = useTaskLists();
  const { activeItems: types } = useTaskTypes();
  const [title, setTitle] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [listId, setListId] = useState<string>("");
  const [due, setDue] = useState("");
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);

  const listById = useMemo(
    () => new Map(lists.map((list) => [list.id, list])),
    [lists]
  );
  const typeById = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types]
  );

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date();
    onCreate({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `task-${Date.now()}`,
      workspace_id: workspaceId,
      title: trimmed,
      description: null,
      task_type_id: typeId || null,
      list_id: listId || lists[0]?.id || null,
      due_at: due ? new Date(`${due}T12:00:00`) : null,
      due_time: null,
      position: Date.now(),
      payload: { assignees },
      created_by: null,
      created_at: now,
      updated_at: now,
    });
    setTitle("");
    setTypeId("");
    setListId("");
    setDue("");
    setAssignees([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>เพิ่มงานใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="ชื่องาน"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={listId} onValueChange={(v) => setListId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกคอลัมน์">
                  {(value) =>
                    value ? listById.get(String(value))?.label ?? null : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeId} onValueChange={(v) => setTypeId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="ประเภทงาน">
                  {(value) =>
                    value ? typeById.get(String(value))?.label ?? null : null
                  }
                </SelectValue>
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
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <AssigneePicker value={assignees} onChange={setAssignees} />
          <Button type="button" onClick={submit}>
            เพิ่มงาน
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
