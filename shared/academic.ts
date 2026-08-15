export type GradePointSystem = "4.0" | "4.3";
export type CourseCategory = "required" | "elective" | "general";
export type LetterGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "F";

export type CourseRecord = {
  id: string;
  term: string;
  name: string;
  credits: number;
  grade: LetterGrade;
  category: CourseCategory;
};

export type ProjectStatus = "planning" | "active" | "done";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  startDate: string;
  endDate: string;
  status: ProjectStatus;
};

export type GraduationGoals = {
  total: number;
  required: number;
  elective: number;
  general: number;
  semestersLeft: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export type CareerPath = "frontend" | "data" | "product" | "research";

export type RecommendationPreferences = {
  workload: "light" | "balanced" | "ambitious";
  category: "any" | CourseCategory;
  projectStyle: "individual" | "team" | "research";
};

export const defaultRecommendationPreferences: RecommendationPreferences = {
  workload: "balanced",
  category: "any",
  projectStyle: "individual",
};

export type CareerProfile = {
  id: CareerPath;
  title: string;
  shortTitle: string;
  description: string;
  targetSkills: string[];
  projectTitle: string;
  projectBrief: string;
};

export type CourseCatalogEntry = {
  id: string;
  name: string;
  credits: number;
  category: CourseCategory;
  prerequisites: string[];
  skills: string[];
  careerFit: Record<CareerPath, number>;
  description: string;
};

export const careerProfiles: CareerProfile[] = [
  { id: "frontend", title: "前端工程師", shortTitle: "前端", description: "打造互動介面、完整產品體驗與可展示的網頁作品。", targetSkills: ["React", "TypeScript", "UI/UX", "Git", "部署"], projectTitle: "互動校園服務儀表板", projectBrief: "以真實校園痛點設計可操作的前端服務，完成響應式介面、資料狀態與部署說明。" },
  { id: "data", title: "資料分析師", shortTitle: "資料", description: "以資料處理、視覺化與洞察溝通支援決策。", targetSkills: ["統計", "SQL", "Python", "資料視覺化", "資料敘事"], projectTitle: "校園行為資料洞察報告", projectBrief: "從資料蒐集、清理到儀表板呈現，提出一個可驗證的校園改善建議。" },
  { id: "product", title: "產品經理", shortTitle: "產品", description: "以使用者研究、產品策略與跨域協作推進解決方案。", targetSkills: ["使用者研究", "產品策略", "原型", "數據判讀", "溝通表達"], projectTitle: "校園服務產品提案", projectBrief: "完成使用者訪談、問題定義、原型與指標設計，建立可討論的產品決策脈絡。" },
  { id: "research", title: "研究與深造", shortTitle: "研究", description: "建立研究設計、量化分析與學術論證能力。", targetSkills: ["研究方法", "統計", "文獻探討", "Python", "學術寫作"], projectTitle: "小型研究計畫與海報", projectBrief: "選定一個可操作的問題，完成文獻摘要、研究設計、初步分析與研究海報。" },
];

export const courseCatalog: CourseCatalogEntry[] = [
  { id: "programming", name: "程式設計", credits: 3, category: "required", prerequisites: [], skills: ["JavaScript", "程式邏輯", "Git"], careerFit: { frontend: 80, data: 65, product: 35, research: 45 }, description: "所有數位職涯的程式基礎。" },
  { id: "data-structures", name: "資料結構", credits: 3, category: "required", prerequisites: ["程式設計"], skills: ["演算法", "程式邏輯"], careerFit: { frontend: 75, data: 70, product: 20, research: 55 }, description: "建立資料處理與問題拆解能力。" },
  { id: "interaction-design", name: "互動設計", credits: 3, category: "elective", prerequisites: [], skills: ["UI/UX", "原型"], careerFit: { frontend: 75, data: 20, product: 90, research: 20 }, description: "將需求轉換成可測試的互動流程。" },
  { id: "digital-storytelling", name: "數位敘事", credits: 2, category: "general", prerequisites: [], skills: ["資料敘事", "內容策略"], careerFit: { frontend: 35, data: 65, product: 70, research: 45 }, description: "將複雜資訊轉化為容易理解的故事。" },
  { id: "english-presentation", name: "英文簡報", credits: 2, category: "general", prerequisites: [], skills: ["溝通表達", "學術寫作"], careerFit: { frontend: 30, data: 35, product: 80, research: 70 }, description: "加強專業成果的溝通與發表。" },
  { id: "web-development", name: "Web 前端實作", credits: 3, category: "elective", prerequisites: ["程式設計"], skills: ["React", "TypeScript", "Git"], careerFit: { frontend: 98, data: 25, product: 45, research: 15 }, description: "以元件化方法完成互動網站與前端作品。" },
  { id: "cloud-deployment", name: "雲端部署與維運", credits: 3, category: "elective", prerequisites: ["Web 前端實作"], skills: ["部署", "Git"], careerFit: { frontend: 88, data: 45, product: 30, research: 20 }, description: "將作品部署為可分享的實際服務。" },
  { id: "database", name: "資料庫系統", credits: 3, category: "elective", prerequisites: ["資料結構"], skills: ["SQL", "資料處理"], careerFit: { frontend: 65, data: 95, product: 55, research: 50 }, description: "建立資料建模、查詢與品質觀念。" },
  { id: "statistics", name: "統計學", credits: 3, category: "required", prerequisites: [], skills: ["統計", "數據判讀"], careerFit: { frontend: 20, data: 88, product: 68, research: 95 }, description: "用機率與推論驗證假設、判讀資料。" },
  { id: "machine-learning", name: "機器學習導論", credits: 3, category: "elective", prerequisites: ["統計學", "資料結構"], skills: ["Python", "資料視覺化"], careerFit: { frontend: 20, data: 95, product: 35, research: 82 }, description: "從模型概念到評估流程，理解資料驅動方法。" },
  { id: "user-research", name: "使用者研究", credits: 3, category: "elective", prerequisites: ["互動設計"], skills: ["使用者研究", "產品策略"], careerFit: { frontend: 55, data: 30, product: 98, research: 60 }, description: "用訪談、測試與洞察支持產品決策。" },
  { id: "research-methods", name: "研究方法", credits: 3, category: "elective", prerequisites: ["統計學"], skills: ["研究方法", "文獻探討", "學術寫作"], careerFit: { frontend: 15, data: 50, product: 45, research: 98 }, description: "從問題、方法到證據，建立完整研究設計。" },
];

export type TranscriptIssue = { row: number; message: string; raw: string };
export type TranscriptImportPreview = {
  accepted: Omit<CourseRecord, "id">[];
  toImport: Omit<CourseRecord, "id">[];
  duplicates: Omit<CourseRecord, "id">[];
  issues: TranscriptIssue[];
};
export type AcademicSkill = { name: string; courseCount: number; points: number; tier: "developing" | "proficient" | "mastered" };

function parseDelimitedRow(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) { values.push(current.trim()); current = ""; }
    else current += character;
  }
  values.push(current.trim());
  return values.map(value => value.replace(/^"|"$/g, "").trim());
}

