import { describe, expect, it } from "vitest";
import { buildCareerRecommendations, ccee114GraduationGoals, type CourseRecord } from "../shared/academic";
import { ccee114CourseMap, getCcee114PrerequisiteAlerts, getCcee114RequirementProgress } from "../shared/ccee114";

describe("CCEE 114 課程地圖", () => {
  it("收錄官方系必修、核心、專業實習與三大專業選修領域，且規劃資料不含開課狀態", () => {
    expect(ccee114CourseMap.length).toBeGreaterThan(80);
    expect(ccee114CourseMap.filter(course => course.group === "系必修")).toHaveLength(21);
    expect(ccee114CourseMap.find(course => course.name === "資料結構")).toMatchObject({ group: "大二核心", requirement: "year2-core", credits: 3 });
    expect(ccee114CourseMap.find(course => course.name === "演算法")).toMatchObject({ group: "大三核心", requirement: "year3-core", credits: 3 });
    expect(ccee114CourseMap.find(course => course.name === "大型語言模型實務")).toMatchObject({ group: "電腦與資訊", credits: 3 });
    expect(ccee114CourseMap.find(course => course.name === "5G行動通訊網路")).toMatchObject({ group: "通訊與電子", credits: 3 });
    expect(ccee114CourseMap.find(course => course.name === "網路與資安攻防實習")).toMatchObject({ group: "網路與多媒體", credits: 2 });
    expect(ccee114CourseMap.every(course => !("isOffered" in course))).toBe(true);
  });

  it("以已完成與規劃課程共同檢查大二／大三核心與專業實習最低門數、學分", () => {
    const completed: CourseRecord[] = [
      { id: "ds", term: "115-1", name: "資料結構", credits: 3, grade: "A", category: "elective" },
      { id: "la", term: "115-1", name: "線性代數", credits: 3, grade: "A", category: "elective" },
      { id: "lab", term: "115-1", name: "基礎電工實習(二)", credits: 1, grade: "A", category: "elective" },
    ];
    const planned = [
      { name: "離散數學", credits: 3 },
      { name: "科學計算軟體實習", credits: 1 },
      { name: "通訊實習", credits: 1 },
      { name: "微處理器實習", credits: 1 },
      { name: "天線設計實習", credits: 1 },
    ];
    const progress = getCcee114RequirementProgress(completed, planned);
    expect(progress.find(item => item.id === "year2-core")).toMatchObject({ completedCourses: 2, plannedCourses: 1, remainingCourses: 0, remainingCredits: 0 });
    expect(progress.find(item => item.id === "year12-lab")).toMatchObject({ completedCourses: 1, plannedCourses: 1, remainingCourses: 0, remainingCredits: 0 });
    expect(progress.find(item => item.id === "year3-lab")).toMatchObject({ plannedCourses: 3, plannedCredits: 3, remainingCourses: 0, remainingCredits: 0 });
    expect(progress.find(item => item.id === "year3-core")).toMatchObject({ remainingCourses: 3, remainingCredits: 9 });
  });

  it("官方擋修只提出提醒，不會阻止課程加入規劃，並正確檢查數字成績門檻", () => {
    const planned = [{ name: "電腦網路", credits: 3 }, { name: "微波元件實習", credits: 1 }];
    const insufficient: CourseRecord[] = [
      { id: "multi", term: "114-2", name: "多媒體與網路導論", credits: 3, grade: "A", numericScore: 59, category: "required" },
      { id: "em", term: "116-1", name: "電磁學", credits: 3, grade: "D", numericScore: 39, category: "elective" },
    ];
    expect(getCcee114PrerequisiteAlerts(insufficient, planned).map(item => item.courseName)).toEqual(["電腦網路", "微波元件實習"]);
    const satisfied = insufficient.map(course => course.name === "多媒體與網路導論" ? { ...course, numericScore: 60 } : { ...course, numericScore: 40 });
    expect(getCcee114PrerequisiteAlerts(satisfied, planned)).toEqual([]);
  });

  it("在電通系 114 學分結構下，職涯推薦採官方課程並說明核心與實習優先邏輯", () => {
    const recommendation = buildCareerRecommendations([], [], ccee114GraduationGoals, "4.3", "data", { workload: "balanced", category: "elective", projectStyle: "individual" });
    expect(recommendation.planningContext).toContain("電通系 114 官方課程地圖");
    expect(recommendation.recommendedCourses.every(course => ccee114CourseMap.some(entry => entry.name === course.name))).toBe(true);
    expect(recommendation.recommendedCourses.some(course => ["巨量資料分析應用與實作", "隨機變數與統計", "線性代數"].includes(course.name))).toBe(true);
  });
});
