import { z } from "zod";
import { createPrivateAcademicSyncState, getPrivateAcademicSyncState, updatePrivateAcademicSyncState } from "../db";
import { adminProcedure, router } from "../_core/trpc";

const courseCategory = z.enum(["required", "elective", "general", "common", "undeclared-required"]);
const letterGrade = z.enum(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]);
const recognition = z.enum(["standard", "approved-external", "pending", "gpa-only"]);
const workspaceTaskStatus = z.enum(["needs-review", "not-started", "active", "done", "deferred", "blocked"]);
const workspaceProjectStatus = z.enum(["planning", "active", "done", "paused"]);
const achievementRecordKind = z.enum(["certificate", "competition"]);
const achievementRecordStatus = z.enum(["planning", "in-progress", "earned", "completed"]);
const achievementMediaKind = z.enum(["image", "video", "link"]);
const examWorkspaceCode = z.enum(["toeic", "cpe"]);
const examTaskStatus = z.enum(["needs-review", "not-started", "done"]);
const examResourceKind = z.enum(["vocabulary", "practice", "notes", "mock", "link", "document", "other"]);
const workspaceMemberSchema = z.object({ id: z.string().min(1).max(120), name: z.string().min(1).max(160), role: z.string().min(1).max(160) });
const dailyProjectLogSchema = z.object({
  id: z.string().min(1).max(160), date: z.string().min(1).max(40), completedTaskIds: z.array(z.string().max(160)).max(1_000),
  minutes: z.number().int().min(0).max(100_000).optional(), note: z.string().max(5_000).optional(),
});
const workspaceTaskSchema = z.object({
  id: z.string().min(1).max(160), title: z.string().min(1).max(240), description: z.string().max(10_000), phase: z.string().max(160), scheduleLabel: z.string().max(160), assigneeIds: z.array(z.string().max(120)).max(30), status: workspaceTaskStatus,
  estimatedMinutes: z.number().int().min(0).max(100_000).optional(), extensionMinutes: z.number().int().min(0).max(100_000).optional(), actualMinutes: z.number().int().min(0).max(100_000).optional(), note: z.string().max(5_000).optional(),
});
const workspaceProjectSchema = z.object({
  id: z.string().min(1).max(160), name: z.string().min(1).max(240), description: z.string().max(20_000), status: workspaceProjectStatus,
  source: z.object({ provider: z.literal("notion"), url: z.string().url().max(2_000), label: z.string().max(300), importedAt: z.string().max(40) }), tags: z.array(z.string().max(80)).max(40), members: z.array(workspaceMemberSchema).max(50), tasks: z.array(workspaceTaskSchema).max(1_000), dailyLogs: z.array(dailyProjectLogSchema).max(2_000).default([]),
});
const achievementEvidenceSchema = z.object({
  id: z.string().min(1).max(160), name: z.string().min(1).max(300), kind: achievementMediaKind,
  storageKey: z.string().min(1).max(1_000).optional(), externalUrl: z.string().url().max(2_000).optional(), mimeType: z.string().max(160).optional(), createdAt: z.string().min(1).max(40),
}).refine(evidence => Boolean(evidence.storageKey || evidence.externalUrl), { message: "附件必須包含私人檔案或外部連結" });
const achievementRecordSchema = z.object({
  id: z.string().min(1).max(160), kind: achievementRecordKind, title: z.string().min(1).max(300), organizer: z.string().max(300).optional(), status: achievementRecordStatus,
  targetDate: z.string().max(40).optional(), achievedDate: z.string().max(40).optional(), description: z.string().max(10_000).optional(), result: z.string().max(5_000).optional(), skills: z.array(z.string().min(1).max(80)).max(50), evidence: z.array(achievementEvidenceSchema).max(100), createdAt: z.string().min(1).max(40), updatedAt: z.string().min(1).max(40),
});
const examDailyTaskSchema = z.object({
  id: z.string().min(1).max(160), date: z.string().min(1).max(40), title: z.string().min(1).max(300), detail: z.string().max(10_000).optional(),
  phase: z.string().max(300).optional(), resourceLabel: z.string().max(300).optional(), plannedMinutes: z.number().int().min(0).max(100_000).optional(), sourceUrl: z.string().url().max(2_000).optional(), status: examTaskStatus,
});
const examDailyLogSchema = z.object({
  id: z.string().min(1).max(160), date: z.string().min(1).max(40), completedTaskIds: z.array(z.string().max(160)).max(1_000),
  minutes: z.number().int().min(0).max(100_000).optional(), note: z.string().max(5_000).optional(),
});
const examResourceSchema = z.object({
  id: z.string().min(1).max(160), title: z.string().min(1).max(300), kind: examResourceKind, url: z.string().url().max(2_000).optional(),
  note: z.string().max(10_000).optional(), sourceRef: z.string().max(2_000).optional(), createdAt: z.string().min(1).max(40),
});
const examWorkspaceSchema = z.object({
  id: z.string().min(1).max(160), code: examWorkspaceCode, name: z.string().min(1).max(300), description: z.string().max(20_000),
  source: z.object({ provider: z.literal("notion"), url: z.string().url().max(2_000), label: z.string().max(300), importedAt: z.string().max(40) }),
  examDate: z.string().max(40), examTime: z.string().max(80).optional(), examDayChecklist: z.array(z.string().min(1).max(1_000)).max(100),
  dailyTasks: z.array(examDailyTaskSchema).max(2_000), dailyLogs: z.array(examDailyLogSchema).max(2_000), resources: z.array(examResourceSchema).max(1_000), notes: z.string().max(20_000).optional(),
});