function transcriptDelimiter(line: string) { return line.includes("\t") ? "\t" : ","; }
function headerIndex(value: string) {
  const normalized = normalize(value).replace(/[\s_\-]/g, "");
  if (["學期", "term", "semester"].includes(normalized)) return "term";
  if (["課程名稱", "課名", "course", "coursename", "subject"].includes(normalized)) return "name";
  if (["學分", "credit", "credits"].includes(normalized)) return "credits";
  if (["成績", "等第", "grade", "lettergrade"].includes(normalized)) return "grade";
  if (["類別", "課程類別", "category", "type"].includes(normalized)) return "category";
  return undefined;
}
function transcriptGrade(value: string): LetterGrade | undefined {
  const normalized = value.trim().toUpperCase().replace("＋", "+").replace("－", "-");
  if ((gradeOptions as string[]).includes(normalized)) return normalized as LetterGrade;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return undefined;
  if (numeric >= 90) return "A+";
  if (numeric >= 85) return "A";
  if (numeric >= 80) return "A-";
  if (numeric >= 77) return "B+";
  if (numeric >= 73) return "B";
  if (numeric >= 70) return "B-";
  if (numeric >= 67) return "C+";
  if (numeric >= 63) return "C";
  if (numeric >= 60) return "C-";
  if (numeric >= 50) return "D";
  return "F";
}
function transcriptCategory(value: string | undefined, name: string): CourseCategory {
  const normalized = normalize(value ?? "");
  if (["必修", "required", "compulsory"].includes(normalized)) return "required";
  if (["通識", "general", "liberal"].includes(normalized)) return "general";
  if (["選修", "elective"].includes(normalized)) return "elective";
  return courseCatalog.find(course => normalize(course.name) === normalize(name))?.category ?? "elective";
}
function courseKey(course: Pick<CourseRecord, "term" | "name">) { return `${normalize(course.term)}::${normalize(course.name)}`; }

