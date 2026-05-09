"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useContentStore } from "@/store/contentStore";
import type { ContentStatus, PlannerFilters } from "@/lib/types";
import { FilterBar } from "@/components/shared/FilterBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PillarTag } from "@/components/shared/PillarTag";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CountdownTimer } from "@/components/shared/CountdownTimer";
import {
  FORMAT_LABELS,
  PLATFORM_LABELS,
  PILLAR_CONFIG,
} from "@/lib/constants";
import { filterContentItems } from "@/lib/filterContent";
import { MaterialIcon } from "@/components/ui/material-icon";
import { toast } from "sonner";
import { cn, generatePostId } from "@/lib/utils";
import { reviveContentItem } from "@/lib/revive";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";

function BriefsInner() {
  const router = useRouter();
  const items = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const deleteItem = useContentStore((s) => s.deleteItem);
  const addItem = useContentStore((s) => s.addItem);
  const searchParams = useSearchParams();
  const fsParam = searchParams.get("fs");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PlannerFilters>({
    pillar: "all",
    platform: "all",
    status: "all",
    format: "all",
    owner: "all",
  });

  const fsStatuses = useMemo(() => {
    if (!fsParam) return null;
    return fsParam.split(",").filter(Boolean) as ContentStatus[];
  }, [fsParam]);

  const owners = useMemo(() => {
    const set = new Set(items.map((i) => i.owner).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    let list = filterContentItems(items, filters);
    if (fsStatuses?.length) {
      list = list.filter((i) => fsStatuses.includes(i.status));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.topic.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        new Date(a.publishDate).getTime() -
        new Date(b.publishDate).getTime()
    );
  }, [items, filters, fsStatuses, search]);

  const duplicate = (id: string) => {
    const src = items.find((i) => i.id === id);
    if (!src) return;
    const copy = reviveContentItem({
      ...src,
      id: generatePostId(items),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "idea",
      topic: `${src.topic} (copy)`,
    });
    addItem(copy);
    toast.success(`คัดลอกเป็น ${copy.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">คอนเทนต์บรีฟ</h1>
          <p className="text-sm text-muted-foreground">
            ศูนย์กลางบรีฟ · เชื่อมกับปฏิทินอัตโนมัติ
          </p>
        </div>
        <Link href="/briefs/new">
          <Button size="sm">สร้างบรีฟใหม่</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          options={["status", "pillar", "owner", "platform", "format"]}
          owners={owners}
        />
        <Input
          placeholder="ค้นหา Topic หรือ POST-ID..."
          className="max-w-xs flex-1 min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
            <Card
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/briefs/${item.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  router.push(`/briefs/${item.id}`);
              }}
              className="overflow-hidden border-l-[4px] cursor-pointer transition hover:shadow-md"
              style={{ borderLeftColor: PILLAR_CONFIG[item.pillar].color }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.id}
                    </span>
                    <PillarTag pillar={item.pillar} size="sm" />
                    <span
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <StatusBadge
                        status={item.status}
                        editable
                        onChange={(st) => {
                          updateStatus(item.id, st);
                          toast.success("อัปเดตสถานะ");
                        }}
                      />
                    </span>
                  </div>
                  <p className="text-base font-semibold leading-snug">
                    {item.topic || "(ไม่มีหัวข้อ)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FORMAT_LABELS[item.format]} ·{" "}
                    {item.platform.map((p) => PLATFORM_LABELS[p]).join(", ")} ·
                    Owner: {item.owner} · Publish:{" "}
                    {new Date(item.publishDate).toLocaleDateString("th-TH")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <CountdownTimer
                      label="Brief Due"
                      targetDate={new Date(item.briefDeadline)}
                      compact
                    />
                    <CountdownTimer
                      label="Approval Due"
                      targetDate={new Date(item.approvalDeadline)}
                      compact
                    />
                    <CountdownTimer
                      label="Publish"
                      targetDate={new Date(item.publishDate)}
                      compact
                    />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-md:min-h-11 max-md:min-w-11"
                    aria-label={`เปิดบรีฟ ${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/briefs/${item.id}`);
                    }}
                  >
                    <MaterialIcon
                      name="arrow_forward"
                      size={20}
                      className="text-foreground"
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-md:min-h-11 max-md:min-w-11"
                    aria-label={`คัดลอกบรีฟ ${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicate(item.id);
                    }}
                  >
                    <MaterialIcon name="content_copy" size={20} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-md:min-h-11 max-md:min-w-11"
                    aria-label={`ลบ ${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`ลบ ${item.id}?`)) return;
                      deleteItem(item.id);
                      toast.success(`ลบ ${item.id}`, {
                        action: {
                          label: "เลิกทำ",
                          onClick: () =>
                            useContentStore.getState().undoDelete(),
                        },
                      });
                    }}
                  >
                    <MaterialIcon
                      name="delete"
                      size={20}
                      className="text-destructive"
                    />
                  </Button>
                </div>
              </div>
            </Card>
        ))}
      </div>

      {!filtered.length && (
        <EmptyState
          icon="note_add"
          title="ยังไม่มีบรีฟในตัวกรองนี้"
          description="สร้างบรีฟใหม่หรือปรับตัวกรองด้านบนเพื่อดูรายการอื่น"
        >
          <Link
            href="/briefs/new"
            className={cn(buttonVariants({ size: "sm" }), "no-underline")}
          >
            สร้างบรีฟใหม่
          </Link>
        </EmptyState>
      )}
    </div>
  );
}

export function BriefsPageClient() {
  return (
    <Suspense fallback={<PageSpinner label="กำลังโหลดรายการบรีฟ…" />}>
      <BriefsInner />
    </Suspense>
  );
}
