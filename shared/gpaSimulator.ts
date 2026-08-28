import {
  calculateGpa,
  getGradePoint,
  gradeOptions,
  type CourseRecord,
  type GradePointSystem,
  type LetterGrade,
} from "./academic";

/**
 * GPA 目標模擬器。
 *
 * 兩個問題：
 *   1. 反推：「我要達到累計 GPA 3.5，下學期 18 學分要平均拿到什麼等第？」
 *   2. 試算：「如果把這門 B 拉到 A，總 GPA 會變多少？」
 *
 * 所有計算都必須與 academic.ts 的 calculateGpa 一致：
 * 加權平均、F 記 0 分但仍計入嘗試學分、結果取兩位小數。
 * 這裡刻意重用 getGradePoint 與同一套四捨五入，避免兩處規則分歧。
 */

/** 與 calculateGpa 相同的取位方式。 */
function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * 課程是否計入 GPA。
 *
 * 與 academic.ts 的 isCountableCourse 判斷一致，但那個函式沒有匯出，
 * 因此這裡以 calculateGpa 的實際行為為準：用單筆課程試算，
 * 有算出學分權重就代表它會被計入。
 */
function countableCredits(courses: CourseRecord[], system: GradePointSystem): number {
  return courses.reduce((sum, course) => {
    const single = calculateGpa([course], system);
    // calculateGpa 對不可計入的課回傳 0 且沒有學分基礎；
    // 用「單筆 GPA 等於該課等第分數」來判定它有沒有被採計。
    const expected = getGradePoint(course.grade, system);
    const counted = single === round2(expected) && course.credits > 0;
    return counted ? sum + course.credits : sum;
  }, 0);
}

export type GpaSnapshot = {
  /** 計入 GPA 的總學分。 */
  credits: number;
  /** 加權總積分（GPA × 學分）。 */
  points: number;
  gpa: number;
};

export function summarizeGpa(courses: CourseRecord[], system: GradePointSystem): GpaSnapshot {
  const gpa = calculateGpa(courses, system);
  const credits = countableCredits(courses, system);
  return { credits, points: round2(gpa * credits), gpa };
}

/** 該學制下的最高與最低單科積分。 */
export function pointRange(system: GradePointSystem): { min: number; max: number } {
  const points = gradeOptions.map(grade => getGradePoint(grade, system));
  return { min: Math.min(...points), max: Math.max(...points) };
}

export type TargetOutcome = "already-met" | "reachable" | "impossible" | "no-credits";

export type TargetResult = {
  outcome: TargetOutcome;
  /** 未來學分需要達到的平均積分；outcome 為 reachable 時才有意義。 */
  requiredAveragePoint: number;
  /** 最接近且足以達標的單一等第；沒有任何等第夠時為 null。 */
  suggestedGrade: LetterGrade | null;
  /** 未來學分全部拿最高等第時的累計 GPA。 */
  bestPossibleGpa: number;
  /** 未來學分全部拿最低等第時的累計 GPA。 */
  worstPossibleGpa: number;
  projectedCredits: number;
};

/**
 * 反推達成目標累計 GPA 所需的未來平均積分。
 *
 * 公式：(現有積分 + 未來學分 × x) / (現有學分 + 未來學分) = 目標
 *   → x = (目標 × 總學分 - 現有積分) / 未來學分
 */
export function solveTargetGpa(
  current: GpaSnapshot,
  plannedCredits: number,
  targetGpa: number,
  system: GradePointSystem
): TargetResult {
  const { min, max } = pointRange(system);
  const projectedCredits = current.credits + plannedCredits;

  const bestPossibleGpa = projectedCredits > 0 ? round2((current.points + plannedCredits * max) / projectedCredits) : 0;
  const worstPossibleGpa = projectedCredits > 0 ? round2((current.points + plannedCredits * min) / projectedCredits) : 0;

  const base = {
    requiredAveragePoint: 0,
    suggestedGrade: null as LetterGrade | null,
    bestPossibleGpa,
    worstPossibleGpa,
    projectedCredits,
  };

  if (plannedCredits <= 0) {
    // 沒有未來學分時，累計 GPA 不會變，只能判斷現況是否已達標。
    return { ...base, outcome: current.gpa >= targetGpa ? "already-met" : "no-credits" };
  }

  const required = (targetGpa * projectedCredits - current.points) / plannedCredits;

  // 需求低於最低等第，代表就算全部拿最低分也達標。
  if (required <= min) {
    return { ...base, outcome: "already-met", requiredAveragePoint: round2(Math.max(required, min)) };
  }

  if (required > max) {
    return { ...base, outcome: "impossible", requiredAveragePoint: round2(required) };
  }

  // 找出最低的、積分仍足以達標的等第。
  const suggestedGrade =
    [...gradeOptions]
      .sort((a, b) => getGradePoint(a, system) - getGradePoint(b, system))
      .find(grade => getGradePoint(grade, system) >= required) ?? null;

  return { ...base, outcome: "reachable", requiredAveragePoint: round2(required), suggestedGrade };
}

/**
 * 反推「還需要多少學分拿到指定等第」才能達標。
 * 用於「我還要修幾學分的 A 才能把 GPA 拉到 3.5」這種問題。
 */
export function creditsNeededAtGrade(
  current: GpaSnapshot,
  grade: LetterGrade,
  targetGpa: number,
  system: GradePointSystem
): number | null {
  const point = getGradePoint(grade, system);
  if (current.gpa >= targetGpa) return 0;
  // (現有積分 + c × point) / (現有學分 + c) = 目標
  //   → c = (目標 × 現有學分 - 現有積分) / (point - 目標)
  if (point <= targetGpa) return null; // 該等第低於或等於目標，永遠拉不上去
  const credits = (targetGpa * current.credits - current.points) / (point - targetGpa);
  return credits > 0 ? Math.ceil(credits) : 0;
}

export type GradeOverride = { courseId: string; grade: LetterGrade };

/**
 * 試算：把指定課程改成別的等第後的 GPA。
 * 不會修改傳入的資料。
 */
export function simulateGradeChanges(
  courses: CourseRecord[],
  overrides: GradeOverride[],
  system: GradePointSystem
): { gpa: number; delta: number } {
  const map = new Map(overrides.map(item => [item.courseId, item.grade]));
  const adjusted = courses.map(course => {
    const grade = map.get(course.id);
    return grade ? { ...course, grade } : course;
  });
  const before = calculateGpa(courses, system);
  const after = calculateGpa(adjusted, system);
  return { gpa: after, delta: round2(after - before) };
}
