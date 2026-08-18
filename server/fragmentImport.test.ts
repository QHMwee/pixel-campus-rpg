import { describe, expect, it } from "vitest";
import { decodeFragmentTranscriptImport, encodeFragmentTranscriptImport } from "../shared/fragmentImport";

describe("fragment transcript import", () => {
  it("以 URL-safe 片段往返包含繁體中文與認列狀態的成績，且不需伺服器參與", () => {
    const courses = [{ term: "114-1", name: "資料科學", credits: 3, grade: "A+" as const, category: "elective" as const, recognition: "approved-external" as const }];
    const encoded = encodeFragmentTranscriptImport({ version: 1, courses });
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeFragmentTranscriptImport(`cq-import=${encoded}`)).toEqual(courses);
  });

  it("拒絕非預期格式、錯誤內容與非第一版負載", () => {
    expect(decodeFragmentTranscriptImport("grades")).toBeNull();
    expect(decodeFragmentTranscriptImport("cq-import=%%%")).toBeNull();
    const wrongVersion = btoa(JSON.stringify({ version: 2, courses: [] }));
    expect(decodeFragmentTranscriptImport(`cq-import=${wrongVersion}`)).toBeNull();
  });
});
