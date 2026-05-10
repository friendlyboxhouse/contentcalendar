"use client";

import { format } from "date-fns";
import type { RevisionHistoryEntry, RevisionRound } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Separator } from "@/components/ui/separator";

export function RevisionHistoryCard({
  canEdit,
  revRound,
  revNote,
  history,
  onRoundChange,
  onNoteChange,
  onAdd,
}: {
  canEdit: boolean;
  revRound: RevisionRound;
  revNote: string;
  history: RevisionHistoryEntry[];
  onRoundChange: (value: RevisionRound) => void;
  onNoteChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MaterialIcon name="history_edu" size={18} />
          Revision history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <Select
            value={revRound}
            disabled={!canEdit}
            onValueChange={(v) => onRoundChange(v as RevisionRound)}
          >
            <SelectTrigger className="w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["R1", "R2", "R3+"] as RevisionRound[]).map((round) => (
                <SelectItem key={round} value={round}>
                  {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="บันทึกสิ่งที่ต้องแก้ / feedback"
            value={revNote}
            disabled={!canEdit}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!canEdit}
            className="gap-1"
            onClick={onAdd}
          >
            <MaterialIcon name="add_comment" size={18} />
            เพิ่ม
          </Button>
        </div>
        <Separator />
        <ul className="max-h-60 space-y-3 overflow-y-auto text-sm">
          {[...history]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((row, index) => (
              <li
                key={`${row.date.toString()}-${index}`}
                className="rounded-md border bg-muted/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{row.round}</span>
                  <span>{format(new Date(row.date), "dd MMM yyyy HH:mm")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{row.note}</p>
              </li>
            ))}
          {!history.length && (
            <li className="text-xs text-muted-foreground">ยังไม่มีประวัติ revision</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
