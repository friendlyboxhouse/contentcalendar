"use client";

import { useDeferredValue, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useContentStore } from "@/store/contentStore";
import type { ContentStatus, PlannerFilters } from "@/lib/types";
import { FilterBar } from "@/components/shared/FilterBar";
import { ActiveFilterChips } from "@/components/shared/ActiveFilterChips";
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
import { getNearestDeadline } from "@/lib/nearestDeadline";
import { PageSpinner } from "@/components/ui/feedback/PageSpinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlannerPermissions } from "@/hooks/usePlannerPermissions";
import { useContentStoreHydrated } from "@/hooks/useContentStoreHydrated";
import { useSupabaseApp } from "@/components/supabase/SupabaseAppProvider";
import { PageHeader } from "@/components/ui/page-header";
import { ownerLabelFromStored } from "@/lib/ownerMapping";

function BriefsInner() {
  const router = useRouter();
  const hydrated = useContentStoreHydrated();
  const { workspaceLoading, contentSyncedOnce, workspaceMembers } = useSupabaseApp();
  const items = useContentStore((s) => s.items);
  const updateStatus = useContentStore((s) => s.updateStatus);
  const deleteItem = useContentStore((s) => s.deleteItem);
  const addItem = useContentStore((s) => s.addItem);
  const searchParams = useSearchParams();
  const fsParam = searchParams.get("fs");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
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

  const { canEdit, canChangeStatus, canDelete } = usePlannerPermissions();

  const owners = useMemo(() => {
    const set = new Set(items.map((i) => i.owner).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    let list = filterContentItems(items, filters);
    if (fsStatuses?.length) {
      list = list.filter((i) => fsStatuses.includes(i.status));
    }
    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLowerCase();
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
  }, [items, filters, fsStatuses, deferredSearch]);

  if (!hydrated || workspaceLoading || !contentSyncedOnce) {
    return (
      <div className="min-h-[min(60vh,420px)] py-8">
        <PageSpinner label="กำลังซิงค์รายการบรีฟ…" />
      </div>
    );
  }

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

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteItem(deleteTarget);
    toast.success(`ลบ ${deleteTarget} แล้ว`, {
      action: {
        label: "เลิกทำ",
        onClick: () => useContentStore.getState().undoDelete(),
      },
    });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลบบรีฟนี้?</DialogTitle>
            <DialogDescription>
              บรีฟ <span className="font-mono font-semibold">{deleteTarget}</span> จะถูกลบออก — ยังสามารถเลิกทำได้ทันทีหลังจากนี้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        title="คอนเทนต์บรีฟ"
        description="ศูนย์กลางบรีฟ · เชื่อมกับปฏิทินอัตโนมัติ"
        actions={
          canEdit ? (
            <Link href="/briefs/new">
              <Button size="sm" className="gap-1.5">
                <MaterialIcon name="add" size={16} />
                สร้างบรีฟใหม่
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MaterialIcon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ค้นหา Topic หรือ POST-ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          options={["status", "pillar", "owner", "platform", "format"]}
          owners={owners}
        />
      </div>
      <ActiveFilterChips filters={filters} onChange={setFilters} />

      <div className="space-y-3">
        {filtered.map((item) => {
          const nearest = getNearestDeadline(item);
          return (
            <Card
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/briefs/${item.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  router.push(`/briefs/${item.id}`);
              }}
              className="overflow-hidden border-l-[4px] cursor-pointer transition-all hover:shadow-md hover:-translate-y-px"
              style={{ borderLeftColor: PILLAR_CONFIG[item.pillar].color }}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Row 1: meta tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.id}
                    </span>
                    <PillarTag pillar={item.pillar} size="sm" />
                    <span
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <StatusBadge
                        status={item.status}
                        editable={canChangeStatus}
                        onChange={(st) => {
                          updateStatus(item.id, st);
                          toast.success("อัปเดตสถานะ");
                        }}
                      />
                    </span>
                  </div>
                  {/* Row 2: topic */}
                  <p className="text-sm font-semibold leading-snug">
                    {item.topic || "(ไม่มีหัวข้อ)"}
                  </p>
                  {/* Row 3: sub-meta + single countdown */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{FORMAT_LABELS[item.format]}</span>
                    <span>{item.platform.map((p) => PLATFORM_LABELS[p]).join(", ")}</span>
                    <span>ผู้รับผิดชอบ: {ownerLabelFromStored(item.owner, workspaceMembers)}</span>
                    {nearest && (
                      <CountdownTimer
                        label={nearest.label}
                        targetDate={nearest.date}
                        compact
                      />
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:min-h-10 max-md:min-w-10"
                    disabled={!canEdit}
                    aria-label={`คัดลอกบรีฟ ${item.id}`}
                    onClick={(e) => { e.stopPropagation(); duplicate(item.id); }}
                  >
                    <MaterialIcon name="content_copy" size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:min-h-10 max-md:min-w-10 text-destructive hover:text-destructive"
                    disabled={!canDelete}
                    aria-label={`ลบ ${item.id}`}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); }}
                  >
                    <MaterialIcon name="delete" size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:min-h-10 max-md:min-w-10"
                    aria-label={`เปิดบรีฟ ${item.id}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/briefs/${item.id}`); }}
                  >
                    <MaterialIcon name="arrow_forward" size={18} className="text-primary" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!filtered.length && (
        <EmptyState
          icon="note_add"
          title="ยังไม่มีบรีฟในตัวกรองนี้"
          description="สร้างบรีฟใหม่หรือปรับตัวกรองด้านบนเพื่อดูรายการอื่น"
        >
          {canEdit ? (
            <Link
              href="/briefs/new"
              className={cn(buttonVariants({ size: "sm" }), "no-underline gap-1.5")}
            >
              <MaterialIcon name="add" size={16} />
              สร้างบรีฟใหม่
            </Link>
          ) : null}
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
