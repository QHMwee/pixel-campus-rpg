import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotionSyncEvent, getNotionSyncEvent, updateNotionSyncEventStatus } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { academicSyncPayloadSchema } from "./academicSync";
import { buildExamSyncSnapshot, createExamSyncFingerprint, NOTION_EXAM_SYNC_LEDGER_PAGE_ID, NOTION_EXAM_SYNC_LEDGER_URL } from "../../shared/notionExamSync";

const NOTION_API_VERSION = "2026-03-11";
const maxTextLength = 1_700;

type NotionRichText = { type: "text"; text: { content: string; link?: { url: string } } };
type NotionBlock = Record<string, unknown>;

function safeText(value: string, max = maxTextLength) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function richText(content: string, url?: string): NotionRichText[] {
  const text = safeText(content);
  return text ? [{ type: "text", text: { content: text, ...(url ? { link: { url } } : {}) } }] : [];
}

function paragraph(content: string): NotionBlock {
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText(content) } };
}

function heading(level: 2 | 3, content: string): NotionBlock {
  const type = `heading_${level}`;
  return { object: "block", type, [type]: { rich_text: richText(content) } };
}

function bullet(content: string): NotionBlock {
  return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: richText(content) } };
}

function linkedBullet(label: string, url: string): NotionBlock {
  return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: richText(label, url) } };
}

export function buildNotionExamSyncBlocks(workspaces: z.infer<typeof academicSyncPayloadSchema>["examWorkspaces"], syncedAt: Date): NotionBlock[] {
  const snapshot = buildExamSyncSnapshot(workspaces);
  const blocks: NotionBlock[] = [
    heading(2, `同步快照｜${syncedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}`),
    paragraph("來源：Campus Quest｜此為手動追加式同步快照，不會修改多益或 CPE 的既有 Notion 計畫與資料庫。"),
  ];
  for (const workspace of snapshot.workspaces) {
    const source = workspaces.find(item => item.id === workspace.id)?.source;
    blocks.push(heading(3, `${workspace.code.toUpperCase()}｜${workspace.name}`));
    blocks.push(bullet(`考試：${workspace.examDate}${workspace.examTime ? ` ${workspace.examTime}` : ""}；每日任務完成 ${workspace.completedTasks}/${workspace.totalTasks}；已建立 ${workspace.dailyLogs.length} 筆讀書日誌；準備資料 ${workspace.resources.length} 筆。`));
    if (source) blocks.push(linkedBullet(`開啟原始計畫：${source.label}`, source.url));
    for (const log of workspace.dailyLogs.slice(-12).reverse()) {
      blocks.push(bullet(`讀書日誌｜${log.date}${log.minutes === undefined ? "" : `｜${log.minutes} 分`}${log.completedTaskIds.length ? `｜勾選 ${log.completedTaskIds.length} 項` : ""}${log.note ? `｜${log.note}` : ""}`));
    }
    for (const resource of workspace.resources.slice(-12)) {
      const line = `準備資料｜${resource.kind}｜${resource.title}${resource.note ? `｜${resource.note}` : ""}`;
      blocks.push(resource.url ? linkedBullet(line, resource.url) : bullet(line));
    }
    if (workspace.notes) blocks.push(bullet(`工作區筆記｜${workspace.notes}`));
  }
  return blocks.slice(0, 96);
}

async function appendExamSnapshotToNotion(workspaces: z.infer<typeof academicSyncPayloadSchema>["examWorkspaces"]) {
  const token = process.env.NOTION_API_KEY;
  if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Notion 同步尚未完成憑證設定。" });
  const response = await fetch(`https://api.notion.com/v1/blocks/${NOTION_EXAM_SYNC_LEDGER_PAGE_ID}/children`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Notion-Version": NOTION_API_VERSION },
    body: JSON.stringify({ children: buildNotionExamSyncBlocks(workspaces, new Date()) }),
  });
  if (!response.ok) {
    const detail = safeText(await response.text().catch(() => ""), 240);
    throw new TRPCError({ code: "BAD_GATEWAY", message: `Notion 同步失敗（${response.status}）${detail ? `：${detail}` : ""}` });
  }
}

export const notionSyncRouter = router({
  appendExamSnapshot: adminProcedure.input(academicSyncPayloadSchema.pick({ examWorkspaces: true })).mutation(async ({ ctx, input }) => {
    if (!input.examWorkspaces.length) throw new TRPCError({ code: "BAD_REQUEST", message: "目前沒有可同步的考試工作區。" });
    const fingerprint = createExamSyncFingerprint(input.examWorkspaces);
    const existing = await getNotionSyncEvent(ctx.user.id, fingerprint);
    if (existing?.status === "synced") return { status: "duplicate" as const, pageUrl: NOTION_EXAM_SYNC_LEDGER_URL, syncedAt: existing.updatedAt };
    if (existing?.status === "pending") return { status: "pending" as const, pageUrl: NOTION_EXAM_SYNC_LEDGER_URL, syncedAt: existing.updatedAt };
    const event = existing ?? await createNotionSyncEvent({ ownerId: ctx.user.id, fingerprint, status: "pending", pageUrl: NOTION_EXAM_SYNC_LEDGER_URL });
    if (!event) return { status: "pending" as const, pageUrl: NOTION_EXAM_SYNC_LEDGER_URL, syncedAt: new Date() };
    if (existing) await updateNotionSyncEventStatus(existing.id, "pending");
    try {
      await appendExamSnapshotToNotion(input.examWorkspaces);
      const synced = await updateNotionSyncEventStatus(event.id, "synced");
      return { status: "synced" as const, pageUrl: NOTION_EXAM_SYNC_LEDGER_URL, syncedAt: synced?.updatedAt ?? new Date() };
    } catch (error) {
      await updateNotionSyncEventStatus(event.id, "failed");
      throw error;
    }
  }),
});
