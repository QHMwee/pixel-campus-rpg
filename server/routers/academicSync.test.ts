import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { academicSyncPayloadSchema, academicSyncRouter } from "./academicSync";

const payload = {
  courses: [], projects: [], goals: { total: 128, required: 51, elective: 49, general: 28, semestersLeft: 4 }, system: "4.3" as const,
  careerPath: "frontend" as const, preferences: { workload: "balanced" as const, category: "any" as const, projectStyle: "individual" as const }, plannedCourses: [], termRanks: {}, hasCompletedPlanIntro: false,
};

describe("academicSync private contract", () => {
  it("accepts a bounded Campus Quest 4.3 payload", () => {
    expect(academicSyncPayloadSchema.parse(payload)).toMatchObject({ system: "4.3", goals: { total: 128 } });
  });

  it("rejects data outside the private academic contract", () => {
    expect(() => academicSyncPayloadSchema.parse({ ...payload, system: "4.0" })).toThrow();
    expect(() => academicSyncPayloadSchema.parse({ ...payload, courses: [{ id: "c", term: "114-1", name: "課程", credits: 3, grade: "Z", category: "required" }] })).toThrow();
  });

  it("rejects unauthenticated access before any private data read", async () => {
    const caller = academicSyncRouter.createCaller({} as TrpcContext);
    await expect(caller.get()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
