import { applyGraduationGoalTemplate, calculateCredits, migrateCceeCommonRequiredCourses, normalizeCceeCommonRequiredCategory, prepareTranscriptDraftImport, type CourseRecord, type GraduationGoals } from "./academic";

export type FragmentTranscriptPayload = {
  version: 1;
  courses: Omit<CourseRecord, "id">[];
};

export type FragmentImportMergeResult = {
  courses: CourseRecord[];
  imported: CourseRecord[];
  goals: GraduationGoals;
  credits: ReturnType<typeof calculateCredits>;
};

export type FragmentNumericScoreUpdate = {
  term: string;
  name: string;
  numericScore: number;
};

export type FragmentNumericScoreUpdatePayload = {
  version: 1;
  updates: FragmentNumericScoreUpdate[];
};

export type FragmentNumericScoreUpdateResult = {
  courses: CourseRecord[];
  updated: CourseRecord[];
  unmatched: FragmentNumericScoreUpdate[];
};

export function mergeFragmentTranscriptImport(
  existingCourses: CourseRecord[],
  incomingCourses: Omit<CourseRecord, "id">[],
  currentGoals: GraduationGoals,
  createId: () => string,
): FragmentImportMergeResult {
  const normalizedExistingCourses = migrateCceeCommonRequiredCourses(existingCourses);
  const normalizedIncomingCourses = incomingCourses.map(normalizeCceeCommonRequiredCategory);
  const preview = prepareTranscriptDraftImport(normalizedIncomingCourses, normalizedExistingCourses);
  const imported = preview.toImport.map(course => ({ ...course, id: createId() }));
  const courses = [...normalizedExistingCourses, ...imported];
  return {
    courses,
    imported,
    goals: applyGraduationGoalTemplate(currentGoals, "ccee114"),
    credits: calculateCredits(courses),
  };
}

function scoreUpdateKey(value: Pick<FragmentNumericScoreUpdate, "term" | "name">) {
  return `${value.term.trim()}::${value.name.trim()}`;
}

function isNumericScoreUpdate(value: unknown): value is FragmentNumericScoreUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<FragmentNumericScoreUpdate>;
  return typeof candidate.term === "string"
    && typeof candidate.name === "string"
    && candidate.term.trim().length > 0
    && candidate.name.trim().length > 0
    && typeof candidate.numericScore === "number"
    && Number.isFinite(candidate.numericScore)
    && candidate.numericScore >= 0
    && candidate.numericScore <= 100;
}

/** 僅更新既有課程的原始百分制成績；同一學期與課名未命中時不會建立新課程。 */
export function mergeFragmentNumericScoreUpdate(existingCourses: CourseRecord[], updates: FragmentNumericScoreUpdate[]): FragmentNumericScoreUpdateResult {
  const updateByKey = new Map(updates.filter(isNumericScoreUpdate).map(update => [scoreUpdateKey(update), update.numericScore]));
  const matchedKeys = new Set<string>();
  const updated: CourseRecord[] = [];
  const courses = existingCourses.map(course => {
    const key = scoreUpdateKey(course);
    const numericScore = updateByKey.get(key);
    if (numericScore === undefined) return course;
    matchedKeys.add(key);
    if (course.numericScore === numericScore) return course;
    const nextCourse = { ...course, numericScore };
    updated.push(nextCourse);
    return nextCourse;
  });
  return { courses, updated, unmatched: updates.filter(update => !matchedKeys.has(scoreUpdateKey(update))) };
}

const plainPrefix = "cq-import=";
const gzipPrefix = "cq-import-gz=";
const numericScorePlainPrefix = "cq-score-update=";
const numericScoreGzipPrefix = "cq-score-update-gz=";

export function encodeFragmentTranscriptImport(payload: FragmentTranscriptPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const encoded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${encoded}${"=".repeat((4 - (encoded.length % 4)) % 4)}`;
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function parsePayload(text: string): Omit<CourseRecord, "id">[] | null {
  try {
    const payload = JSON.parse(text) as Partial<FragmentTranscriptPayload>;
    return payload.version === 1 && Array.isArray(payload.courses) ? payload.courses as Omit<CourseRecord, "id">[] : null;
  } catch {
    return null;
  }
}

function parseNumericScoreUpdatePayload(text: string): FragmentNumericScoreUpdate[] | null {
  try {
    const payload = JSON.parse(text) as Partial<FragmentNumericScoreUpdatePayload>;
    return payload.version === 1 && Array.isArray(payload.updates) && payload.updates.every(isNumericScoreUpdate)
      ? payload.updates
      : null;
  } catch {
    return null;
  }
}

async function gunzip(bytes: Uint8Array): Promise<string | null> {
  try {
    if (typeof DecompressionStream === "undefined") return null;
    const buffer = new Uint8Array(bytes).buffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

export async function decodeFragmentTranscriptImport(fragment: string): Promise<Omit<CourseRecord, "id">[] | null> {
  if (fragment.startsWith(plainPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(plainPrefix.length));
    return bytes ? parsePayload(new TextDecoder().decode(bytes)) : null;
  }
  if (fragment.startsWith(gzipPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(gzipPrefix.length));
    const text = bytes ? await gunzip(bytes) : null;
    return text ? parsePayload(text) : null;
  }
  return null;
}

export async function decodeFragmentNumericScoreUpdate(fragment: string): Promise<FragmentNumericScoreUpdate[] | null> {
  if (fragment.startsWith(numericScorePlainPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(numericScorePlainPrefix.length));
    return bytes ? parseNumericScoreUpdatePayload(new TextDecoder().decode(bytes)) : null;
  }
  if (fragment.startsWith(numericScoreGzipPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(numericScoreGzipPrefix.length));
    const text = bytes ? await gunzip(bytes) : null;
    return text ? parseNumericScoreUpdatePayload(text) : null;
  }
  return null;
}