/** 解析 CSV 或 TSV 文字；支援標題列或 term,name,credits,grade,category 的固定欄位順序。 */
export function parseTranscript(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const accepted: Omit<CourseRecord, "id">[] = [];
  const issues: TranscriptIssue[] = [];
  if (!lines.length) return { accepted, issues: [{ row: 0, message: "請貼上至少一筆成績資料。", raw: "" }] };
  const delimiter = transcriptDelimiter(lines[0]);
  const firstRow = parseDelimitedRow(lines[0], delimiter);
  const mappedHeaders = firstRow.map(headerIndex);
  const hasHeader = mappedHeaders.some(Boolean);
  const columns: Record<string, number> = hasHeader
    ? Object.fromEntries(mappedHeaders.map((key, index) => key ? [key, index] : []).filter((entry): entry is [string, number] => Boolean(entry[0])))
    : { term: 0, name: 1, credits: 2, grade: 3, category: 4 };
  const start = hasHeader ? 1 : 0;
  for (let index = start; index < lines.length; index += 1) {
    const row = parseDelimitedRow(lines[index], delimiter);
    const name = row[columns.name] ?? "";
    const term = row[columns.term] ?? "未指定";
    const credits = Number(row[columns.credits]);
    const grade = transcriptGrade(row[columns.grade] ?? "");
    if (!name.trim() || !Number.isFinite(credits) || credits <= 0 || credits > 12 || !grade) {
      issues.push({ row: index + 1, raw: lines[index], message: "需要有效的課程名稱、1–12 學分與等第（A+～F 或 0–100 分）。" });
      continue;
    }
    accepted.push({ term: term.trim() || "未指定", name: name.trim(), credits, grade, category: transcriptCategory(row[columns.category], name) });
  }
  return { accepted, issues };
}

export function prepareTranscriptImport(text: string, existingCourses: CourseRecord[]): TranscriptImportPreview {
  const { accepted, issues } = parseTranscript(text);
  const known = new Set(existingCourses.map(courseKey));
  const seen = new Set<string>();
  const toImport: Omit<CourseRecord, "id">[] = [];
  const duplicates: Omit<CourseRecord, "id">[] = [];
  accepted.forEach(course => {
    const key = courseKey(course);
    if (known.has(key) || seen.has(key)) duplicates.push(course);
    else { seen.add(key); toImport.push(course); }
  });
  return { accepted, toImport, duplicates, issues };
}

const skillHints: Array<{ match: RegExp; skills: string[] }> = [
  { match: /程式|演算法|軟體|網站|web/i, skills: ["程式邏輯", "Git"] },
  { match: /資料|統計|分析|機器學習/i, skills: ["資料處理", "數據判讀"] },
  { match: /設計|互動|使用者/i, skills: ["UI/UX", "原型"] },
  { match: /英文|簡報|寫作|溝通/i, skills: ["溝通表達"] },
];

export function getAcademicSkills(courses: CourseRecord[]): AcademicSkill[] {
  const counts = new Map<string, { courseCount: number; points: number }>();
  courses.forEach(course => {
    const gradePoint = getGradePoint(course.grade, "4.0");
    if (gradePoint < 2) return;
    const catalogSkills = courseCatalog.find(item => normalize(item.name) === normalize(course.name))?.skills ?? skillHints.filter(hint => hint.match.test(course.name)).flatMap(hint => hint.skills);
    const gradeWeight = gradePoint >= 3.7 ? 2 : 1;
    new Set(catalogSkills).forEach(skill => {
      const current = counts.get(skill) ?? { courseCount: 0, points: 0 };
      counts.set(skill, { courseCount: current.courseCount + 1, points: current.points + gradeWeight });
    });
  });
  return Array.from(counts.entries()).map(([name, value]): AcademicSkill => {
    const tier: AcademicSkill["tier"] = value.points >= 4 ? "mastered" : value.points >= 2 ? "proficient" : "developing";
    return { name, ...value, tier };
  }).sort((a, b) => b.points - a.points || b.courseCount - a.courseCount || a.name.localeCompare(b.name, "zh-Hant"));
}

