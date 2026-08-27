import { describe, expect, it } from "vitest";
import { createExamWorkspaces, getExamCountdown, getExamTasksForDate, isExamWorkspace, normalizeExamWorkspace, updateExamDailyLog } from "../shared/examWorkspace";

describe("Notion exam workspace import", () => {
  it("imports editable TOEIC and CPE workspaces with the confirmed exam dates", () => {
    const workspaces = createExamWorkspaces();
    expect(workspaces).toHaveLength(2);
    expect(workspaces.find(workspace => workspace.code === "toeic")?.examDate).toBe("2026-12-20");
    expect(workspaces.find(workspace => workspace.code === "cpe")?.examDate).toBe("2027-03-23");
    expect(workspaces.every(workspace => workspace.dailyTasks.every(task => task.status === "needs-review"))).toBe(true);
  });

  it("returns independent personal copies and preserves source tasks for date-based checklists", () => {
    const workspaces = createExamWorkspaces();
    const toeic = workspaces.find(workspace => workspace.code === "toeic")!;
    toeic.resources[0]!.title = "我的單字清單";
    expect(createExamWorkspaces().find(workspace => workspace.code === "toeic")?.resources[0]?.title).toBe("多益高頻單字庫");
    expect(getExamTasksForDate(toeic, "2026-08-28").map(task => task.title)).toContain("Relative Clauses（關係子句）");
    expect(isExamWorkspace(toeic)).toBe(true);
  });

  it("calculates future, exam-day, passed and unset countdowns without hardcoding the display", () => {
    expect(getExamCountdown("2026-12-20", new Date("2026-08-28T12:00:00")).days).toBe(114);
    expect(getExamCountdown("2026-12-20", new Date("2026-12-20T23:59:00")).status).toBe("today");
    expect(getExamCountdown("2026-12-20", new Date("2026-12-21T00:01:00")).status).toBe("passed");
    expect(getExamCountdown(undefined, new Date("2026-08-28T12:00:00")).status).toBe("unset");
  });

  it("writes date-based checklist logs and updates the matching task status", () => {
    const toeic = createExamWorkspaces().find(workspace => workspace.code === "toeic")!;
    const updated = updateExamDailyLog(toeic, "2026-08-28", current => ({ ...current, completedTaskIds: ["toeic-d38"], minutes: 180, note: "完成關係子句複習" }), "toeic-d38", true);
    expect(updated.dailyLogs[0]).toMatchObject({ date: "2026-08-28", completedTaskIds: ["toeic-d38"], minutes: 180 });
    expect(updated.dailyTasks.find(task => task.id === "toeic-d38")?.status).toBe("done");
  });

  it("normalizes recoverable local data while removing malformed custom resource records", () => {
    const toeic = createExamWorkspaces().find(workspace => workspace.code === "toeic")!;
    const normalized = normalizeExamWorkspace({ ...toeic, resources: [...toeic.resources, { id: "broken", title: "沒有類型", createdAt: "2026-08-28" }] });
    expect(normalized?.resources).toHaveLength(toeic.resources.length);
    expect(normalized?.resources.every(resource => Boolean(resource.title))).toBe(true);
  });
});
