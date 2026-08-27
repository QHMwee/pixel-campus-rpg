import { describe, expect, it } from "vitest";
import { createExamWorkspaces } from "../shared/examWorkspace";
import { buildExamSyncSnapshot, createExamSyncFingerprint } from "../shared/notionExamSync";
import { buildNotionExamSyncBlocks, notionSyncRouter } from "./routers/notionSync";
import type { TrpcContext } from "./_core/context";

describe("Notion append-only exam sync", () => {
  it("creates a deterministic snapshot fingerprint that changes when personal study data changes", () => {
    const workspaces = createExamWorkspaces();
    const original = createExamSyncFingerprint(workspaces);
    const copy = createExamWorkspaces();
    copy[0]!.dailyLogs.push({ id: "log-1", date: "2026-08-28", completedTaskIds: ["toeic-d38"], minutes: 180, note: "完成複習" });
    expect(createExamSyncFingerprint(createExamWorkspaces())).toBe(original);
    expect(createExamSyncFingerprint(copy)).not.toBe(original);
  });

  it("builds an ordered summary without inventing completion results", () => {
    const snapshot = buildExamSyncSnapshot(createExamWorkspaces());
    expect(snapshot.workspaces.map(workspace => workspace.code)).toEqual(["cpe", "toeic"]);
    expect(snapshot.workspaces.every(workspace => workspace.completedTasks === 0)).toBe(true);
  });

  it("renders append-only blocks with source traces, selected logs and no original-plan updates", () => {
    const workspaces = createExamWorkspaces();
    workspaces[0]!.dailyLogs.push({ id: "log-1", date: "2026-08-28", completedTaskIds: ["toeic-d38"], minutes: 180, note: "完成複習" });
    const rendered = JSON.stringify(buildNotionExamSyncBlocks(workspaces, new Date("2026-08-28T12:00:00Z")));
    expect(rendered).toContain("手動追加式同步快照");
    expect(rendered).toContain("開啟原始計畫");
    expect(rendered).toContain("完成複習");
    expect(rendered).not.toContain("replace_content");
  });

  it("rejects unauthenticated attempts before any Notion or database action", async () => {
    const caller = notionSyncRouter.createCaller({} as TrpcContext);
    await expect(caller.appendExamSnapshot({ examWorkspaces: createExamWorkspaces() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