export const academicSyncPayloadSchema = z.object({
  courses: z.array(z.object({
    id: z.string().min(1).max(200), term: z.string().min(1).max(80), name: z.string().min(1).max(240),
    credits: z.number().finite().min(0).max(30), grade: letterGrade, numericScore: z.number().finite().min(0).max(100).optional(),
    note: z.string().max(2_000).optional(), category: courseCategory, recognition: recognition.optional(),
  })).max(500),
  projects: z.array(z.object({
    id: z.string().min(1).max(200), name: z.string().min(1).max(240), description: z.string().max(10_000), tags: z.array(z.string().max(80)).max(30),
    startDate: z.string().max(30), endDate: z.string().max(30), status: z.enum(["planning", "active", "done"]),
  })).max(200),
  goals: z.object({ total: z.number().finite().min(0).max(300), required: z.number().finite().min(0).max(200), elective: z.number().finite().min(0).max(200), general: z.number().finite().min(0).max(200), semestersLeft: z.number().int().min(0).max(20) }),
  system: z.literal("4.3"),
  careerPath: z.enum(["frontend", "data", "product", "research"]),
  preferences: z.object({ workload: z.enum(["light", "balanced", "ambitious"]), category: z.enum(["any", "required", "elective", "general", "common", "undeclared-required"]), projectStyle: z.enum(["individual", "team", "research"]) }),
  plannedCourses: z.array(z.object({ id: z.string().min(1).max(200), term: z.string().max(80), name: z.string().max(240), credits: z.number().finite().min(0).max(30), category: courseCategory, priority: z.enum(["must", "important", "explore"]) })).max(500),
  termRanks: z.record(z.string().max(80), z.object({ rank: z.number().int().min(1).max(100_000), cohortSize: z.number().int().min(1).max(100_000) })).default({}),
  hasCompletedPlanIntro: z.boolean(),
  workspaces: z.array(workspaceProjectSchema).max(50).default([]),
  achievementRecords: z.array(achievementRecordSchema).max(500).default([]),
  examWorkspaces: z.array(examWorkspaceSchema).max(20).default([]),
});

function parsePayload(payload: string) {
  return academicSyncPayloadSchema.parse(JSON.parse(payload));
}

export const academicSyncRouter = router({
  get: adminProcedure.query(async ({ ctx }) => {
    const state = await getPrivateAcademicSyncState(ctx.user.id);
    if (!state) return { status: "empty" as const };
    return { status: "ready" as const, revision: state.revision, updatedAt: state.updatedAt, payload: parsePayload(state.payload) };
  }),

  save: adminProcedure.input(z.object({ baseRevision: z.number().int().min(0), payload: academicSyncPayloadSchema })).mutation(async ({ ctx, input }) => {
    const encodedPayload = JSON.stringify(input.payload);
    const existing = await getPrivateAcademicSyncState(ctx.user.id);
    if (!existing) {
      if (input.baseRevision !== 0) return { status: "conflict" as const, latest: null };
      const created = await createPrivateAcademicSyncState(ctx.user.id, encodedPayload);
      if (created) return { status: "saved" as const, revision: created.revision, updatedAt: created.updatedAt };
    }

    const latest = existing ?? await getPrivateAcademicSyncState(ctx.user.id);
    if (!latest) return { status: "conflict" as const, latest: null };
    if (input.baseRevision !== latest.revision) return { status: "conflict" as const, latest: { revision: latest.revision, updatedAt: latest.updatedAt, payload: parsePayload(latest.payload) } };
    const updated = await updatePrivateAcademicSyncState(ctx.user.id, input.baseRevision, encodedPayload);
    if (updated) return { status: "saved" as const, revision: updated.revision, updatedAt: updated.updatedAt };
    const concurrent = await getPrivateAcademicSyncState(ctx.user.id);
    return { status: "conflict" as const, latest: concurrent ? { revision: concurrent.revision, updatedAt: concurrent.updatedAt, payload: parsePayload(concurrent.payload) } : null };
  }),
});
