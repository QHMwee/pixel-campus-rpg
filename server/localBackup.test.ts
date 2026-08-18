import { describe, expect, it } from "vitest";
import { createLocalBackup, parseLocalBackup } from "../shared/localBackup";

describe("local backup envelope", () => {
  it("封裝並還原使用者主動匯出的本機資料", () => {
    const text = createLocalBackup({ courses: [{ name: "演算法" }], system: "4.3" }, "2026-08-19T00:00:00.000Z");
    expect(parseLocalBackup(text)).toEqual({ version: 1, exportedAt: "2026-08-19T00:00:00.000Z", data: { courses: [{ name: "演算法" }], system: "4.3" } });
  });

  it("拒絕不是 Campus Quest 備份的資料", () => {
    expect(() => parseLocalBackup("not json")).toThrow("JSON");
    expect(() => parseLocalBackup(JSON.stringify({ version: 99, data: {} }))).toThrow("相容");
    expect(() => parseLocalBackup(JSON.stringify({ version: 1, data: [] }))).toThrow("相容");
  });
});
