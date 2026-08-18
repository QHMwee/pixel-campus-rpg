import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  buildCareerRecommendations,
  applyGraduationGoalTemplate,
  buildCcee114RequiredCoursePlanCsv,
  buildCoursePlanCalendar,
  buildCoursePlanCsv,
  buildNkustTimetableTemplate,
  buildNotionCoursePlanCsv,
  calculateCredits,
  calculatePlannedCredits,
  calculateGpa,
  createBlankAcademicStart,
  getCreditPlanStatus,
  getCalendarReadyPlanCourses,
  getAchievements,
  getAcademicSkills,
  getGradePoint,
  getLevel,
  getTermGpas,
  getXp,
  prepareTranscriptDraftImport,
  prepareTranscriptImport,
  prepareNkustTimetableDraftImport,
  prepareNkustTimetableImport,
  resolveInitialAcademicView,
  ccee114GraduationGoals,
  ccee114RequiredCoursePlan,
  defaultGraduationGoals,
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

  it("能解析成績單、略過重複課程並從匯入課程推導能力標籤", () => {
    const preview = prepareTranscriptImport("學期,課程名稱,學分,成績,類別\n114-1,演算法,3,A+,必修\n115-1,統計學,3,88,必修\n115-1,錯誤資料,0,A,選修", courses);
    expect(preview.toImport).toEqual([{ term: "115-1", name: "統計學", credits: 3, grade: "A", category: "required" }]);
    expect(preview.duplicates).toHaveLength(1);
    expect(preview.issues).toHaveLength(1);
    expect(getAcademicSkills([...courses, ...preview.toImport.map((course, index) => ({ ...course, id: `import-${index}` }))]).map(skill => skill.name)).toEqual(expect.arrayContaining(["統計", "數據判讀"]));
  });

  it("會依及格門檻與成績權重判定能力熟練度，並以匯入課程推進角色等級", () => {
    const skillCourses: CourseRecord[] = [
      { id: "pass", term: "115-1", name: "統計學", credits: 3, grade: "A", category: "required" },
      { id: "fail", term: "115-1", name: "資料庫系統", credits: 3, grade: "F", category: "elective" },
    ];
    const statistics = getAcademicSkills(skillCourses).find(skill => skill.name === "統計");
    expect(statistics).toMatchObject({ courseCount: 1, points: 2, tier: "proficient" });
    expect(getAcademicSkills(skillCourses).map(skill => skill.name)).not.toContain("SQL");
    const levelUpCourses = Array.from({ length: 4 }, (_, index): CourseRecord => ({ id: `import-${index}`, term: "115-1", name: "統計學", credits: 12, grade: "A+", category: "required" }));
    expect(getXp(levelUpCourses, [])).toBeGreaterThan(900);
    expect(getLevel(getXp(levelUpCourses, [])).level).toBeGreaterThan(1);
  });

  it("會將解析整併後的高分成績單課程轉換為能力熟練度與角色升級", () => {
    const preview = prepareTranscriptImport("學期\t課程名稱\t學分\t成績\t類別\n115-2\t資料分析實作\t12\tA+\t選修", courses);
    const importedCourses = preview.toImport.map((course, index) => ({ ...course, id: `transcript-${index}` }));
    const beforeXp = getXp(courses, projects);
    const afterXp = getXp([...courses, ...importedCourses], projects);
    expect(preview.issues).toHaveLength(0);
    expect(afterXp).toBeGreaterThan(beforeXp);
    expect(getLevel(afterXp).level).toBeGreaterThan(getLevel(beforeXp).level);
    expect(getAcademicSkills([...courses, ...importedCourses]).find(skill => skill.name === "資料處理")).toMatchObject({ tier: "proficient" });
  });

  it("能為未識別標題套用手動欄位對應並完成解析", () => {
    const text = "流水號\t科目\t分數\t點數\t學程分類\n001\t資料庫系統\t91\t3\t選修";
    const withoutMapping = prepareTranscriptImport(text, courses);
    expect(withoutMapping.needsMapping).toBe(true);
    expect(withoutMapping.headers).toEqual(["流水號", "科目", "分數", "點數", "學程分類"]);
    const mapped = prepareTranscriptImport(text, courses, { name: 1, grade: 2, credits: 3, category: 4 });
    expect(mapped.needsMapping).toBe(false);
    expect(mapped.toImport).toEqual([{ term: "未指定", name: "資料庫系統", credits: 3, grade: "A+", category: "elective" }]);
  });

  it("以所有有效嘗試學分加權 GPA，但只將及格課程計入畢業學分與 XP", () => {
    const mixedCourses: CourseRecord[] = [
      { id: "pass", term: "115-1", name: "統計學", credits: 3, grade: "A", category: "required" },
      { id: "fail", term: "115-1", name: "資料庫系統", credits: 3, grade: "F", category: "elective" },
    ];
    expect(calculateGpa(mixedCourses, "4.0")).toBe(2);
    expect(calculateCredits(mixedCourses)).toEqual({ total: 3, required: 3, elective: 0, general: 0 });
    expect(getXp(mixedCourses, [])).toBe(getXp([mixedCourses[0]!], []));
    expect(getGradePoint("A+", "4.3")).toBe(4.3);
  });

  it("轉系前與外系課程仍納入 GPA，但僅 GPA 認列狀態不增加轉入系畢業學分", () => {
    const transferred: CourseRecord[] = [
      { id: "recognized", term: "114-1", name: "已認列外系課", credits: 3, grade: "A", category: "elective", recognition: "approved-external" },
      { id: "gpa-only", term: "114-1", name: "未認列外系課", credits: 3, grade: "B", category: "elective", recognition: "gpa-only" },
    ];
    expect(calculateGpa(transferred, "4.3")).toBe(3.5);
    expect(calculateCredits(transferred)).toEqual({ total: 3, required: 0, elective: 3, general: 0 });
  });

  it("轉系課程即使認列狀態不同仍按同學期與課名略過重複，待確認認列只先計入 GPA", () => {
    const existing: CourseRecord[] = [
      { id: "existing-transfer", term: "114-1", name: "資料科學", credits: 3, grade: "A+", category: "elective", recognition: "approved-external" },
    ];
    const draft = [{ term: "114-1", name: "資料科學", credits: 3, grade: "A+" as const, category: "elective" as const, recognition: "gpa-only" as const }];
    const preview = prepareTranscriptDraftImport(draft, existing);
    expect(preview.toImport).toHaveLength(0);
    expect(preview.duplicates).toEqual(draft);
    const merged = [...existing, ...preview.toImport.map((course, index) => ({ ...course, id: `duplicate-${index}` }))];
    expect(calculateGpa(merged, "4.3")).toBe(4.3);
    expect(calculateCredits(merged)).toEqual({ total: 3, required: 0, elective: 3, general: 0 });

    const pending: CourseRecord[] = [{ id: "pending-transfer", term: "114-1", name: "待確認外系課", credits: 3, grade: "A", category: "elective", recognition: "pending" }];
    expect(calculateGpa(pending, "4.3")).toBe(4);
    expect(calculateCredits(pending)).toEqual({ total: 0, required: 0, elective: 0, general: 0 });
  });

  it("拒絕超出 0–100 的數字成績，並正確將 57 分轉為 D+", () => {
    const preview = prepareTranscriptImport("學期,課程名稱,學分,成績,類別\n115-1,及格邊界,3,57,必修\n115-1,無效分數,3,101,選修", []);
    expect(preview.toImport).toEqual([{ term: "115-1", name: "及格邊界", credits: 3, grade: "D+", category: "required" }]);
    expect(preview.issues).toHaveLength(1);
  });

  it("可在確認前重新驗證手動調整的草稿，分開呈現可匯入、重複與無效列", () => {
    const draft = [
      { term: "115-1", name: "資料庫系統", credits: 3, grade: "A" as const, category: "elective" as const },
      { term: "114-1", name: "演算法", credits: 3, grade: "A" as const, category: "required" as const },
      { term: "115-1", name: "錯誤草稿", credits: 0, grade: "A" as const, category: "elective" as const },
    ];
    const preview = prepareTranscriptDraftImport(draft, courses);
    expect(preview.toImport).toEqual([draft[0]]);
    expect(preview.duplicates).toEqual([draft[1]]);
    expect(preview.issues).toHaveLength(1);
  });

  it("不會將未及格課程視為已完成先修或已取得的職涯能力", () => {
    const failedProgramming: CourseRecord[] = [
      { id: "failed-programming", term: "115-1", name: "程式設計", credits: 3, grade: "F", category: "required" },
    ];
    const plan = buildCareerRecommendations(failedProgramming, [], { total: 128, required: 60, elective: 42, general: 26, semestersLeft: 4 }, "4.0", "frontend");
    expect(plan.recommendedCourses.map(course => course.name)).not.toContain("Web 前端實作");
    expect(plan.lockedCourses.find(course => course.name === "Web 前端實作")?.missingPrerequisites).toEqual(["程式設計"]);
    expect(plan.skillGaps).toContain("Git");
  });

  it("會將課程規劃表中的預計修課納入職涯建議與人性化摘要", () => {
    const completed: CourseRecord[] = [
      { id: "programming", term: "115-1", name: "程式設計", credits: 3, grade: "A", category: "required" },
    ];
    const plan = buildCareerRecommendations(completed, [], { total: 128, required: 60, elective: 42, general: 26, semestersLeft: 4 }, "4.3", "frontend", { workload: "balanced", category: "any", projectStyle: "individual" }, ["Web 前端實作"]);
    expect(plan.recommendedCourses.find(course => course.name === "Web 前端實作")?.score).toBeGreaterThan(100);
    expect(plan.planningContext).toContain("1 門課");
    expect(plan.goal).toContain("規劃");
  });

  it("空白起始不含示範資料、固定使用 4.3 制，並導向課程規劃頁", () => {
    expect(createBlankAcademicStart()).toEqual({ system: "4.3", courses: [], projects: [] });
    expect(resolveInitialAcademicView("", false, ["plan", "dashboard"])).toBe("plan");
    expect(resolveInitialAcademicView("", true, ["plan", "dashboard"])).toBe("dashboard");
    expect(resolveInitialAcademicView("dashboard", false, ["plan", "dashboard"])).toBe("dashboard");
  });

  it("將規劃學分與已完成學分分開計算，並回報規劃後的缺口", () => {
    const completed = calculateCredits([{ id: "done", term: "115-1", name: "已修必修", credits: 3, grade: "A", category: "required" }]);
    const planned = calculatePlannedCredits([
      { credits: 3, category: "required" },
      { credits: 2, category: "general" },
      { credits: 0, category: "elective" },
    ]);
    expect(planned).toEqual({ total: 5, required: 3, elective: 0, general: 2 });
    const status = getCreditPlanStatus(completed, planned, { total: 10, required: 6, elective: 2, general: 2, semestersLeft: 4 });
    expect(status.find(row => row.category === "total")).toMatchObject({ completedCredits: 3, plannedCredits: 5, remainingAfterPlan: 2 });
    expect(status.find(row => row.category === "required")).toMatchObject({ completedCredits: 3, plannedCredits: 3, remainingAfterPlan: 0 });
  });

  it("可安全匯出課程規劃 CSV，並略過不完整的課程列", () => {
    const csv = buildCoursePlanCsv([
      { id: "plan-1", term: "115-1", name: '統計,方法 "一"', credits: 3, category: "required", priority: "must" },
      { id: "plan-2", term: "", name: "尚未排定", credits: 3, category: "elective", priority: "explore" },
      { id: "plan-3", term: "115-2", name: "=公式保護", credits: 2, category: "general", priority: "important" },
    ]);
    expect(csv).toContain("\uFEFF\"預計學期\"");
    expect(csv).toContain('"統計,方法 ""一"""');
    expect(csv).toContain("\"'=公式保護\"");
    expect(csv).not.toContain("尚未排定");
  });

  it("會將可辨識學期轉成全天 .ics 行事曆事件，且不完整學期不會被排入行事曆", () => {
    const planned = [
      { id: "plan-1", term: "115-1", name: "統計學", credits: 3, category: "required" as const, priority: "must" as const },
      { id: "plan-2", term: "115-2", name: "資料庫系統", credits: 3, category: "elective" as const, priority: "important" as const },
      { id: "plan-3", term: "未排定", name: "探索課", credits: 2, category: "general" as const, priority: "explore" as const },
    ];
    expect(getCalendarReadyPlanCourses(planned)).toHaveLength(2);
    const calendar = buildCoursePlanCalendar(planned, new Date("2026-01-02T03:04:05Z"));
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTAMP:20260102T030405Z");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20260801");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20270201");
    expect(calendar).toContain("SUMMARY:課程規劃：統計學");
    expect(calendar).not.toContain("探索課");
    expect(calendar).toContain("END:VCALENDAR");
  });

  it("可匯出對應 Notion 四年規劃資料庫的合併 CSV 與同步鍵", () => {
    const csv = buildNotionCoursePlanCsv([
      { id: "plan-notion", term: "115-1", name: "統計學", credits: 3, category: "required", priority: "must" },
    ]);
    expect(csv).toContain('"課程名稱","學期","學分","課程類別"');
    expect(csv).toContain('"Campus Quest"');
    expect(csv).toContain('"cq:plan-notion"');
    expect(csv).toContain('"2026-08-01"');
    expect(csv).toContain('"規劃中"');
  });

  it("可解析高科大 CSV 標題別名、正規化學期並忽略非規劃欄位", () => {
    const preview = prepareNkustTimetableImport("學年學期,課號,科目名稱,學分,必選修,校區,授課教師,星期,節次,教室\n115學年度第1學期,CS101,資料結構,3,必修,第一校區,王老師,星期一,3,A201", []);
    expect(preview.toImport).toEqual([{ term: "115-1", name: "資料結構", credits: 3, category: "required", priority: "must" }]);
    expect(preview.issues).toHaveLength(0);
  });

  it("高科大課表會在確認前要求修正無效學分，並略過既有或同檔重複課程", () => {
    const existing = [{ term: "115-1", name: "資料結構" }];
    const preview = prepareNkustTimetableImport("學期,科目名稱,學分,課程類別\n115-1,資料結構,3,必修\n115-1,資料庫系統,0,選修\n115-1,資料探勘,3,選修\n115-1,資料探勘,3,選修", existing);
    expect(preview.toImport).toEqual([{ term: "115-1", name: "資料探勘", credits: 3, category: "elective", priority: "important" }]);
    expect(preview.duplicates).toHaveLength(2);
    expect(preview.issues).toHaveLength(1);
    const corrected = prepareNkustTimetableDraftImport([{ term: "115/1", name: "資料庫系統", credits: 3, category: "elective", priority: "important" }], existing);
    expect(corrected.toImport[0]).toMatchObject({ term: "115-1", name: "資料庫系統" });
  });

  it("可產生不含示範課程的高科大 CSV 空白範本", () => {
    const template = buildNkustTimetableTemplate();
    expect(template).toContain('\uFEFF"學年學期","課號","科目名稱","學分"');
    expect(template.trim().split(/\r?\n/)).toHaveLength(1);
  });

  it("可依電通系 114 官方結構建立 21 門、51 學分的系必修草稿，且不虛構選修課", () => {
    expect(ccee114GraduationGoals).toEqual({ total: 128, required: 51, elective: 49, general: 28, semestersLeft: 4 });
    expect(ccee114RequiredCoursePlan).toHaveLength(21);
    expect(ccee114RequiredCoursePlan.reduce((sum, course) => sum + course.credits, 0)).toBe(51);
    expect(ccee114RequiredCoursePlan.every(course => course.category === "required" && course.priority === "must")).toBe(true);
    const preview = prepareNkustTimetableImport(buildCcee114RequiredCoursePlanCsv(), []);
    expect(preview.toImport).toHaveLength(21);
    expect(preview.toImport.reduce((sum, course) => sum + course.credits, 0)).toBe(51);
    expect(preview.toImport.some(course => course.category === "elective")).toBe(false);
  });

  it("只在確認電通系 114 模板時才改寫學分目標", () => {
    const existing = { ...defaultGraduationGoals, semestersLeft: 3 };
    expect(applyGraduationGoalTemplate(existing, "none")).toEqual(existing);
    expect(applyGraduationGoalTemplate(existing, "ccee114")).toEqual({ ...ccee114GraduationGoals, semestersLeft: 3 });
  });
});
