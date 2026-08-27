import { describe, expect, it } from "vitest";
import { isAchievementRecord } from "../shared/achievementRecords";
import { getAchievementMediaKind } from "./routers/achievementMedia";
import { achievementMediaRouter } from "./routers/achievementMedia";
import type { TrpcContext } from "./_core/context";

describe("certificate and competition records", () => {
  it("recognizes a private certificate record with image evidence", () => {
    expect(isAchievementRecord({
      id: "cert-1", kind: "certificate", title: "Python 證照", status: "earned", skills: ["Python"],
      evidence: [{ id: "image-1", name: "證書", kind: "image", storageKey: "private-evidence/owner/cert.png", createdAt: "2026-08-27T00:00:00.000Z" }],
    })).toBe(true);
  });

  it("rejects incomplete achievement records and detects supported media kinds", () => {
    expect(isAchievementRecord({ id: "bad", title: "缺少種類" })).toBe(false);
    expect(getAchievementMediaKind("image/png")).toBe("image");
    expect(getAchievementMediaKind("video/mp4")).toBe("video");
  });

  it("rejects unauthenticated private media uploads", async () => {
    const caller = achievementMediaRouter.createCaller({} as TrpcContext);
    await expect(caller.upload({ recordId: "cert-1", fileName: "proof.png", mimeType: "image/png", base64: "aGVsbG8=" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
