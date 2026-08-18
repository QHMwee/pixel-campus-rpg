export const LOCAL_BACKUP_VERSION = 1;

export type LocalBackupEnvelope = {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

export function createLocalBackup(data: Record<string, unknown>, exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ version: LOCAL_BACKUP_VERSION, exportedAt, data });
}

export function parseLocalBackup(text: string): LocalBackupEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("備份檔不是有效的 JSON 格式。");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("備份檔格式無效。");
  const candidate = parsed as Partial<LocalBackupEnvelope>;
  if (candidate.version !== LOCAL_BACKUP_VERSION || !candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data)) {
    throw new Error("此檔案不是相容的 Campus Quest 本機備份。");
  }
  return { version: candidate.version, exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : "", data: candidate.data as Record<string, unknown> };
}