const gradePoints: Record<GradePointSystem, Record<LetterGrade, number>> = {
  "4.0": {
    "A+": 4,
    A: 4,
    "A-": 3.7,
    "B+": 3.3,
    B: 3,
    "B-": 2.7,
    "C+": 2.3,
    C: 2,
    "C-": 1.7,
    "D+": 1.3,
    D: 1,
    F: 0,
  },
  "4.3": {
    "A+": 4.3,
    A: 4,
    "A-": 3.7,
    "B+": 3.3,
    B: 3,
    "B-": 2.7,
    "C+": 2.3,
    C: 2,
    "C-": 1.7,
    "D+": 1.3,
    D: 1,
    F: 0,
  },
};

export const gradeOptions = Object.keys(gradePoints["4.0"]) as LetterGrade[];

export function getGradePoint(grade: LetterGrade, system: GradePointSystem) {
  return gradePoints[system][grade];
}

export function calculateGpa(courses: CourseRecord[], system: GradePointSystem) {
  const attemptedCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  if (attemptedCredits === 0) return 0;
  const points = courses.reduce(
    (sum, course) => sum + getGradePoint(course.grade, system) * course.credits,
    0,
  );
  return Number((points / attemptedCredits).toFixed(2));
}

export function getTermGpas(courses: CourseRecord[], system: GradePointSystem) {
  const grouped = new Map<string, CourseRecord[]>();
  courses.forEach(course => grouped.set(course.term, [...(grouped.get(course.term) ?? []), course]));
  return Array.from(grouped.entries())
    .map(([term, termCourses]) => ({ term, gpa: calculateGpa(termCourses, system) }))
    .sort((a, b) => a.term.localeCompare(b.term, "zh-Hant"));
}

export function calculateCredits(courses: CourseRecord[]) {
  return courses.reduce(
    (totals, course) => {
      totals.total += course.credits;
      totals[course.category] += course.credits;
      return totals;
    },
    { total: 0, required: 0, elective: 0, general: 0 },
  );
}

export function getAchievements(courses: CourseRecord[], projects: ProjectRecord[], system: GradePointSystem): Achievement[] {
  const gpa = calculateGpa(courses, system);
  const credits = calculateCredits(courses);
  const completedProjects = projects.filter(project => project.status === "done").length;
  return [
    { id: "first-course", title: "初入學院", description: "紀錄第一門課程", icon: "✦", unlocked: courses.length > 0 },
    { id: "gpa-elite", title: "學術菁英", description: "累計 GPA 達 3.50", icon: "♛", unlocked: gpa >= 3.5 },
    { id: "credit-voyager", title: "學分遠征者", description: "累積完成 30 學分", icon: "⚔", unlocked: credits.total >= 30 },
    { id: "project-spark", title: "創意火花", description: "完成第一個專題", icon: "✹", unlocked: completedProjects >= 1 },
    { id: "project-legend", title: "專題傳奇", description: "完成三個專題", icon: "◆", unlocked: completedProjects >= 3 },
  ];
}

export function getXp(courses: CourseRecord[], projects: ProjectRecord[]) {
  const courseXp = courses.reduce((sum, course) => sum + course.credits * 16 + getGradePoint(course.grade, "4.0") * 12, 0);
  const projectXp = projects.reduce((sum, project) => sum + (project.status === "done" ? 180 : project.status === "active" ? 60 : 20), 0);
  return Math.round(courseXp + projectXp);
}

export function getLevel(xp: number) {
  const level = Math.max(1, Math.floor(xp / 300) + 1);
  const xpIntoLevel = xp % 300;
  return { level, xpIntoLevel, xpToNext: 300, progress: Math.round((xpIntoLevel / 300) * 100) };
}

