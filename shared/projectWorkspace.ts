export type WorkspaceProjectStatus = "planning" | "active" | "done" | "paused";
export type WorkspaceTaskStatus = "needs-review" | "not-started" | "active" | "done" | "deferred" | "blocked";

export type WorkspaceMember = { id: string; name: string; role: string };
export type WorkspaceTask = {
  id: string;
  title: string;
  description: string;
  phase: string;
  scheduleLabel: string;
  assigneeIds: string[];
  status: WorkspaceTaskStatus;
  estimatedMinutes?: number;
  extensionMinutes?: number;
  actualMinutes?: number;
  note?: string;
};

export type WorkspaceProject = {
  id: string;
  name: string;
  description: string;
  status: WorkspaceProjectStatus;
  source: { provider: "notion"; url: string; label: string; importedAt: string };
  tags: string[];
  members: WorkspaceMember[];
  tasks: WorkspaceTask[];
};

export const workspaceTaskStatusLabel: Record<WorkspaceTaskStatus, string> = {
  "needs-review": "待確認", "not-started": "未開始", active: "進行中", done: "已完成", deferred: "順延", blocked: "阻塞",
};

export const medievalGuildWorkspaceProject: WorkspaceProject = {
  id: "notion-medieval-guild-scheduler",
  name: "中世紀公會排程 App",
  description: "將日常待辦轉為冒險者公會懸賞委託，以金幣、聲望與角色回饋建立低門檻的 RPG 生產力體驗。以下任務由 Notion 開發計畫與每日進度表匯入；原始資料未提供完成狀態，因此一律先標為待確認。",
  status: "active",
  source: { provider: "notion", url: "https://app.notion.com/p/3a50b85565a581388fd7fc41dab3e4b1?pvs=204", label: "Notion｜🛡️ 中世紀公會排程 App：個人專案開發計畫", importedAt: "2026-08-19" },
  tags: ["Flutter", "Provider", "Rive", "遊戲化", "Google Play"],
  members: [
    { id: "product", name: "待指定", role: "產品經理" },
    { id: "design", name: "待指定", role: "UI/UX 設計師" },
    { id: "development", name: "待指定", role: "開發者" },
    { id: "testing", name: "待指定", role: "測試人員" },
    { id: "audio", name: "待指定", role: "音效設計師／開發者" },
  ],
  tasks: [
    { id: "phase-concept", title: "概念與規劃", description: "需求分析、競品研究、UI/UX 線框與技術架構規劃。", phase: "第一階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["product", "design", "development"], status: "needs-review" },
    { id: "phase-core", title: "基礎架構開發", description: "建立 Flutter、Provider、任務與玩家狀態的持久化及核心遊戲化邏輯。", phase: "第二階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["development"], status: "needs-review" },
    { id: "phase-ui", title: "UI/UX 與互動設計", description: "完成羊皮紙任務卡、委託對話框、像素風細節與 Rive 動畫整合。", phase: "第三階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["design", "development"], status: "needs-review" },
    { id: "phase-gameplay", title: "遊戲化機制與音效", description: "完成滑動撕毀、逾期機制、音效素材與關鍵操作回饋。", phase: "第四階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["development", "audio"], status: "needs-review" },
    { id: "phase-qa", title: "測試與優化", description: "進行單元、整合、邊界測試、重構與錯誤修復。", phase: "第五階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["development", "testing"], status: "needs-review" },
    { id: "phase-release", title: "發布準備與上架", description: "完成商店素材、隱私權政策、簽名、AAB、內測與 Play 審查準備。", phase: "第六階段", scheduleLabel: "Notion 階段規劃", assigneeIds: ["product", "design", "development"], status: "needs-review" },
    { id: "daily-0723", title: "任務卡片實作", description: "寫出 _buildQuestCard，刻出中世紀羊皮紙視覺。", phase: "每日開發計畫", scheduleLabel: "7/23", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0724", title: "滑動撕毀功能", description: "使用 Dismissible 實作向左滑動刪除任務。", phase: "每日開發計畫", scheduleLabel: "7/24", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0725", title: "中世紀委託對話框", description: "改造 showAddJobDialog 為填寫羊皮紙委託單介面。", phase: "每日開發計畫", scheduleLabel: "7/25", assigneeIds: ["design", "development"], status: "needs-review" },
    { id: "daily-0726", title: "UI 細節微調", description: "匯入復古或像素字體，調整排版與顏色。", phase: "每日開發計畫", scheduleLabel: "7/26", assigneeIds: ["design", "development"], status: "needs-review" },
    { id: "daily-0729", title: "本機儲存研究", description: "引入 shared_preferences 或 sqflite 套件。", phase: "每日開發計畫", scheduleLabel: "7/29", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0730", title: "存取任務資料", description: "將 Provider 裡的 _quests 列表存入手機。", phase: "每日開發計畫", scheduleLabel: "7/30", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0731", title: "存取玩家狀態", description: "儲存與讀取金幣與聲望。", phase: "每日開發計畫", scheduleLabel: "7/31", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0803", title: "逾期懲罰機制", description: "補上計算任務過期並扣除聲望的邏輯。", phase: "每日開發計畫", scheduleLabel: "8/3", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0804", title: "程式碼重構", description: "拆分 Widget 到獨立檔案。", phase: "每日開發計畫", scheduleLabel: "8/4", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0805", title: "Rive 基礎串接", description: "引入基礎 Q 版角色與 Rive 套件。", phase: "每日開發計畫", scheduleLabel: "8/5", assigneeIds: ["development", "design"], status: "needs-review" },
    { id: "daily-0806", title: "狀態機綁定", description: "連動角色動畫與 Provider 狀態。", phase: "每日開發計畫", scheduleLabel: "8/6", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0808", title: "音效準備", description: "尋找中世紀音效素材並確認 CC0 授權。", phase: "每日開發計畫", scheduleLabel: "8/8", assigneeIds: ["audio"], status: "needs-review" },
    { id: "daily-0809", title: "加入音效反饋", description: "引入 audioplayers 並實作任務、金幣與聲望的反饋。", phase: "每日開發計畫", scheduleLabel: "8/9", assigneeIds: ["audio", "development"], status: "needs-review" },
    { id: "daily-0812", title: "Google 開發者註冊", description: "支付註冊費、完成身分驗證與相關設定。", phase: "每日開發計畫", scheduleLabel: "8/12", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0813", title: "修補與打磨", description: "處理 UI 破圖或動畫卡頓。", phase: "每日開發計畫", scheduleLabel: "8/13", assigneeIds: ["development", "design"], status: "needs-review" },
    { id: "daily-0814", title: "Icon 與主視覺", description: "設計 512x512 Icon 與 1024x500 宣傳圖。", phase: "每日開發計畫", scheduleLabel: "8/14", assigneeIds: ["design"], status: "needs-review" },
    { id: "daily-0816", title: "隱私權政策生成", description: "生成政策文件並安排託管。", phase: "每日開發計畫", scheduleLabel: "8/16", assigneeIds: ["product"], status: "needs-review" },
    { id: "daily-0820", title: "建立商店頁面與素材", description: "在 Play Console 填寫所有商店素材。", phase: "每日開發計畫", scheduleLabel: "8/20", assigneeIds: ["product", "design", "development"], status: "needs-review" },
    { id: "daily-0822", title: "打包 AAB 檔案", description: "編譯正式版 AAB。", phase: "每日開發計畫", scheduleLabel: "8/22", assigneeIds: ["development"], status: "needs-review" },
    { id: "daily-0823", title: "上傳內部測試版", description: "上傳至 Play Console 內部測試軌道。", phase: "每日開發計畫", scheduleLabel: "8/23", assigneeIds: ["development", "testing"], status: "needs-review" },
    { id: "daily-0824", title: "實機最終測試", description: "進行斷網與壓力測試。", phase: "每日開發計畫", scheduleLabel: "8/24", assigneeIds: ["testing", "development"], status: "needs-review" },
    { id: "daily-0827", title: "送出官方審查", description: "推送至正式版並提交 Google 審查。", phase: "每日開發計畫", scheduleLabel: "8/27", assigneeIds: ["product", "development"], status: "needs-review" },
    { id: "daily-0830", title: "目標達成日", description: "成功上架 Google Play。", phase: "每日開發計畫", scheduleLabel: "8/30", assigneeIds: ["product", "development"], status: "needs-review" },
  ],
};

export function createMedievalGuildWorkspaceProject(): WorkspaceProject {
  return JSON.parse(JSON.stringify(medievalGuildWorkspaceProject)) as WorkspaceProject;
}

export function isWorkspaceProject(value: unknown): value is WorkspaceProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<WorkspaceProject>;
  return typeof project.id === "string" && typeof project.name === "string" && Array.isArray(project.members) && Array.isArray(project.tasks);
}
