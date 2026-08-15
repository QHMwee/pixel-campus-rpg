import { describe, expect, it } from "vitest";
import { buildLocalPlanningFallback } from "./aiPlanner";

const snapshot = {
  gpa: 3.4,
  gpaSystem: "4.0" as const,
  totalCredits: 36,
  remainingCredits: 92,
  semestersLeft: 4,
  termTrend: [{ term: "114-1", gpa: 3.4 }],
  skills: ["程式邏輯 · 熟練"],
  careerPath: "frontend",
  preferences: { workload: "balanced", category: "any", projectStyle: "individual" },
  courses: [],
  projects: [{ name: "校園地圖", status: "active", tags: ["React"] }],
  unlockedAchievements: 2,
};

describe("AI planning fallback", () => {
  it("creates actionable, data-bounded credit guidance", () => {
    const advice = buildLocalPlanningFallback("credits", snapshot);
    expect(advice.actions[0]?.label).toContain("23");
    expect(advice.actions).toHaveLength(2);
    expect(advice.caution).toContain("系所規定");
  });

  it("changes immediate action by planning module", () => {
    const projectsAdvice = buildLocalPlanningFallback("projects", snapshot);
    const badgesAdvice = buildLocalPlanningFallback("badges", snapshot);
    expect(projectsAdvice.actions[0]?.label).not.toBe(badgesAdvice.actions[0]?.label);
  });
});
