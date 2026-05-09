"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

export function normalizeExternalHref(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function SafeExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const u = normalizeExternalHref(href);
  if (!u) return null;
  return (
    <a
      href={u}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/90",
        className
      )}
    >
      {children}
      <MaterialIcon name="open_in_new" size={14} className="opacity-70" />
    </a>
  );
}

export function ReferenceLinksField({
  links,
  onChange,
  canEdit,
}: {
  links: string[];
  onChange: (next: string[]) => void;
  canEdit: boolean;
}) {
  if (!canEdit) {
    const cleaned = links.map((s) => s.trim()).filter(Boolean);
    if (!cleaned.length) {
      return (
        <p className="text-sm text-muted-foreground">ไม่มีลิงก์อ้างอิง</p>
      );
    }
    return (
      <ul className="space-y-2 text-sm">
        {cleaned.map((url, i) => (
          <li key={`${url}-${i}`} className="break-all">
            <SafeExternalLink href={url}>{url}</SafeExternalLink>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((url, i) => (
        <Input
          key={i}
          placeholder="https://"
          value={url}
          onChange={(e) => {
            const next = [...links];
            next[i] = e.target.value;
            onChange(next);
          }}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...links, ""])}
      >
        + Link
      </Button>
    </div>
  );
}

export function AssetFolderLinkField({
  value,
  onChange,
  canEdit,
}: {
  value: string;
  onChange: (v: string) => void;
  canEdit: boolean;
}) {
  const v = value?.trim() ?? "";
  return (
    <div className="space-y-2">
      <Label>โฟลเดอร์ไฟล์ (Drive / Dropbox)</Label>
      {!canEdit ? (
        v ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <SafeExternalLink href={v}>{v}</SafeExternalLink>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ไม่มีลิงก์</p>
        )
      ) : (
        <Input
          placeholder="Drive / Dropbox URL"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
