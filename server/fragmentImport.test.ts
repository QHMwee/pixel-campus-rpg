import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { decodeFragmentTranscriptImport, encodeFragmentTranscriptImport } from "../shared/fragmentImport";

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
    await expect(decodeFragmentTranscriptImport("cq-import=%%%")).resolves.toBeNull();
    const wrongVersion = btoa(JSON.stringify({ version: 2, courses: [] }));
    await expect(decodeFragmentTranscriptImport(`cq-import=${wrongVersion}`)).resolves.toBeNull();
  });
});
