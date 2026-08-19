import { z } from "zod";
import { createPrivateAcademicSyncState, getPrivateAcademicSyncState, updatePrivateAcademicSyncState } from "../db";
import { adminProcedure, router } from "../_core/trpc";

const courseCategory = z.enum(["required", "elective", "general", "common", "undeclared-required"]);
const letterGrade = z.enum(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]);
const recognition = z.enum(["standard", "approved-external", "pending", "gpa-only"]);

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
