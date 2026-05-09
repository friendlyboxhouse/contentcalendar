"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl/⌘", "K"], description: "เปิดค้นหาด่วน / คำสั่ง" },
  { keys: ["N"], description: "สร้างบรีฟใหม่" },
  { keys: ["?"], description: "เปิดคู่มือคีย์ลัดนี้" },
  { keys: ["Esc"], description: "ปิดหน้าต่างซ้อน" },
];

export function KeyboardShortcutsHint() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inField = !!(e.target as HTMLElement | null)?.closest(
        "input, textarea, [contenteditable]"
      );
      if (inField) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Floating help button — desktop only */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="แสดงคีย์ลัด"
        className="fixed bottom-4 right-4 z-30 hidden h-9 w-9 rounded-full bg-card shadow-lg hover:shadow-xl md:inline-flex"
        title="คีย์ลัด (?)"
      >
        <MaterialIcon name="keyboard" size={18} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MaterialIcon name="keyboard" size={20} />
              คีย์ลัด
            </DialogTitle>
            <DialogDescription>
              ใช้คีย์ลัดเพื่อทำงานเร็วขึ้น
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm">
            {SHORTCUTS.map((s) => (
              <li
                key={s.description}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2"
              >
                <span className="text-foreground">{s.description}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs font-semibold shadow-sm"
                    >
                      {k.replace("Ctrl/⌘", isMac ? "⌘" : "Ctrl")}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            หมายเหตุ: คีย์ลัดทำงานเฉพาะเมื่อไม่ได้พิมพ์ในกล่องข้อความ
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