export function buildRecommendations(courses: CourseRecord[], goals: GraduationGoals, system: GradePointSystem) {
  const gpa = calculateGpa(courses, system);
  const credits = calculateCredits(courses);
  const remainingCredits = Math.max(0, goals.total - credits.total);
  const pace = goals.semestersLeft > 0 ? Math.ceil(remainingCredits / goals.semestersLeft) : remainingCredits;
  const suggestions: string[] = [];
  if (gpa < 3) suggestions.push("先安排 12–15 學分，保留固定複習時段，優先補強基礎與必修課。 ");
  else if (gpa < 3.5) suggestions.push("建議規劃 15–18 學分，以兩門核心必修搭配一門擅長選修，穩定推進 GPA。 ");
  else suggestions.push("學術狀態良好，可安排 16–18 學分並挑戰一門進階課程或跨域選修。 ");
  if (credits.required < goals.required) suggestions.push(`必修尚差 ${Math.max(0, goals.required - credits.required)} 學分；下學期優先選入至少一門必修。`);
  if (credits.general < goals.general) suggestions.push(`通識尚差 ${Math.max(0, goals.general - credits.general)} 學分；可用一門低負荷通識平衡課表。`);
  if (credits.elective < goals.elective) suggestions.push(`選修尚差 ${Math.max(0, goals.elective - credits.elective)} 學分；從職涯方向挑選可累積作品集的課程。`);
  return {
    gpa,
    remainingCredits,
    suggestedCredits: pace,
    goal: gpa >= 3.5 ? "維持 GPA 3.50 以上，完成一項可展示的專題成果。" : "下學期目標 GPA 提升 0.15，並按建議學分節奏完成課程。",
    suggestions,
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("zh-Hant");
}

export function buildCareerRecommendations(
  courses: CourseRecord[],
  projects: ProjectRecord[],
  goals: GraduationGoals,
  system: GradePointSystem,
  careerPath: CareerPath,
  preferences: RecommendationPreferences = defaultRecommendationPreferences,
) {
  const base = buildRecommendations(courses, goals, system);
  const profile = careerProfiles.find(item => item.id === careerPath) ?? careerProfiles[0];
  const completedCourseNames = new Set(courses.map(course => normalize(course.name)));
  const earnedSkills = new Set<string>();
  courses.forEach(course => {
    courseCatalog.find(item => normalize(item.name) === normalize(course.name))?.skills.forEach(skill => earnedSkills.add(normalize(skill)));
  });
  projects.forEach(project => project.tags.forEach(tag => earnedSkills.add(normalize(tag))));
  const skillGaps = profile.targetSkills.filter(skill => !earnedSkills.has(normalize(skill)));
  const careerCreditGap = calculateCredits(courses).elective < goals.elective ? 12 : 0;

  const candidates = courseCatalog
    .filter(course => !completedCourseNames.has(normalize(course.name)))
    .map(course => {
      const missingPrerequisites = course.prerequisites.filter(item => !completedCourseNames.has(normalize(item)));
      const skillBoost = course.skills.filter(skill => skillGaps.some(gap => normalize(gap) === normalize(skill))).length * 8;
      const categoryBoost = preferences.category === "any" || course.category === preferences.category ? 12 : 0;
      const score = course.careerFit[careerPath] + skillBoost + careerCreditGap + categoryBoost + (missingPrerequisites.length === 0 ? 10 : 0);
      return { ...course, score, missingPrerequisites, unlocked: missingPrerequisites.length === 0 };
    });

  const sorter = (a: (typeof candidates)[number], b: (typeof candidates)[number]) => b.score - a.score || a.name.localeCompare(b.name, "zh-Hant");
  const recommendationCount = preferences.workload === "light" ? 2 : preferences.workload === "ambitious" ? 4 : 3;
  const recommendedCourses = candidates.filter(course => course.unlocked).sort(sorter).slice(0, recommendationCount);
  const lockedCourses = candidates.filter(course => !course.unlocked).sort(sorter).slice(0, 3);
  const readiness = Math.round(((profile.targetSkills.length - skillGaps.length) / profile.targetSkills.length) * 100);
  const projectSkills = skillGaps.slice(0, 3);
  const suggestedCredits = preferences.workload === "light" ? Math.min(base.suggestedCredits, 14) : preferences.workload === "ambitious" ? Math.max(base.suggestedCredits, 18) : Math.min(base.suggestedCredits, 18);
  const projectStyleText = preferences.projectStyle === "team" ? "建議以 2–4 人協作，明確分配研究、設計與實作角色。" : preferences.projectStyle === "research" ? "建議保留研究問題、方法與驗證證據，讓成果可延伸為研究或競賽作品。" : "建議以個人可獨立完成的最小可行成果為第一階段，逐步擴充深度。";

  return {
    ...base,
    profile,
    skillGaps,
    readiness,
    suggestedCredits,
    recommendedCourses,
    lockedCourses,
    projectSuggestion: {
      title: profile.projectTitle,
      description: `${profile.projectBrief} ${projectStyleText}`,
      skills: projectSkills.length ? projectSkills : profile.targetSkills.slice(0, 3),
      rationale: skillGaps.length ? `優先累積 ${projectSkills.join("、")} 等能力，讓作品集更貼近 ${profile.title} 的職涯方向。` : `核心能力已逐漸到位；以整合型專題展示 ${profile.title} 所需的完整解題流程。`,
    },
  };
}
