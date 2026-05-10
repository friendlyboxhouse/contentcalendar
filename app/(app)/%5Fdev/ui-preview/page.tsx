import { redirect } from "next/navigation";
import { MATERIAL_ICON_NAMES, MaterialIcon } from "@/components/ui/material-icon";
import { STATUS_CONFIG, PILLAR_CONFIG } from "@/lib/constants";
import type { ContentPillar, ContentStatus } from "@/lib/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PillarTag } from "@/components/shared/PillarTag";
import { ContentChip } from "@/components/calendar/ContentChip";
import { MilestoneChip } from "@/components/calendar/MilestoneChip";
import type { CalendarEvent } from "@/lib/calendarEvents";
import type { ContentItem } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const statuses = Object.keys(STATUS_CONFIG) as ContentStatus[];
const pillars = Object.keys(PILLAR_CONFIG) as ContentPillar[];

const previewItem: ContentItem = {
  id: "POST-999",
  createdAt: new Date("2026-05-01T09:00:00.000Z"),
  updatedAt: new Date("2026-05-01T09:00:00.000Z"),
  pillar: "fact",
  contentType: "educational",
  format: "reel",
  platform: ["instagram"],
  funnelStage: "awareness",
  topic: "ตัวอย่างคอนเทนต์สำหรับทดสอบสีในโหมดมืด",
  angle: "Hook angle",
  targetAudience: "Audience",
  hook: "Hook sample",
  captionDirection: "Caption direction",
  visualDirection: "Visual direction",
  cta: "CTA",
  dos: [],
  donts: [],
  referenceLinks: [],
  strategicNotes: "",
  owner: "Demo",
  status: "in_production",
  briefDeadline: new Date("2026-05-04T09:00:00.000Z"),
  productionDeadline: new Date("2026-05-07T09:00:00.000Z"),
  approvalDeadline: new Date("2026-05-08T09:00:00.000Z"),
  publishDate: new Date("2026-05-10T09:00:00.000Z"),
  kpiTargets: {},
};

const previewMilestoneEvent: CalendarEvent = {
  id: "POST-999:review",
  item: previewItem,
  date: new Date("2026-05-08T09:00:00.000Z"),
  kind: "review",
};

export default function UIPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">UI Preview</h1>
        <p className="text-sm text-muted-foreground">
          ตรวจไอคอน, status, pillar, select, tabs และ dialog ก่อนปล่อยจริง
        </p>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-base font-semibold">Icon Coverage</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          {MATERIAL_ICON_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
              <MaterialIcon name={name} size={18} />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-base font-semibold">Status + Pillar</h2>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {pillars.map((pillar) => (
            <PillarTag key={pillar} pillar={pillar} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PreviewThemeBlock title="Light Preview" dark={false} />
        <PreviewThemeBlock title="Dark Preview" dark />
      </section>
    </main>
  );
}

function PreviewThemeBlock({ title, dark }: { title: string; dark: boolean }) {
  return (
    <div className={dark ? "dark" : undefined}>
      <div className="space-y-4 rounded-xl border bg-background p-4 text-foreground">
        <h3 className="font-medium">{title}</h3>

        <div className="max-w-xs">
          <Select defaultValue="editor">
            <SelectTrigger>
              <SelectValue placeholder="เลือกบทบาท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">viewer</SelectItem>
              <SelectItem value="editor">editor</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="tab-a">
          <TabsList>
            <TabsTrigger value="tab-a">Tab A</TabsTrigger>
            <TabsTrigger value="tab-b">Tab B</TabsTrigger>
          </TabsList>
          <TabsContent value="tab-a">ตัวอย่างเนื้อหาแท็บ A</TabsContent>
          <TabsContent value="tab-b">ตัวอย่างเนื้อหาแท็บ B</TabsContent>
        </Tabs>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pillar preview</p>
          <div className="flex flex-wrap gap-2">
            {pillars.map((pillar) => (
              <PillarTag key={`preview-${pillar}`} pillar={pillar} size="sm" />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">KPI badge preview</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              รอรีวิว KPI
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
              KPI 3/5
            </Badge>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Deadline Timeline · ตัวอย่าง
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Brief Due</span>
              <span className="font-medium text-foreground">4 พ.ค.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Production Done</span>
              <span className="font-medium text-foreground">7 พ.ค.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Publish</span>
              <span className="font-medium text-foreground">10 พ.ค.</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Calendar chip preview</p>
          <div className="rounded-lg border p-2">
            <ContentChip item={previewItem} onOpen={() => void 0} />
            <MilestoneChip
              event={previewMilestoneEvent}
              onOpen={() => void 0}
            />
          </div>
        </div>

        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Preview</DialogTitle>
              <DialogDescription>
                ตรวจความคมของไอคอนปุ่มปิดและคอนทราสต์ overlay
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
