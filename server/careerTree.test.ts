import { describe, expect, it } from "vitest";
import type { CourseRecord, LetterGrade } from "../shared/academic";
import type { AchievementRecord } from "../shared/achievementRecords";
import {
  careerTracks,
  evaluateCareerTree,
  normalizeName,
  rankCareerTracks,
  skillNodes,
} from "../shared/careerTree";

const course = (name: string, grade: LetterGrade = "A"): CourseRecord => ({
  id: `course-${name}`,
  term: "114-1",
  name,
  credits: 3,
  grade,
  category: "required",
});

const certificate = (title: string, status: AchievementRecord["status"] = "earned"): AchievementRecord => ({
  id: `cert-${title}`,
  kind: "certificate",
  title,
  status,
  skills: [],
  evidence: [],
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
});

const nodeIn = (trackId: (typeof careerTracks)[number]["id"], nodeId: string, courses: CourseRecord[], achievements: AchievementRecord[] = [], plannedCourseNames: string[] = []) =>
  evaluateCareerTree(trackId, { courses, achievements, plannedCourseNames }).nodes.find(item => item.id === nodeId);

describe("career tree data integrity", () => {
  it("gives every track only node ids that exist in the pool", () => {
    const poolIds = new Set(skillNodes.map(item => item.id));
    for (const track of careerTracks) {
      for (const id of track.nodeIds) expect(poolIds.has(id), `${track.id} -> ${id}`).toBe(true);
      for (const id of track.coreNodeIds) expect(track.nodeIds.includes(id), `${track.id} core ${id}`).toBe(true);
    }
  });

  it("keeps node dependencies inside the pool and never self-referencing", () => {
    const poolIds = new Set(skillNodes.map(item => item.id));
    for (const item of skillNodes) {
      expect(item.dependsOn).not.toContain(item.id);
      for (const id of item.dependsOn) expect(poolIds.has(id), `${item.id} -> ${id}`).toBe(true);
    }
  });

  it("has no circular dependencies", () => {
    const byId = new Map(skillNodes.map(item => [item.id, item]));
    const done = new Set<string>();
    const path = new Set<string>();
    const walk = (id: string) => {
      if (done.has(id)) return;
      expect(path.has(id), `cycle at ${id}`).toBe(false);
      path.add(id);
      byId.get(id)?.dependsOn.forEach(walk);
      path.delete(id);
      done.add(id);
    };
    skillNodes.forEach(item => walk(item.id));
  });

  it("never lets a dependency sit above its dependent in tier order", () => {
    const tierById = new Map(skillNodes.map(item => [item.id, item.tier]));
    for (const item of skillNodes) {
      for (const id of item.dependsOn) {
        expect(tierById.get(id)!, `${id} must not sit above ${item.id}`).toBeLessThanOrEqual(item.tier);
      }
    }
  });

  it("uses unique ids", () => {
    expect(new Set(skillNodes.map(item => item.id)).size).toBe(skillNodes.length);
    expect(new Set(careerTracks.map(item => item.id)).size).toBe(careerTracks.length);
  });
});

describe("name normalization", () => {
  it("treats full-width and half-width brackets as the same course", () => {
    expect(normalizeName("計算機程式設計（一）")).toBe(normalizeName("計算機程式設計(一)"));
  });

  it("ignores incidental whitespace", () => {
    expect(normalizeName(" 資料 結構 ")).toBe(normalizeName("資料結構"));
  });
});

describe("unlocking by course", () => {
  it("lights a node up when the matching course is passed", () => {
    const result = nodeIn("frontend", "prog-basics", [course("計算機程式設計(一)")]);
    expect(result?.state).toBe("unlocked");
    expect(result?.matchedCourses).toEqual(["計算機程式設計(一)"]);
  });

  it("matches a course series by prefix", () => {
    const courses = [course("計算機程式設計(一)"), course("資料結構實習")];
    const result = nodeIn("backend", "data-struct", courses);
    expect(result?.state).toBe("unlocked");
    expect(result?.matchedCourses).toEqual(["資料結構實習"]);
  });

  it("does not count a failed course", () => {
    const result = nodeIn("frontend", "prog-basics", [course("計算機程式設計(一)", "F")]);
    expect(result?.state).toBe("available");
    expect(result?.matchedCourses).toEqual([]);
  });

  it("requires the configured number of courses", () => {
    const partial = nodeIn("research", "math-core", [course("微積分(一)")]);
    expect(partial?.state).toBe("in-progress");
    expect(partial?.remainingCourseCount).toBe(1);

    const full = nodeIn("research", "math-core", [course("微積分(一)"), course("線性代數")]);
    expect(full?.state).toBe("unlocked");
  });
});

describe("unlocking by certification", () => {
  it("accepts an earned certificate in place of coursework", () => {
    const result = nodeIn("network", "net-basics", [], [certificate("CCNA 網路認證")]);
    expect(result?.state).toBe("unlocked");
    expect(result?.matchedCertifications).toEqual(["CCNA 網路認證"]);
  });

  it("ignores a certificate that is only planned", () => {
    const result = nodeIn("network", "net-basics", [], [certificate("CCNA", "planning")]);
    expect(result?.state).toBe("available");
  });

  it("ignores a competition record even when the title matches", () => {
    const competition: AchievementRecord = { ...certificate("CCNA"), kind: "competition" };
    expect(nodeIn("network", "net-basics", [], [competition])?.state).toBe("available");
  });
});

describe("prerequisite gating", () => {
  it("locks a node whose prerequisite is not lit yet", () => {
    const result = nodeIn("ic-design", "vlsi", [course("超大型積體電路設計")]);
    expect(result?.state).toBe("locked");
    expect(result?.missingPrerequisites).toContain("積體電路設計");
  });

  it("opens the node once the prerequisite chain is complete", () => {
    const courses = [course("電路學(一)"), course("數位設計"), course("積體電路設計導論"), course("超大型積體電路設計")];
    expect(nodeIn("ic-design", "vlsi", courses)?.state).toBe("unlocked");
  });
});

describe("planned courses", () => {
  it("marks a node as in-progress without unlocking it", () => {
    const result = nodeIn("frontend", "web-frontend", [course("計算機程式設計(一)")], [], ["網際網路設計實習"]);
    expect(result?.state).toBe("in-progress");
    expect(result?.plannedCourses).toEqual(["網際網路設計實習"]);
    expect(result?.matchedCourses).toEqual([]);
  });
});

describe("track progress", () => {
  it("reports zero progress for a blank record", () => {
    const result = evaluateCareerTree("ai-ml", { courses: [] });
    expect(result.progress).toBe(0);
    expect(result.unlockedCount).toBe(0);
    expect(result.earnedXp).toBe(0);
    expect(result.nextNodes.length).toBeGreaterThan(0);
  });

  it("counts only core nodes toward progress", () => {
    const result = evaluateCareerTree("frontend", { courses: [course("計算機程式設計(一)")] });
    const core = result.track.coreNodeIds.length;
    expect(result.progress).toBe(Math.round((1 / core) * 100));
  });

  it("ranks the track that best matches the transcript first", () => {
    const courses = [course("電路學(一)"), course("數位設計"), course("積體電路設計導論"), course("超大型積體電路設計"), course("實務專題(一)")];
    expect(rankCareerTracks({ courses })[0].track.id).toBe("ic-design");
  });
});
