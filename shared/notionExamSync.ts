import type { ExamWorkspace } from "./examWorkspace";

export const NOTION_EXAM_SYNC_LEDGER_PAGE_ID = "3c90b855-65a5-816a-b9c3-f4cd02f15293";
export const NOTION_EXAM_SYNC_LEDGER_URL = "https://app.notion.com/p/3c90b85565a5816ab9c3f4cd02f15293?pvs=204";

type ExamSyncWorkspaceSnapshot = {
  id: string;
  code: string;
  name: string;
  examDate: string;
  examTime?: string;
  completedTasks: number;
  totalTasks: number;
  dailyTasks: { id: string; date: string; title: string; status: string; plannedMinutes?: number }[];
  dailyLogs: { id: string; date: string; completedTaskIds: string[]; minutes?: number; note?: string }[];
  resources: { id: string; title: string; kind: string; url?: string; note?: string }[];
  notes?: string;
};

export type ExamSyncSnapshot = { version: 1; workspaces: ExamSyncWorkspaceSnapshot[] };

export function buildExamSyncSnapshot(workspaces: ExamWorkspace[]): ExamSyncSnapshot {
  return {
    version: 1,
    workspaces: [...workspaces].sort((left, right) => left.id.localeCompare(right.id)).map(workspace => ({
      id: workspace.id,
      code: workspace.code,
      name: workspace.name,
      examDate: workspace.examDate,
      examTime: workspace.examTime,
      completedTasks: workspace.dailyTasks.filter(task => task.status === "done").length,
      totalTasks: workspace.dailyTasks.length,
      dailyTasks: [...workspace.dailyTasks].sort((left, right) => `${left.date}\u0000${left.id}`.localeCompare(`${right.date}\u0000${right.id}`)).map(task => ({ id: task.id, date: task.date, title: task.title, status: task.status, plannedMinutes: task.plannedMinutes })),
      dailyLogs: [...workspace.dailyLogs].sort((left, right) => `${left.date}\u0000${left.id}`.localeCompare(`${right.date}\u0000${right.id}`)).map(log => ({ id: log.id, date: log.date, completedTaskIds: [...log.completedTaskIds].sort(), minutes: log.minutes, note: log.note })),
      resources: [...workspace.resources].sort((left, right) => left.id.localeCompare(right.id)).map(resource => ({ id: resource.id, title: resource.title, kind: resource.kind, url: resource.url, note: resource.note })),
      notes: workspace.notes,
    })),
  };
}

/** A deterministic, non-secret content fingerprint used only to skip duplicate manual syncs. */
export function createExamSyncFingerprint(workspaces: ExamWorkspace[]) {
  const canonical = JSON.stringify(buildExamSyncSnapshot(workspaces));
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `exam-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
