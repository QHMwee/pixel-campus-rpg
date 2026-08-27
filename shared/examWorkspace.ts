export type ExamResourceKind = "vocabulary" | "practice" | "notes" | "mock" | "link" | "document" | "other";
export type ExamTaskStatus = "needs-review" | "not-started" | "done";

export type ExamDailyTask = {
  id: string;
  date: string;
  title: string;
  detail?: string;
  phase?: string;
  resourceLabel?: string;
  plannedMinutes?: number;
  sourceUrl?: string;
  status: ExamTaskStatus;
};

export type ExamDailyLog = {
  id: string;
  date: string;
  completedTaskIds: string[];
  minutes?: number;
  note?: string;
};

export type ExamResource = {
  id: string;
  title: string;
  kind: ExamResourceKind;
  url?: string;
  note?: string;
  sourceRef?: string;
  createdAt: string;
};

export type ExamWorkspace = {
  id: string;
  code: "toeic" | "cpe";
  name: string;
  description: string;
  source: { provider: "notion"; url: string; label: string; importedAt: string };
  examDate: string;
  examTime?: string;
  examDayChecklist: string[];
  dailyTasks: ExamDailyTask[];
  dailyLogs: ExamDailyLog[];
  resources: ExamResource[];
  notes?: string;
};

export type ExamCountdown = { status: "future" | "today" | "passed" | "unset"; days: number | null; label: string };

export const examResourceKindLabel: Record<ExamResourceKind, string> = {
  vocabulary: "單字", practice: "題目", notes: "筆記", mock: "模考", link: "連結", document: "文件", other: "其他",
};

export const examTaskStatusLabel: Record<ExamTaskStatus, string> = {
  "needs-review": "待確認", "not-started": "未開始", done: "已完成",
};

function notionDailyTask(id: string, date: string, title: string, detail: string, phase: string, resourceLabel: string, plannedMinutes: number, sourceUrl: string): ExamDailyTask {
  return { id, date, title, detail, phase, resourceLabel, plannedMinutes, sourceUrl, status: "needs-review" };
}

