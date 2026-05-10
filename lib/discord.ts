import { STATUS_CONFIG } from "@/lib/constants";
import type { ContentStatus } from "@/lib/types";

export type DiscordProgressDigestItem = {
  id: string;
  topic: string;
  owner: string;
  status: ContentStatus;
  milestoneLabel: string;
  dueAt: Date;
};

export type DiscordDigestInput = {
  workspaceName: string;
  dateLabel: string;
  items: DiscordProgressDigestItem[];
};

export type DiscordWebhookPayload = {
  content: string;
};

type DiscordSendResult =
  | { ok: true }
  | { ok: false; status?: number; error: string };

function summarizeByStatus(items: DiscordProgressDigestItem[]): string[] {
  const counts = new Map<ContentStatus, number>();
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `- ${STATUS_CONFIG[status].label}: ${count}`);
}

function topOverdue(items: DiscordProgressDigestItem[], now: Date): string[] {
  const overdue = items
    .filter(
      (item) =>
        item.dueAt.getTime() < now.getTime() &&
        item.status !== "published" &&
        item.status !== "kpi_pending"
    )
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 5);

  return overdue.map((item) => {
    const safeTopic = item.topic?.trim() || "(ไม่มีหัวข้อ)";
    return `- ${item.id} · ${safeTopic} · ${item.owner} · ${item.milestoneLabel}`;
  });
}

export function formatDailyProgressDigest(
  input: DiscordDigestInput,
  now = new Date()
): DiscordWebhookPayload {
  const total = input.items.length;
  const overdueCount = input.items.filter(
    (item) =>
      item.dueAt.getTime() < now.getTime() &&
      item.status !== "published" &&
      item.status !== "kpi_pending"
  ).length;

  const breakdown = summarizeByStatus(input.items);
  const overdueLines = topOverdue(input.items, now);

  const lines: string[] = [
    `**Daily Progress Content**`,
    `Workspace: **${input.workspaceName}**`,
    `Date: **${input.dateLabel}**`,
    "",
    `Total today: **${total}**`,
    `Overdue (open): **${overdueCount}**`,
    "",
    "**Status breakdown**",
    ...(breakdown.length ? breakdown : ["- ไม่มีรายการวันนี้"]),
  ];

  if (overdueLines.length) {
    lines.push("", "**Top overdue**", ...overdueLines);
  }

  return { content: lines.join("\n") };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<DiscordSendResult> {
  const url = webhookUrl.trim();
  if (!url) return { ok: false, error: "empty_webhook_url" };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) return { ok: true };

      if (attempt === maxAttempts) {
        return {
          ok: false,
          status: response.status,
          error: `discord_webhook_error_${response.status}`,
        };
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "discord_send_failed",
        };
      }
    }
    await sleep(300 * attempt);
  }

  return { ok: false, error: "discord_send_unknown_failure" };
}
