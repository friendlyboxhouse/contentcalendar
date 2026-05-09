"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useContentStore } from "@/store/contentStore";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const briefs = useContentStore((s) => s.items);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (
        e.key.toLowerCase() === "n" &&
        !(e.target as HTMLElement | null)?.closest(
          "input, textarea, [contenteditable]"
        )
      ) {
        e.preventDefault();
        router.push("/briefs/new");
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [router]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton>
      <Command className="rounded-xl border-none shadow-none">
        <CommandInput placeholder="ค้นหา Brief..." />
        <CommandList>
          <CommandEmpty>ไม่พบผลลัพธ์</CommandEmpty>
          <CommandGroup heading="Briefs">
            {briefs.map((b) => (
              <CommandItem
                key={b.id}
                value={`${b.id} ${b.topic}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/briefs/${b.id}`);
                }}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {b.id}
                </span>
                <span className="ml-2 truncate">{b.topic || "(ไม่มีหัวข้อ)"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
