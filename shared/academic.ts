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