const toeicWorkspace: ExamWorkspace = {
  id: "notion-toeic-750-sprint",
  code: "toeic",
  name: "多益 750 衝刺 65 天計畫",
  description: "由 Notion 的多益 750 衝刺計畫匯入。近期每日任務與資料入口可在此管理；匯入項目均先標示為待確認，避免以 Notion 的歷史勾選狀態推測你的完成度。",
  source: { provider: "notion", url: "https://app.notion.com/p/3a00b85565a58185b017f9d1055372a1?pvs=204", label: "Notion｜多益 750 衝刺 65 天計畫系統", importedAt: "2026-08-28" },
  examDate: "2026-12-20",
  examDayChecklist: ["攜帶身分證件", "完成准考證明查詢", "準備 2B 鉛筆", "提早 30 分鐘抵達考場"],
  dailyLogs: [],
  resources: [
    { id: "toeic-vocabulary", title: "多益高頻單字庫", kind: "vocabulary", sourceRef: "collection://c1785ad3-2e9e-4f9b-9805-b2b771d76b21", note: "Notion 匯入來源；可在此工作區補充自己的單字書、筆記或連結。", createdAt: "2026-08-28" },
    { id: "toeic-errors", title: "多益錯題分析本", kind: "notes", sourceRef: "collection://c5599a58-e0bd-44a4-b9e1-6a79090414a2", note: "Notion 匯入來源。", createdAt: "2026-08-28" },
    { id: "toeic-daily-source", title: "每日進度追蹤", kind: "document", sourceRef: "collection://3b30b855-65a5-8071-b1cc-000b0650049e", note: "原始 65 天每日進度資料庫；本頁提供可自行持續擴充的個人勾選與日誌。", createdAt: "2026-08-28" },
  ],
  dailyTasks: [
    notionDailyTask("toeic-d36", "2026-08-26", "Passive Voice（被動語態）", "by + 受詞的辨識與時態變化", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a581bc9027c43e99e77f7d"),
    notionDailyTask("toeic-d37", "2026-08-27", "Comparison（比較級與最高級）", "as...as、than、the most 固定句型", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a58110818ef0fddf6f854c"),
    notionDailyTask("toeic-d38", "2026-08-28", "Relative Clauses（關係子句）", "who/which/that/whose 用法辨析", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a58102bbe3ceb424a7473f"),
    notionDailyTask("toeic-d39", "2026-08-29", "Gerunds & Infinitives（動名詞與不定詞）", "動詞後接 V-ing 或 to V 的固定搭配", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a58118aa99e121e993953d"),
    notionDailyTask("toeic-d40", "2026-08-30", "Participles（分詞構句）", "現在分詞／過去分詞作修飾語", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a5818b99cb709a16f88b9"),
    notionDailyTask("toeic-d41", "2026-08-31", "Exercise 6-10：文法句型綜合練習", "計時作答，模擬正式考試節奏", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5", 180, "https://app.notion.com/3b30b85565a581a28381cad87238ef28"),
    notionDailyTask("toeic-d42", "2026-09-01", "Part 5 Review + 錯題整理", "統計最常錯的文法點，製作弱點清單", "Phase 2：閱讀 Part 5 文法句型攻略", "Part 5 Review", 180, "https://app.notion.com/3b30b85565a581ffa34fc23f7336e164"),
    notionDailyTask("toeic-d43", "2026-09-02", "Strategy: Text Completion 解題策略", "先讀完整段落再作答，勿只看單句", "Phase 3：閱讀 Part 6 段落填空攻略", "Part 6", 180, "https://app.notion.com/3b30b85565a581579bc8ea8ee1c1f3b8"),
    notionDailyTask("toeic-d44", "2026-09-03", "Exercise 1-2：Business Letters / Emails", "留意連接副詞 however、therefore 的段落填空", "Phase 3：閱讀 Part 6 段落填空攻略", "Part 6", 180, "https://app.notion.com/3b30b85565a581318dd1d1ad6172651b"),
    notionDailyTask("toeic-d45", "2026-09-04", "Exercise 3-4：Notices / Announcements", "留意時態與代名詞呼應前後文", "Phase 3：閱讀 Part 6 段落填空攻略", "Part 6", 180, "https://app.notion.com/3b30b85565a581de884ce8deae2318f3"),
  ],
};

const cpeWorkspace: ExamWorkspace = {
  id: "notion-cpe-sprint",
  code: "cpe",
  name: "CPE 衝刺計畫",
  description: "由 Notion 的 CPE 衝刺計畫匯入。此處可用日期勾選、投入時間與筆記管理個人練習，並把常用題庫、演算法筆記與外部資料集中在同一個私人工作區。",
  source: { provider: "notion", url: "https://app.notion.com/p/3a40b85565a580b8ae74e973e3ff10e6?pvs=204", label: "Notion｜CPE 衝刺計畫", importedAt: "2026-08-28" },
  examDate: "2027-03-23",
  examTime: "18:40",
  examDayChecklist: ["17:30 前完成報到", "17:40–18:30 參加練習時段", "18:40–21:40 進行正式考試", "考試中依既定解題策略與配速作答"],
  dailyLogs: [],
  resources: [
    { id: "cpe-problems", title: "CPE 題目庫", kind: "practice", sourceRef: "collection://c7448697-8407-441c-a34f-b5e0f3dabb17", note: "Notion 匯入來源。", createdAt: "2026-08-28" },
    { id: "cpe-algorithms", title: "演算法筆記", kind: "notes", sourceRef: "collection://ad23f8b5-4218-4f76-a9a6-397509fb661b", note: "Notion 匯入來源。", createdAt: "2026-08-28" },
    { id: "cpe-errors", title: "CPE 錯題本", kind: "notes", sourceRef: "collection://b323dd54-0216-491b-a218-0eafbe1de8e8", note: "Notion 匯入來源。", createdAt: "2026-08-28" },
    { id: "cpe-stages", title: "階段目標", kind: "document", sourceRef: "collection://ad5bff20-1a6b-4e57-92c6-a61ac8628264", note: "Notion 匯入來源。", createdAt: "2026-08-28" },
    { id: "cpe-learning", title: "學習資源", kind: "link", sourceRef: "collection://5411d881-9e30-41ac-a75a-7b47fa10c040", note: "Notion 匯入來源；可自行新增實際使用的題庫、講義與連結。", createdAt: "2026-08-28" },
  ],
  dailyTasks: [
    notionDailyTask("cpe-d6", "2026-08-26", "函式與參數傳遞", "傳值 vs 傳參考；為什麼陣列傳進函式不用回傳", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a581ef99f1f82113c88cfe"),
    notionDailyTask("cpe-d7", "2026-08-27", "cin/cout 與 scanf/printf", "兩套都要會；printf 的格式化輸出在 CPE 很常用", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a581528cd7d86449cefddd"),
    notionDailyTask("cpe-d8", "2026-08-28", "讀到 EOF 的三種寫法", "while(cin>>n)、while(scanf(\"%d\",&n)!=EOF)、讀到特定終止值；CPE 幾乎每題都用得到", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 60, "https://app.notion.com/3c20b85565a581979286f2f569e357b7"),
    notionDailyTask("cpe-d9", "2026-08-29", "本週檢討 ＋ 小抄第一頁", "把本週的語法整理成紙本小抄第一頁；考場可帶紙本字典與小抄", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a5814bb650c023ef03ad2b"),
    notionDailyTask("cpe-d10", "2026-08-30", "休息日／翻小抄", "不寫新題，只翻過去寫的東西", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 30, "https://app.notion.com/3c20b85565a58143a71ce156cfa92742"),
    notionDailyTask("cpe-d11", "2026-08-31", "一維陣列操作", "走訪、最大最小、累加、反轉", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a581e0bdf5d1f3fbeb97be"),
    notionDailyTask("cpe-d12", "2026-09-01", "二維陣列操作", "列與行的走訪順序；矩陣題的座標習慣", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a5815d9885d59fa2be16cd"),
    notionDailyTask("cpe-d13", "2026-09-02", "C-style 字串與 string", "兩種都要熟；getline 讀整行的時機", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a581f59b1de86613bb13a0"),
    notionDailyTask("cpe-d14", "2026-09-03", "字串常用操作", "substr、find、比較、大小寫轉換、字元判斷", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 45, "https://app.notion.com/3c20b85565a581deb3f8e372c9a2ea48"),
    notionDailyTask("cpe-d15", "2026-09-04", "輸入格式陷阱整理", "混用 cin>> 與 getline 的換行殘留問題；多筆測資的迴圈外框", "Stage A｜低速打底期 — Phase 1：C++ 基礎與輸入輸出", "C++ 基礎 / 瘋狂程設", 60, "https://app.notion.com/3c20b85565a5815ab59cff8b7e947f17"),
  ],
};

export function createExamWorkspaces(): ExamWorkspace[] {
  return JSON.parse(JSON.stringify([toeicWorkspace, cpeWorkspace])) as ExamWorkspace[];
}

export function isExamWorkspace(value: unknown): value is ExamWorkspace {
  if (!value || typeof value !== "object") return false;
  const workspace = value as Partial<ExamWorkspace>;
  return (workspace.code === "toeic" || workspace.code === "cpe")
    && typeof workspace.id === "string"
    && typeof workspace.name === "string"
    && typeof workspace.examDate === "string"
    && Array.isArray(workspace.dailyTasks)
    && Array.isArray(workspace.dailyLogs)
    && Array.isArray(workspace.resources);
}

function isExamResourceKind(value: unknown): value is ExamResourceKind {
  return value === "vocabulary" || value === "practice" || value === "notes" || value === "mock" || value === "link" || value === "document" || value === "other";
}

export function normalizeExamWorkspace(value: unknown): ExamWorkspace | null {
  if (!isExamWorkspace(value)) return null;
  const workspace = value as ExamWorkspace;
  const resources = workspace.resources.filter((resource): resource is ExamResource => Boolean(resource && typeof resource.id === "string" && typeof resource.title === "string" && isExamResourceKind(resource.kind) && typeof resource.createdAt === "string"));
  const dailyTasks = workspace.dailyTasks.filter(task => Boolean(task && typeof task.id === "string" && typeof task.date === "string" && typeof task.title === "string" && (task.status === "needs-review" || task.status === "not-started" || task.status === "done")));
  const dailyLogs = workspace.dailyLogs.filter(log => Boolean(log && typeof log.id === "string" && typeof log.date === "string" && Array.isArray(log.completedTaskIds) && log.completedTaskIds.every(taskId => typeof taskId === "string")));
  return { ...workspace, resources, dailyTasks, dailyLogs, examDayChecklist: workspace.examDayChecklist.filter(item => typeof item === "string" && item.trim().length > 0) };
}

export function updateExamDailyLog(workspace: ExamWorkspace, date: string, patch: (current: ExamDailyLog) => ExamDailyLog, taskId?: string, checked?: boolean): ExamWorkspace {
  const currentLog = workspace.dailyLogs.find(log => log.date === date) ?? { id: crypto.randomUUID(), date, completedTaskIds: [] };
  const nextLog = patch(currentLog);
  return {
    ...workspace,
    dailyLogs: [...workspace.dailyLogs.filter(log => log.date !== date), nextLog].sort((a, b) => b.date.localeCompare(a.date)),
    dailyTasks: taskId === undefined ? workspace.dailyTasks : workspace.dailyTasks.map(task => task.id === taskId ? { ...task, status: checked ? "done" : task.status === "done" ? "needs-review" : task.status } : task),
  };
}

export function getExamCountdown(examDate: string | undefined, now = new Date()): ExamCountdown {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return { status: "unset", days: null, label: "尚未設定考試日期" };
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return { status: "unset", days: null, label: "尚未設定考試日期" };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return { status: "today", days, label: "就是今天" };
  if (days < 0) return { status: "passed", days, label: `已過 ${Math.abs(days)} 天` };
  return { status: "future", days, label: `倒數 ${days} 天` };
}

export function getExamTasksForDate(workspace: ExamWorkspace, date: string) {
  return workspace.dailyTasks.filter(task => task.date === date);
}
