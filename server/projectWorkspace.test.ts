import { describe, expect, it } from "vitest";
import { createMedievalGuildWorkspaceProject, isWorkspaceProject, medievalGuildWorkspaceProject } from "../shared/projectWorkspace";

describe("Notion project workspace import", () => {
  it("imports the medieval guild project as reviewable work without fabricating completion", () => {
    expect(medievalGuildWorkspaceProject.name).toContain("中世紀公會排程 App");
    expect(medievalGuildWorkspaceProject.source.provider).toBe("notion");
    expect(medievalGuildWorkspaceProject.tasks.length).toBeGreaterThan(20);
    expect(medievalGuildWorkspaceProject.tasks.every(task => task.status === "needs-review")).toBe(true);
  });

  it("returns an independent workspace copy for private management", () => {
    const copy = createMedievalGuildWorkspaceProject();
    copy.tasks[0]!.status = "active";
    expect(medievalGuildWorkspaceProject.tasks[0]!.status).toBe("needs-review");
    expect(isWorkspaceProject(copy)).toBe(true);
  });

  it("rejects an incomplete workspace payload", () => {
    expect(isWorkspaceProject({ id: "notion-medieval" })).toBe(false);
  });
});
