import { describe, expect, it } from "vitest";
import { calculateGpa, type CourseRecord, type LetterGrade } from "../shared/academic";
import {
  creditsNeededAtGrade,
  pointRange,
  simulateGradeChanges,
  solveTargetGpa,
  summarizeGpa,
} from "../shared/gpaSimulator";

const course = (id: string, grade: LetterGrade, credits = 3): CourseRecord => ({
  id,
  term: "114-1",
  name: `課程 ${id}`,
  credits,
  grade,
  category: "required",
});

describe("snapshot", () => {
  it("matches calculateGpa and counts credits", () => {
    const courses = [course("a", "A"), course("b", "B")];
    const snapshot = summarizeGpa(courses, "4.3");
    expect(snapshot.gpa).toBe(calculateGpa(courses, "4.3"));
    expect(snapshot.credits).toBe(6);
    expect(snapshot.points).toBeCloseTo(4 * 3 + 3 * 3, 1);
  });

  it("counts a failed course's credits but scores it zero", () => {
    const snapshot = summarizeGpa([course("a", "A"), course("f", "F")], "4.3");
    expect(snapshot.credits).toBe(6);
    expect(snapshot.gpa).toBe(2);
  });

  it("handles an empty transcript", () => {
    expect(summarizeGpa([], "4.3")).toEqual({ credits: 0, points: 0, gpa: 0 });
  });

  it("ignores courses with invalid credits", () => {
    const snapshot = summarizeGpa([course("a", "A"), { ...course("bad", "A"), credits: 0 }], "4.3");
    expect(snapshot.credits).toBe(3);
  });
});

describe("point range", () => {
  it("reflects each grading system's ceiling", () => {
    expect(pointRange("4.3")).toEqual({ min: 0, max: 4.3 });
    expect(pointRange("4.0")).toEqual({ min: 0, max: 4 });
  });
});

describe("solving a target GPA", () => {
  const current = summarizeGpa([course("a", "B"), course("b", "B")], "4.3"); // GPA 3.0, 6 學分

  it("computes the average point future credits must reach", () => {
    // 目標 3.5，現有 6 學分 ×3.0 = 18 積分，未來 6 學分
    // (3.5 × 12 - 18) / 6 = 4.0
    const result = solveTargetGpa(current, 6, 3.5, "4.3");
    expect(result.outcome).toBe("reachable");
    expect(result.requiredAveragePoint).toBeCloseTo(4, 2);
    expect(result.suggestedGrade).toBe("A");
  });

  it("suggests the lowest grade that still clears the bar", () => {
    const result = solveTargetGpa(current, 6, 3.15, "4.3");
    // 需求 3.3 → B+ 剛好 3.3
    expect(result.suggestedGrade).toBe("B+");
  });

  it("reports a target that cannot be reached even with straight A+", () => {
    const result = solveTargetGpa(current, 3, 4.2, "4.3");
    expect(result.outcome).toBe("impossible");
    expect(result.bestPossibleGpa).toBeLessThan(4.2);
  });

  it("reports a target already met regardless of future grades", () => {
    const result = solveTargetGpa(current, 6, 1.0, "4.3");
    expect(result.outcome).toBe("already-met");
    expect(result.worstPossibleGpa).toBeGreaterThanOrEqual(0);
  });

  it("cannot change anything when no future credits are planned", () => {
    expect(solveTargetGpa(current, 0, 3.5, "4.3").outcome).toBe("no-credits");
    expect(solveTargetGpa(current, 0, 2.5, "4.3").outcome).toBe("already-met");
  });

  it("bounds the best and worst possible outcomes correctly", () => {
    const result = solveTargetGpa(current, 6, 3.5, "4.3");
    // 全 A+：(18 + 6×4.3) / 12 = 3.65
    expect(result.bestPossibleGpa).toBeCloseTo(3.65, 2);
    // 全 F：18 / 12 = 1.5
    expect(result.worstPossibleGpa).toBeCloseTo(1.5, 2);
    expect(result.projectedCredits).toBe(12);
  });

  it("works from an empty transcript", () => {
    const result = solveTargetGpa(summarizeGpa([], "4.3"), 15, 3.5, "4.3");
    expect(result.outcome).toBe("reachable");
    expect(result.requiredAveragePoint).toBeCloseTo(3.5, 2);
  });

  it("respects the lower ceiling of the 4.0 system", () => {
    const base = summarizeGpa([course("a", "B")], "4.0");
    expect(solveTargetGpa(base, 3, 4.2, "4.0").outcome).toBe("impossible");
  });

  it("produces a solution that actually hits the target when applied", () => {
    const result = solveTargetGpa(current, 6, 3.5, "4.3");
    const achieved = (current.points + 6 * result.requiredAveragePoint) / (current.credits + 6);
    expect(achieved).toBeCloseTo(3.5, 2);
  });
});

describe("credits needed at a given grade", () => {
  const current = summarizeGpa([course("a", "C"), course("b", "C")], "4.3"); // GPA 2.0, 6 學分

  it("computes how many credits of A are required", () => {
    // (2×6... ) → (3.0×6 - 12) / (4 - 3.0) = 6
    expect(creditsNeededAtGrade(current, "A", 3.0, "4.3")).toBe(6);
  });

  it("returns zero when the target is already met", () => {
    expect(creditsNeededAtGrade(current, "A", 1.5, "4.3")).toBe(0);
  });

  it("returns null when the grade can never lift the average to the target", () => {
    expect(creditsNeededAtGrade(current, "B", 3.0, "4.3")).toBeNull();
    expect(creditsNeededAtGrade(current, "C", 3.0, "4.3")).toBeNull();
  });

  it("rounds up to a whole credit", () => {
    const needed = creditsNeededAtGrade(current, "A", 2.5, "4.3");
    expect(Number.isInteger(needed)).toBe(true);
  });
});

describe("what-if grade changes", () => {
  const courses = [course("a", "B"), course("b", "B")];

  it("reports the new GPA and the delta", () => {
    const result = simulateGradeChanges(courses, [{ courseId: "a", grade: "A" }], "4.3");
    expect(result.gpa).toBe(3.5);
    expect(result.delta).toBeCloseTo(0.5, 2);
  });

  it("handles a downgrade", () => {
    const result = simulateGradeChanges(courses, [{ courseId: "a", grade: "F" }], "4.3");
    expect(result.delta).toBeLessThan(0);
  });

  it("does not mutate the original courses", () => {
    simulateGradeChanges(courses, [{ courseId: "a", grade: "A+" }], "4.3");
    expect(courses[0].grade).toBe("B");
  });

  it("ignores overrides for unknown course ids", () => {
    const result = simulateGradeChanges(courses, [{ courseId: "nope", grade: "A+" }], "4.3");
    expect(result.delta).toBe(0);
  });
});
