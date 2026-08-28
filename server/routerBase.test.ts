import { describe, expect, it } from "vitest";

/**
 * 子路徑部署的路由回歸測試。
 *
 * 背景：部署到 GitHub Pages 的 /<repo>/ 子路徑時，網址開頭不是 "/"，
 * 若 wouter 沒有設定 base，path="/" 這條路由會對不上，整個 app 會顯示
 * NotFound 頁（「Sorry, the page you are looking for doesn't exist.」）。
 *
 * 下面兩個函式抄自 wouter 3.x 的實作（node_modules/wouter/esm/index.js），
 * 用來鎖住「App.tsx 算出的 base 能讓根路由對上」這個行為。
 */
const relativePath = (base: string, path: string): string => {
  const effective = base === "/" ? "" : base;
  return !path.toLowerCase().indexOf(effective.toLowerCase())
    ? path.slice(effective.length) || "/"
    : `~${path}`;
};

/** 與 App.tsx 的 routerBase 計算方式一致。 */
const routerBaseFrom = (baseUrl: string): string => (baseUrl || "/").replace(/\/$/, "");

describe("router base for subpath deployment", () => {
  it("strips the trailing slash from Vite's BASE_URL", () => {
    expect(routerBaseFrom("/pixel-campus-rpg/")).toBe("/pixel-campus-rpg");
    expect(routerBaseFrom("/")).toBe("");
    expect(routerBaseFrom("")).toBe("");
  });

  it("matches the root route when served from a subpath", () => {
    const base = routerBaseFrom("/pixel-campus-rpg/");
    expect(relativePath(base, "/pixel-campus-rpg/")).toBe("/");
  });

  it("still matches the root route when served from the domain root", () => {
    const base = routerBaseFrom("/");
    expect(relativePath(base, "/")).toBe("/");
  });

  it("reproduces the bug when no base is configured", () => {
    // 這是修正前的行為：路徑對不上 "/"，因此會落到 NotFound。
    expect(relativePath("", "/pixel-campus-rpg/")).not.toBe("/");
  });

  it("keeps other routes reachable under a subpath", () => {
    const base = routerBaseFrom("/pixel-campus-rpg/");
    expect(relativePath(base, "/pixel-campus-rpg/404")).toBe("/404");
  });
});

/**
 * 應用程式內部的分頁切換（navigateToView）會用 pushState 改寫網址。
 * 之前寫死成 "/" 與 "/#view"，在子路徑部署時會跳出應用程式目錄造成 404。
 */
const nextUrlFor = (baseUrl: string, view: string): string => {
  const base = baseUrl || "/";
  return view === "dashboard" ? base : `${base}#${view}`;
};

describe("in-app navigation under a subpath", () => {
  const base = "/pixel-campus-rpg/";

  it("keeps the dashboard inside the deployment directory", () => {
    expect(nextUrlFor(base, "dashboard")).toBe("/pixel-campus-rpg/");
  });

  it("keeps every other view inside the deployment directory", () => {
    for (const view of ["plan", "grades", "credits", "quest", "projects", "exams", "achievements", "badges"]) {
      expect(nextUrlFor(base, view)).toBe(`/pixel-campus-rpg/#${view}`);
    }
  });

  it("never navigates to the domain root when deployed under a subpath", () => {
    expect(nextUrlFor(base, "dashboard")).not.toBe("/");
    expect(nextUrlFor(base, "grades").startsWith(base)).toBe(true);
  });

  it("behaves exactly as before when deployed at the domain root", () => {
    expect(nextUrlFor("/", "dashboard")).toBe("/");
    expect(nextUrlFor("/", "grades")).toBe("/#grades");
  });
});
