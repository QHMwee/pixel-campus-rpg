export type AchievementRecordKind = "certificate" | "competition";
export type AchievementRecordStatus = "planning" | "in-progress" | "earned" | "completed";
export type AchievementMediaKind = "image" | "video" | "link";

export type AchievementEvidence = {
  id: string;
  name: string;
  kind: AchievementMediaKind;
  storageKey?: string;
  externalUrl?: string;
  mimeType?: string;
  createdAt: string;
};

export type AchievementRecord = {
  id: string;
  kind: AchievementRecordKind;
  title: string;
  organizer?: string;
  status: AchievementRecordStatus;
  targetDate?: string;
  achievedDate?: string;
  description?: string;
  result?: string;
  skills: string[];
  evidence: AchievementEvidence[];
  createdAt: string;
  updatedAt: string;
};

export const achievementRecordKindLabel: Record<AchievementRecordKind, string> = {
  certificate: "證照",
  competition: "比賽",
};

export const achievementRecordStatusLabel: Record<AchievementRecordStatus, string> = {
  planning: "規劃中",
  "in-progress": "進行中",
  earned: "已取得",
  completed: "已完成",
};

export function isAchievementRecord(value: unknown): value is AchievementRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AchievementRecord>;
  return typeof record.id === "string" && (record.kind === "certificate" || record.kind === "competition") && typeof record.title === "string" && Array.isArray(record.skills) && Array.isArray(record.evidence);
}
