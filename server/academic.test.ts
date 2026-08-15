import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  buildCareerRecommendations,
  calculateCredits,
  calculateGpa,
  getAchievements,
  getTermGpas,
  type CourseRecord,
  type ProjectRecord,
} from "../shared/academic";

const courses: CourseRecord[] = [
  { id: "1", term: "114-1", name: "演算法", credits: 3, grade: "A+", category: "required" },
  { id: "2", term: "114-1", name: "設計思考", credits: 2, grade: "B+", category: "general" },
  { id: "3", term: "114-2", name: "互動程式", credits: 3, grade: "A", category: "elective" },
];

const projects: ProjectRecord[] = [
  { id: "p1", name: "校園探索", description: "", tags: [], startDate: "2026-01", endDate: "2026-04", status: "done" },
];

describe("academic calculations", () => {
  it("依學分權重正確計算 4.0 與 4.3 GPA", () => {
    expect(calculateGpa(courses, "4.0")).toBe(3.83);
    expect(calculateGpa(courses, "4.3")).toBe(3.94);
  });

  it("會按課程類別累積已修學分", () => {
    expect(calculateCredits(courses)).toEqual({ total: 8, required: 3, elective: 3, general: 2 });
  });

  it("在條件達成時解鎖專題與學術成就，並產生可執行建議", () => {
    const achievements = getAchievements(courses, projects, "4.0");
    expect(achievements.find(item => item.id === "project-spark")?.unlocked).toBe(true);
    const plan = buildRecommendations(courses, { total: 128, required: 60, elective: 42, general: 26, semestersLeft: 4 }, "4.0");
    expect(plan.suggestedCredits).toBe(30);
    expect(plan.suggestions.length).toBeGreaterThan(1);
  });

  it("在沒有課程時回傳零 GPA，並能按學期分組 GPA 趨勢", () => {
    expect(calculateGpa([], "4.0")).toBe(0);
    expect(getTermGpas(courses, "4.0")).toEqual([
      { term: "114-1", gpa: 3.72 },
      { term: "114-2", gpa: 4 },
    ]);
  });

  it("只在門檻滿足時解鎖高階成就", () => {
    const starter = getAchievements([], [], "4.0");
    expect(starter.every(item => !item.unlocked)).toBe(true);

    const fortyCredits = Array.from({ length: 10 }, (_, index): CourseRecord => ({
      id: `g${index}`,
      term: "115-1",
      name: `課程 ${index}`,
      credits: 3,
      grade: "A" as const,
      category: "required",
    }));
    const threeProjects: ProjectRecord[] = Array.from({ length: 3 }, (_, index) => ({
      id: `project-${index}`,
      name: `專題 ${index}`,
      description: "",
      tags: [],
      startDate: "2026-01",
      endDate: "2026-06",
      status: "done" as const,
    }));
    const achievements = getAchievements(fortyCredits, threeProjects, "4.3");
    expect(achievements.find(item => item.id === "gpa-elite")?.unlocked).toBe(true);
    expect(achievements.find(item => item.id === "credit-voyager")?.unlocked).toBe(true);
    expect(achievements.find(item => item.id === "project-legend")?.unlocked).toBe(true);
  });

  it("會依職涯目標、已修課與先修條件排列可修與待解鎖課程", () => {
    const frontendCourses: CourseRecord[] = [
      ...courses,
      { id: "programming", term: "113-1", name: "程式設計", credits: 3, grade: "A", category: "required" },
    ];
    const plan = buildCareerRecommendations(frontendCourses, projects, { total: 128, required: 60, elective: 42, general: 26, semestersLeft: 4 }, "4.0", "frontend", { workload: "light", category: "elective", projectStyle: "team" });
    expect(plan.profile.title).toBe("前端工程師");
    expect(plan.recommendedCourses[0]?.name).toBe("Web 前端實作");
    expect(plan.lockedCourses.find(course => course.name === "雲端部署與維運")?.missingPrerequisites).toEqual(["Web 前端實作"]);
    expect(plan.skillGaps).toContain("React");
    expect(plan.projectSuggestion.title).toContain("互動校園服務");
    expect(plan.suggestedCredits).toBe(14);
    expect(plan.recommendedCourses).toHaveLength(2);
    expect(plan.projectSuggestion.description).toContain("2–4 人協作");
  });
});
