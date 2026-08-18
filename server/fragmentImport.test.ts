import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { decodeFragmentNumericScoreUpdate, decodeFragmentTranscriptImport, encodeFragmentTranscriptImport, mergeFragmentNumericScoreUpdate, mergeFragmentTranscriptImport } from "../shared/fragmentImport";
import { defaultGraduationGoals } from "../shared/academic";

describe("fragment transcript import", () => {
  it("以 URL-safe 片段往返包含繁體中文與認列狀態的成績，且不需伺服器參與", async () => {
    const courses = [{ term: "114-1", name: "資料科學", credits: 3, grade: "A+" as const, category: "elective" as const, recognition: "approved-external" as const }];
    const encoded = encodeFragmentTranscriptImport({ version: 1, courses });
    expect(encoded).not.toMatch(/[+/=]/);
    await expect(decodeFragmentTranscriptImport(`cq-import=${encoded}`)).resolves.toEqual(courses);
  });

  it("可解壓較短的 gzip 片段，並拒絕非預期格式、錯誤內容與非第一版負載", async () => {
    const courses = [{ term: "114-1", name: "資料科學", credits: 3, grade: "A+" as const, category: "elective" as const, recognition: "approved-external" as const }];
    const compressed = gzipSync(Buffer.from(JSON.stringify({ version: 1, courses }), "utf8")).toString("base64url");
    await expect(decodeFragmentTranscriptImport(`cq-import-gz=${compressed}`)).resolves.toEqual(courses);
    await expect(decodeFragmentTranscriptImport("grades")).resolves.toBeNull();
    await expect(decodeFragmentTranscriptImport("cq-import=%%%")) .resolves.toBeNull();
    const wrongVersion = btoa(JSON.stringify({ version: 2, courses: [] }));
    await expect(decodeFragmentTranscriptImport(`cq-import=${wrongVersion}`)).resolves.toBeNull();
  });

  it("數字成績補寫片段只更新已存在的同學期同課名紀錄，不新增或覆寫其他欄位", async () => {
    const updates = [{ term: "114-1", name: "資料科學", numericScore: 99 }, { term: "114-2", name: "未曾匯入的課", numericScore: 88 }];
    const compressed = gzipSync(Buffer.from(JSON.stringify({ version: 1, updates }), "utf8")).toString("base64url");
    await expect(decodeFragmentNumericScoreUpdate(`cq-score-update-gz=${compressed}`)).resolves.toEqual(updates);
    const existing = [{ id: "science", term: "114-1", name: "資料科學", credits: 3, grade: "A+" as const, category: "elective" as const, recognition: "approved-external" as const }];
    const result = mergeFragmentNumericScoreUpdate(existing, updates);
    expect(result.courses).toEqual([{ ...existing[0], numericScore: 99 }]);
    expect(result.updated).toEqual([{ ...existing[0], numericScore: 99 }]);
    expect(result.unmatched).toEqual([{ term: "114-2", name: "未曾匯入的課", numericScore: 88 }]);
  });

  it("首次與重複開啟一次性連結都會套用 51／49／28／128 目標，且不重複新增課程", () => {
    const incoming = [
      { term: "114-1", name: "系必修測試甲", credits: 8, grade: "A" as const, category: "required" as const, recognition: "standard" as const },
      { term: "114-1", name: "系必修測試乙", credits: 6, grade: "A" as const, category: "required" as const, recognition: "standard" as const },
      { term: "114-1", name: "外系已認列測試", credits: 12, grade: "A" as const, category: "elective" as const, recognition: "approved-external" as const },
      { term: "114-1", name: "博雅(社會)測試", credits: 9, grade: "A" as const, category: "general" as const, recognition: "standard" as const },
      { term: "114-1", name: "博雅(科技)測試", credits: 9, grade: "A" as const, category: "general" as const, recognition: "standard" as const },
      { term: "114-1", name: "校訂(六)測試", credits: 9, grade: "A" as const, category: "general" as const, recognition: "standard" as const },
      { term: "114-1", name: "僅計 GPA 測試", credits: 4, grade: "A" as const, category: "elective" as const, recognition: "gpa-only" as const },
    ];
    const first = mergeFragmentTranscriptImport([], incoming, defaultGraduationGoals, () => "import-1");
    expect(first.imported).toHaveLength(7);
    expect(first.goals).toMatchObject({ total: 128, required: 51, elective: 49, general: 28 });
    expect(first.credits).toMatchObject({ total: 42, required: 14, elective: 12, general: 16 });

    const repeated = mergeFragmentTranscriptImport(first.courses, incoming, first.goals, () => "should-not-exist");
    expect(repeated.imported).toHaveLength(0);
    expect(repeated.courses).toHaveLength(7);
    expect(repeated.goals).toMatchObject({ total: 128, required: 51, elective: 49, general: 28 });
    expect(repeated.credits).toMatchObject({ total: 42, required: 14, elective: 12, general: 16 });
  });
});
