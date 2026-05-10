export type TelegramDigestTask = {
  id: string;
  topic: string;
  milestoneLabel: string;
  dueAt: Date;
  statusLabel: string;
  briefUrl?: string;
};

export type DailyDigestInput = {
  recipientName: string;
  workspaceName?: string;
  dateLabel: string;
  tasks: TelegramDigestTask[];
};

type TelegramSendResult =
  | { ok: true; messageId?: number }
  | { ok: false; error: string; status?: number };

type TelegramApiResult<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: string; status?: number };

function getTelegramBotToken(): TelegramApiResult<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" };
  }
  return { ok: true, result: token };
}

function getTelegramApiBase(): string {
  return (
    process.env.TELEGRAM_API_BASE_URL?.trim() || "https://api.telegram.org"
  );
}

function shortTime(date: Date): string {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
}

export function formatDailyDigest(input: DailyDigestInput): string {
  const headerWorkspace = input.workspaceName
    ? `\nWorkspace: ${input.workspaceName}`
    : "";

  if (!input.tasks.length) {
    return [
      `สวัสดี ${input.recipientName}`,
      `สรุปงานวันนี้ (${input.dateLabel})${headerWorkspace}`,
      "",
      "วันนี้ยังไม่มีงานที่ assign ให้คุณตามตาราง",
      "หากมีการอัปเดตบรีฟ ระบบจะสรุปใหม่ในรอบถัดไป",
    ].join("\n");
  }

  const lines = input.tasks.map((task, idx) => {
    const safeTopic = task.topic?.trim() || "(ไม่มีหัวข้อ)";
    const link = task.briefUrl ? `\n   เปิดบรีฟ: ${task.briefUrl}` : "";
    return [
      `${idx + 1}. ${task.milestoneLabel} · ${shortTime(task.dueAt)}`,
      `   ${task.id} · ${safeTopic}`,
      `   สถานะ: ${task.statusLabel}${link}`,
    ].join("\n");
  });

  return [
    `สวัสดี ${input.recipientName}`,
    `สรุปงานวันนี้ (${input.dateLabel})${headerWorkspace}`,
    "",
    ...lines,
    "",
    "อัปเดตจาก Content Planner อัตโนมัติ",
  ].join("\n");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  const token = getTelegramBotToken();
  if (!token.ok) return token;
  const endpoint = `${getTelegramApiBase()}/bot${token.result}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          description?: string;
          result?: { message_id?: number };
        }
      | null;

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.description || `Telegram API error (${response.status})`,
      };
    }

    return {
      ok: true,
      messageId: payload.result?.message_id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error",
    };
  }
}

export async function setTelegramWebhook(input: {
  webhookUrl: string;
  secretToken: string;
}): Promise<TelegramApiResult<{ description?: string }>> {
  const token = getTelegramBotToken();
  if (!token.ok) return token;
  const endpoint = `${getTelegramApiBase()}/bot${token.result}/setWebhook`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: input.webhookUrl,
        secret_token: input.secretToken,
        allowed_updates: ["message"],
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; description?: string; result?: { description?: string } }
      | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.description || `Telegram API error (${response.status})`,
      };
    }
    return { ok: true, result: { description: payload.description } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error",
    };
  }
}

export async function getTelegramWebhookInfo(): Promise<
  TelegramApiResult<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  }>
> {
  const token = getTelegramBotToken();
  if (!token.ok) return token;
  const endpoint = `${getTelegramApiBase()}/bot${token.result}/getWebhookInfo`;
  try {
    const response = await fetch(endpoint, { method: "GET" });
    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          description?: string;
          result?: {
            url?: string;
            pending_update_count?: number;
            last_error_message?: string;
          };
        }
      | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.description || `Telegram API error (${response.status})`,
      };
    }
    return {
      ok: true,
      result: {
        url: payload.result?.url,
        pending_update_count: payload.result?.pending_update_count,
        last_error_message: payload.result?.last_error_message,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error",
    };
  }
}
