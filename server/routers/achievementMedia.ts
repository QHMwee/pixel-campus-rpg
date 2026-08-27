import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPrivateAchievementMedia } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const allowedMimeType = z.string().refine(value => value.startsWith("image/") || value.startsWith("video/"), "僅支援圖片或影片檔案");

export function getAchievementMediaKind(mimeType: string) {
  return mimeType.startsWith("image/") ? "image" as const : "video" as const;
}

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) throw new TRPCError({ code: "BAD_REQUEST", message: "附件內容格式無效" });
  const bytes = Buffer.from(value, "base64");
  if (!bytes.length || bytes.length > MAX_MEDIA_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "圖片或影片檔案需介於 1 位元組至 20 MB 之間" });
  return bytes;
}

function safeFileName(fileName: string) {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  return clean || "evidence";
}

export const achievementMediaRouter = router({
  upload: adminProcedure.input(z.object({ recordId: z.string().min(1).max(160), fileName: z.string().min(1).max(300), mimeType: allowedMimeType, base64: z.string().min(4).max(Math.ceil(MAX_MEDIA_BYTES * 4 / 3) + 8) })).mutation(async ({ ctx, input }) => {
    const bytes = decodeBase64(input.base64);
    const evidenceId = crypto.randomUUID();
    const stored = await storagePut(`private-evidence/${ctx.user.id}/${input.recordId}/${evidenceId}-${safeFileName(input.fileName)}`, bytes, input.mimeType);
    await createPrivateAchievementMedia({ id: evidenceId, ownerId: ctx.user.id, storageKey: stored.key, fileName: input.fileName, mimeType: input.mimeType });
    return { id: evidenceId, name: input.fileName, kind: getAchievementMediaKind(input.mimeType), storageKey: stored.key, mimeType: input.mimeType, createdAt: new Date().toISOString() };
  }),
});
