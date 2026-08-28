import type { CourseRecord } from "./academic";
import type { AchievementRecord } from "./achievementRecords";

/**
 * 職涯技能樹。
 *
 * 設計原則：本模組刻意「不」擴充 academic.ts 的 CareerPath 聯合型別。
 * CareerPath 被 courseCatalog 與 ccee114CourseMap 的 careerFit:
 * Record<CareerPath, number> 綁住，每多一條職涯就要為上百筆課程手寫一個
 * 適配分數。技能樹改採獨立的 CareerTrackId，只靠「課程名稱」與「證照名稱」
 * 比對，兩套系統可並存，舊的選課推薦邏輯完全不受影響。
 */

export type CareerTrackId =
  | "frontend"
  | "backend"
  | "mobile"
  | "embedded"
  | "ic-design"
  | "rf-antenna"
  | "network"
  | "security"
  | "cloud-devops"
  | "data-analyst"
  | "ai-ml"
  | "iot"
  | "dsp-media"
  | "graphics-game"
  | "product"
  | "research";

export type CareerTrackDomain =
  | "軟體開發"
  | "硬體與晶片"
  | "網路與通訊"
  | "資料與智慧"
  | "產品與研究";

/** 技能節點的深度層級；用於畫面分欄與解鎖節奏。 */
export type SkillTier = 1 | 2 | 3 | 4;

export const skillTierLabel: Record<SkillTier, string> = {
  1: "基礎",
  2: "進階",
  3: "專精",
  4: "實戰",
};

export type SkillNode = {
  id: string;
  name: string;
  tier: SkillTier;
  summary: string;
  /** 前置技能節點 id；必須全部點亮後本節點才可點。 */
  dependsOn: string[];
  /**
   * 可點亮此技能的課程名稱。比對採「正規化後前綴比對」，
   * 因此 "計算機程式設計" 會同時對應 (一) 與 (二)。
   */
  courses: string[];
  /** 需要修過幾門上列課程才算達成；預設 1。 */
  requiredCourseCount: number;
  /** 可替代課程的證照名稱；取得任一張即可點亮。 */
  certifications: string[];
  /** 點亮此節點取得的 XP。 */
  xp: number;
};

export type CareerTrack = {
  id: CareerTrackId;
  title: string;
  shortTitle: string;
  domain: CareerTrackDomain;
  description: string;
  /** 這條路線包含的技能節點，順序即建議推進順序。 */
  nodeIds: string[];
  /** 完成度只計算核心節點；其餘為加分節點。 */
  coreNodeIds: string[];
  /** 對應的公開職務資料，供介面標註出處。 */
  evidence: { label: string; url: string };
};

/* ------------------------------------------------------------------ */
/* 名稱正規化與比對                                                     */
/* ------------------------------------------------------------------ */

/**
 * 課程／證照名稱正規化：去空白、統一全形括號與大小寫。
 * 匯入的成績單與手動輸入常混用全形括號，不正規化會比對不到。
 */
export function normalizeName(value: string): string {
  return value
    .replace(/[\s\u3000]/g, "")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[－–—]/g, "-")
    .toLocaleLowerCase("zh-Hant");
}

/**
 * 前綴比對：需求 "資料結構" 可對應 "資料結構" 與 "資料結構實習"。
 * 這是刻意放寬的，用意是讓一份需求涵蓋同系列課程；
 * 若某節點不希望被系列課程觸發，請把需求名稱寫得更完整。
 */
function nameMatches(requirement: string, candidate: string): boolean {
  const need = normalizeName(requirement);
  const has = normalizeName(candidate);
  if (!need || !has) return false;
  return has === need || has.startsWith(need);
}

/** 及格且可採計的課程才算數；F 或未評分不點亮技能。 */
function isCourseEarned(course: CourseRecord): boolean {
  return course.grade !== "F";
}

/** 只有「已取得／已完成」的證照才點亮技能，規劃中與進行中不算。 */
function isCertificationEarned(record: AchievementRecord): boolean {
  return (
    record.kind === "certificate" &&
    (record.status === "earned" || record.status === "completed")
  );
}

/* ------------------------------------------------------------------ */
/* 技能節點池                                                          */
/* ------------------------------------------------------------------ */

const node = (
  id: string,
  name: string,
  tier: SkillTier,
  summary: string,
  dependsOn: string[],
  courses: string[],
  certifications: string[] = [],
  requiredCourseCount = 1,
  xp = tier * 60
): SkillNode => ({
  id,
  name,
  tier,
  summary,
  dependsOn,
  courses,
  requiredCourseCount,
  certifications,
  xp,
});

/**
 * 全域技能節點池。多條職涯路線共用同一個節點（例如「程式基礎」），
 * 因此節點只定義一次，路線只負責挑選要顯示哪些節點。
 * 課程名稱取自高科大電通系 114 課程地圖，證照為國內外常見項目。
 */
export const skillNodes: SkillNode[] = [
  // --- 共通基礎 ---
  node("prog-basics", "程式基礎", 1, "掌握語法、流程控制與基本除錯。", [], ["計算機程式設計", "程式設計實習", "程式設計"], ["TQC 程式語言", "TQC+ Python"], 1),
  node("math-core", "工程數學基礎", 1, "微積分與線性代數，支撐後續所有分析型課程。", [], ["微積分", "線性代數", "微分方程", "複變數"], [], 2),
  node("prob-stat", "機率與統計", 1, "用機率模型描述不確定性並驗證假設。", [], ["機率", "隨機變數與統計", "隨機過程", "統計學"], [], 1),
  node("circuit-basics", "電路基礎", 1, "電路分析與量測，硬體路線的入口。", [], ["電路學", "電子電路", "基礎電工實習"], [], 1),
  node("digital-logic", "數位邏輯設計", 1, "邏輯閘、時序與硬體描述語言基礎。", ["circuit-basics"], ["數位設計", "數位系統實習", "數位電子電路"], [], 1),
  node("english-pro", "專業英文溝通", 1, "讀懂英文技術文件並做專業發表。", [], ["電腦與通訊英語", "英文簡報"], ["TOEIC 多益", "多益", "TOEFL", "IELTS"], 1),

  // --- 軟體核心 ---
  node("data-struct", "資料結構與演算法", 2, "選對資料結構與演算法，寫出可擴展的程式。", ["prog-basics"], ["資料結構", "演算法", "離散數學"], [], 1),
  node("oop", "物件導向與系統分析", 2, "以物件與模組拆解需求，畫得出系統設計。", ["prog-basics"], ["物件導向系統分析實習", "系統分析與設計"], [], 1),
  node("os-core", "作業系統與系統程式", 2, "行程、記憶體與系統呼叫的運作原理。", ["prog-basics"], ["作業系統應用", "作業系統實習", "系統程式"], [], 1),
  node("db-core", "資料庫系統", 2, "資料建模、SQL 查詢與正規化。", ["data-struct"], ["資料庫系統"], ["TQC 資料庫", "Oracle Database SQL"], 1),
  node("sw-eng", "軟體工程實務", 3, "版本控制、測試與開發流程管理。", ["oop"], ["軟體工程", "軟體專案管理"], [], 1),
  node("web-frontend", "前端網頁開發", 2, "以元件化方式完成可互動的網頁介面。", ["prog-basics"], ["網際網路設計實習", "視窗程式設計", "視窗程式應用設計實習"], ["TQC 網頁設計", "TQC+ 網頁設計"], 1),
  node("backend-api", "後端服務開發", 3, "設計 API、處理狀態與資料一致性。", ["oop", "db-core"], ["系統分析與設計", "軟體工程"], [], 1),
  node("mobile-dev", "行動應用開發", 3, "在 Android／iOS 平台完成可安裝的應用。", ["prog-basics"], ["行動裝置程式設計實習", "行動裝置作業系統應用實習"], [], 1),
  node("cloud", "雲端與邊緣運算", 3, "把服務部署到雲端並理解資源計費模型。", ["os-core"], ["雲端運算", "行動邊緣計算"], ["AWS Certified", "Google Cloud", "Microsoft Azure", "Azure Fundamentals"], 1),
  node("ui-ux", "介面與體驗設計", 2, "從使用者流程出發設計可用的介面。", [], ["多媒體設計實習", "多媒體與網路導論", "互動設計"], ["iPAS UX", "Google UX"], 1),

  // --- 網路與通訊 ---
  node("net-basics", "網路基礎", 1, "TCP/IP 分層、封包流動與基本設定。", [], ["電腦網路", "通訊導論"], ["CCNA", "Network+"], 1),
  node("net-advanced", "進階網路架構", 3, "寬頻、感測網路與大型網路規劃。", ["net-basics"], ["寬頻網路", "智慧感測網路"], ["CCNP"], 1),
  node("comm-theory", "通訊系統理論", 2, "調變、編碼與通道容量的數學基礎。", ["math-core"], ["通訊原理", "數位通訊理論", "通訊實習", "信號與系統"], [], 1),
  node("wireless", "無線與行動通訊", 3, "行動網路架構與 5G／次世代技術。", ["comm-theory"], ["個人與行動通訊系統", "5G行動通訊網路", "次世代通訊技術", "通訊系統設計實習"], [], 1),
  node("rf-microwave", "射頻與微波電路", 3, "高頻電路設計、量測與阻抗匹配。", ["circuit-basics", "math-core"], ["微波元件實習", "微波電路與系統實習", "電磁學"], [], 1),
  node("antenna", "天線設計", 4, "天線建模、模擬與實測，物聯網裝置的關鍵。", ["rf-microwave"], ["天線設計實務", "天線設計實習"], ["iPAS 天線設計工程師"], 1),
  node("security", "資訊安全與攻防", 3, "威脅建模、防禦設定與滲透測試基礎。", ["net-basics", "os-core"], ["網路安全與資安監控", "網路與資安攻防實習"], ["iPAS 資訊安全工程師", "CEH", "Security+", "CompTIA Security+"], 1),

  // --- 硬體與晶片 ---
  node("mcu", "微處理器與韌體", 2, "從暫存器層級控制硬體與週邊。", ["digital-logic"], ["微處理器應用", "微處理器實習", "組合語言"], [], 1),
  node("ic-basics", "積體電路設計", 3, "從電路到佈局的晶片設計流程。", ["digital-logic"], ["積體電路設計導論", "電子電路設計"], [], 1),
  node("vlsi", "超大型積體電路", 4, "大規模數位晶片的設計、驗證與流程。", ["ic-basics"], ["超大型積體電路設計", "超大型積體電路設計實習"], [], 1),
  node("analog-ic", "類比 IC 與佈局", 4, "類比電路設計與實體佈局，國內薪資天花板最高的方向之一。", ["ic-basics"], ["類比積體電路設計與佈局實習"], [], 1),
  node("soc", "系統晶片整合", 4, "把處理器、記憶體與周邊整合為單一晶片。", ["mcu", "ic-basics"], ["系統晶片設計實習", "數位系統實習"], [], 1),
  node("iot-app", "AIoT 物聯網應用", 3, "感測、連線與雲端資料串接的完整鏈路。", ["mcu", "net-basics"], ["智慧物聯網應用實習", "感測資料融合", "智慧感測網路"], ["iPAS AIoT應用工程師"], 1),

  // --- 資料與智慧 ---
  node("sci-computing", "科學計算與數值方法", 2, "用程式解數學問題並評估數值誤差。", ["math-core", "prog-basics"], ["科學計算軟體實習", "數值方法"], [], 1),
  node("data-analysis", "資料分析與視覺化", 3, "清理資料、找出趨勢並說清楚限制。", ["prob-stat", "prog-basics"], ["巨量資料分析應用與實作", "科學計算軟體實習"], ["TQC+ 資料分析"], 1),
  node("ml-core", "機器學習", 3, "模型訓練、評估指標與過擬合處理。", ["prob-stat", "data-struct"], ["人工智慧", "計算智慧", "演化式計算"], ["iPAS AI應用規劃師", "iPAS 人工智慧"], 1),
  node("llm", "大型語言模型實務", 4, "提示設計、檢索增強與模型評估。", ["ml-core"], ["大型語言模型實務"], [], 1),
  node("dsp", "數位訊號處理", 3, "濾波、頻域分析與即時訊號處理。", ["comm-theory"], ["數位訊號處理器實習", "數位語音處理", "生醫訊號處理", "信號與系統"], [], 1),
  node("vision", "影像與視覺處理", 3, "影像增強、特徵擷取與視訊處理。", ["prog-basics", "math-core"], ["數位影像處理", "彩色視訊處理", "資料壓縮"], [], 1),
  node("graphics", "電腦圖學", 3, "3D 座標轉換、光影與即時算繪。", ["math-core", "prog-basics"], ["電腦圖學"], [], 1),
  node("emerging", "前瞻技術視野", 4, "量子計算與新興智慧科技的入門認識。", [], ["量子計算導論", "智慧科技應用專論"], [], 1),

  // --- 產品與實戰 ---
  node("proj-mgmt", "專案管理", 3, "範圍、時程與風險的取捨與溝通。", [], ["軟體專案管理"], ["PMP", "iPAS 專案管理", "Google Project Management"], 1),
  node("capstone", "實務專題", 4, "從題目定義到成果展示的完整交付。", [], ["實務專題", "電腦與通訊專案實習"], [], 1),
  node("internship", "職場實習經驗", 4, "在真實團隊裡完成一段被驗收的工作。", [], ["校外學期實習", "實務學期實習", "資通訊產業暑期實習", "工廠學期實務", "工廠學期實習"], [], 1),
];

const skillNodeMap = new Map(skillNodes.map(item => [item.id, item]));

export function getSkillNode(id: string): SkillNode | undefined {
  return skillNodeMap.get(id);
}

/* ------------------------------------------------------------------ */
/* 職涯路線                                                            */
/* ------------------------------------------------------------------ */

const onet = (code: string, label: string) => ({
  label: `O*NET｜${label}`,
  url: `https://www.onetonline.org/link/summary/${code}`,
});

export const careerTracks: CareerTrack[] = [
  {
    id: "frontend",
    title: "前端工程師",
    shortTitle: "前端",
    domain: "軟體開發",
    description: "打造使用者直接操作的介面，重視互動品質與跨裝置體驗。",
    nodeIds: ["prog-basics", "web-frontend", "ui-ux", "data-struct", "oop", "backend-api", "sw-eng", "cloud", "capstone"],
    coreNodeIds: ["prog-basics", "web-frontend", "ui-ux", "data-struct", "sw-eng", "capstone"],
    evidence: onet("15-1254.00", "Web Developers"),
  },
  {
    id: "backend",
    title: "後端工程師",
    shortTitle: "後端",
    domain: "軟體開發",
    description: "設計伺服器邏輯、資料儲存與 API，撐住系統的正確性與規模。",
    nodeIds: ["prog-basics", "data-struct", "oop", "db-core", "os-core", "backend-api", "cloud", "sw-eng", "security", "capstone"],
    coreNodeIds: ["prog-basics", "data-struct", "db-core", "os-core", "backend-api", "sw-eng"],
    evidence: onet("15-1252.00", "Software Developers"),
  },
  {
    id: "mobile",
    title: "行動應用工程師",
    shortTitle: "行動",
    domain: "軟體開發",
    description: "在手機與平板平台上完成可上架、可維護的應用程式。",
    nodeIds: ["prog-basics", "oop", "mobile-dev", "ui-ux", "backend-api", "db-core", "sw-eng", "capstone"],
    coreNodeIds: ["prog-basics", "oop", "mobile-dev", "ui-ux", "sw-eng"],
    evidence: onet("15-1252.00", "Software Developers"),
  },
  {
    id: "embedded",
    title: "嵌入式／韌體工程師",
    shortTitle: "韌體",
    domain: "硬體與晶片",
    description: "在資源受限的硬體上寫程式，直接控制感測器與周邊裝置。",
    nodeIds: ["prog-basics", "circuit-basics", "digital-logic", "mcu", "os-core", "iot-app", "soc", "capstone"],
    coreNodeIds: ["prog-basics", "circuit-basics", "digital-logic", "mcu", "os-core"],
    evidence: onet("17-2061.00", "Computer Hardware Engineers"),
  },
  {
    id: "ic-design",
    title: "IC 設計工程師",
    shortTitle: "IC",
    domain: "硬體與晶片",
    description: "設計與驗證晶片電路，台灣半導體產業需求最集中的方向。",
    nodeIds: ["circuit-basics", "digital-logic", "math-core", "ic-basics", "vlsi", "analog-ic", "soc", "capstone"],
    coreNodeIds: ["circuit-basics", "digital-logic", "ic-basics", "vlsi", "capstone"],
    evidence: onet("17-2072.00", "Electronics Engineers"),
  },
  {
    id: "rf-antenna",
    title: "射頻／天線工程師",
    shortTitle: "射頻",
    domain: "硬體與晶片",
    description: "處理高頻電路與天線，在手機、車用與衛星通訊都用得上。",
    nodeIds: ["circuit-basics", "math-core", "comm-theory", "rf-microwave", "antenna", "wireless", "capstone"],
    coreNodeIds: ["circuit-basics", "math-core", "rf-microwave", "antenna"],
    evidence: onet("17-2072.00", "Electronics Engineers"),
  },
  {
    id: "network",
    title: "網路工程師",
    shortTitle: "網路",
    domain: "網路與通訊",
    description: "規劃與維運網路架構，確保連線的效能、穩定與可觀測性。",
    nodeIds: ["net-basics", "os-core", "net-advanced", "security", "cloud", "wireless", "internship"],
    coreNodeIds: ["net-basics", "os-core", "net-advanced", "security"],
    evidence: onet("15-1244.00", "Network and Computer Systems Administrators"),
  },
  {
    id: "security",
    title: "資安工程師",
    shortTitle: "資安",
    domain: "網路與通訊",
    description: "找出並修補系統弱點，建立監控與事件應變流程。",
    nodeIds: ["prog-basics", "net-basics", "os-core", "security", "net-advanced", "cloud", "capstone"],
    coreNodeIds: ["prog-basics", "net-basics", "os-core", "security"],
    evidence: onet("15-1212.00", "Information Security Analysts"),
  },
  {
    id: "cloud-devops",
    title: "雲端／DevOps 工程師",
    shortTitle: "雲端",
    domain: "軟體開發",
    description: "把服務自動化部署到雲端，並負責可靠度與成本。",
    nodeIds: ["prog-basics", "os-core", "net-basics", "cloud", "sw-eng", "security", "db-core", "internship"],
    coreNodeIds: ["prog-basics", "os-core", "net-basics", "cloud", "sw-eng"],
    evidence: onet("15-1241.00", "Computer Network Architects"),
  },
  {
    id: "data-analyst",
    title: "資料分析師",
    shortTitle: "資料",
    domain: "資料與智慧",
    description: "從資料中找出可行動的結論，並誠實說明限制。",
    nodeIds: ["prog-basics", "prob-stat", "db-core", "data-analysis", "sci-computing", "ml-core", "english-pro", "capstone"],
    coreNodeIds: ["prog-basics", "prob-stat", "db-core", "data-analysis"],
    evidence: onet("15-2051.00", "Data Scientists"),
  },
  {
    id: "ai-ml",
    title: "AI／機器學習工程師",
    shortTitle: "AI",
    domain: "資料與智慧",
    description: "訓練與部署模型，是目前國內外需求成長最快的職務之一。",
    nodeIds: ["prog-basics", "math-core", "prob-stat", "data-struct", "ml-core", "llm", "vision", "data-analysis", "cloud", "capstone"],
    coreNodeIds: ["prog-basics", "math-core", "prob-stat", "ml-core", "data-analysis"],
    evidence: onet("15-2051.00", "Data Scientists"),
  },
  {
    id: "iot",
    title: "AIoT／物聯網工程師",
    shortTitle: "AIoT",
    domain: "網路與通訊",
    description: "串起感測器、通訊與雲端，把實體世界的資料變成服務。",
    nodeIds: ["prog-basics", "circuit-basics", "mcu", "net-basics", "iot-app", "wireless", "cloud", "ml-core", "capstone"],
    coreNodeIds: ["prog-basics", "mcu", "net-basics", "iot-app"],
    evidence: onet("17-2061.00", "Computer Hardware Engineers"),
  },
  {
    id: "dsp-media",
    title: "訊號與影像處理工程師",
    shortTitle: "訊號",
    domain: "資料與智慧",
    description: "處理聲音、影像與感測訊號，在醫電、影音與車用領域都有需求。",
    nodeIds: ["math-core", "comm-theory", "dsp", "vision", "sci-computing", "ml-core", "capstone"],
    coreNodeIds: ["math-core", "comm-theory", "dsp", "vision"],
    evidence: onet("17-2072.00", "Electronics Engineers"),
  },
  {
    id: "graphics-game",
    title: "圖形／遊戲工程師",
    shortTitle: "圖形",
    domain: "軟體開發",
    description: "即時算繪與互動體驗，橫跨遊戲、XR 與視覺化。",
    nodeIds: ["prog-basics", "math-core", "data-struct", "graphics", "ui-ux", "vision", "capstone"],
    coreNodeIds: ["prog-basics", "math-core", "graphics", "data-struct"],
    evidence: onet("15-1255.00", "Web and Digital Interface Designers"),
  },
  {
    id: "product",
    title: "產品／專案管理",
    shortTitle: "產品",
    domain: "產品與研究",
    description: "定義問題、排優先級並推動跨職能團隊交付成果。",
    nodeIds: ["ui-ux", "proj-mgmt", "data-analysis", "english-pro", "oop", "capstone", "internship"],
    coreNodeIds: ["ui-ux", "proj-mgmt", "data-analysis", "english-pro", "capstone"],
    evidence: onet("13-1082.00", "Project Management Specialists"),
  },
  {
    id: "research",
    title: "研究與深造",
    shortTitle: "研究",
    domain: "產品與研究",
    description: "建立研究設計與論證能力，銜接碩博士或研發單位。",
    nodeIds: ["math-core", "prob-stat", "sci-computing", "ml-core", "dsp", "emerging", "english-pro", "capstone"],
    coreNodeIds: ["math-core", "prob-stat", "sci-computing", "english-pro", "capstone"],
    evidence: onet("15-1221.00", "Computer and Information Research Scientists"),
  },
];

const careerTrackMap = new Map(careerTracks.map(item => [item.id, item]));

export function getCareerTrack(id: CareerTrackId): CareerTrack | undefined {
  return careerTrackMap.get(id);
}

export function getCareerTracksByDomain(): Array<{
  domain: CareerTrackDomain;
  tracks: CareerTrack[];
}> {
  const order: CareerTrackDomain[] = ["軟體開發", "硬體與晶片", "網路與通訊", "資料與智慧", "產品與研究"];
  return order.map(domain => ({
    domain,
    tracks: careerTracks.filter(track => track.domain === domain),
  }));
}

/* ------------------------------------------------------------------ */
/* 解鎖判定                                                            */
/* ------------------------------------------------------------------ */

export type SkillNodeState = "unlocked" | "in-progress" | "available" | "locked";

export const skillNodeStateLabel: Record<SkillNodeState, string> = {
  unlocked: "已點亮",
  "in-progress": "規劃中",
  available: "可挑戰",
  locked: "未解鎖",
};

export type EvaluatedSkillNode = SkillNode & {
  state: SkillNodeState;
  /** 已修過且及格、可採計於本節點的課程名稱。 */
  matchedCourses: string[];
  /** 已列入規劃表、尚未完成的課程名稱。 */
  plannedCourses: string[];
  /** 已取得、可採計於本節點的證照名稱。 */
  matchedCertifications: string[];
  /** 還差幾門課；若已由證照點亮則為 0。 */
  remainingCourseCount: number;
  /** 尚未點亮的前置節點名稱。 */
  missingPrerequisites: string[];
};

export type CareerTreeEvaluation = {
  track: CareerTrack;
  nodes: EvaluatedSkillNode[];
  /** 依 tier 分組，方便畫成一層一層的技能樹。 */
  tiers: Array<{ tier: SkillTier; label: string; nodes: EvaluatedSkillNode[] }>;
  unlockedCount: number;
  totalCount: number;
  /** 核心節點完成百分比（0–100）。 */
  progress: number;
  earnedXp: number;
  totalXp: number;
  /** 下一步建議：已可挑戰、且前置最少的節點。 */
  nextNodes: EvaluatedSkillNode[];
};

/**
 * 以深度優先走訪排出解析順序，確保每個節點都在其前置節點之後被判定。
 * 同層相依（例如「數位邏輯」依賴同為基礎層的「電路基礎」）也能正確處理；
 * 若資料出現循環相依，該節點會被排在後方而非造成無窮遞迴。
 */
function topologicalOrder(nodeIds: string[], scope: Set<string>): SkillNode[] {
  const ordered: SkillNode[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id) || visiting.has(id)) return;
    const item = skillNodeMap.get(id);
    if (!item) return;
    visiting.add(id);
    for (const dependency of item.dependsOn) {
      if (scope.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(item);
  };

  nodeIds.forEach(visit);
  return ordered;
}

export type CareerTreeInput = {
  courses: CourseRecord[];
  achievements?: AchievementRecord[];
  /** 課程規劃表中的課名；只影響 in-progress 顯示，不會點亮節點。 */
  plannedCourseNames?: string[];
};

/**
 * 計算一條職涯路線上每個技能節點的狀態。
 *
 * 點亮條件：前置節點全部點亮，且（修滿指定門數的對應課程 或 取得任一張對應證照）。
 * 「規劃中」只是提示，不會點亮節點——避免把還沒修的課當成已具備的能力。
 */
export function evaluateCareerTree(
  trackId: CareerTrackId,
  input: CareerTreeInput
): CareerTreeEvaluation {
  const track = getCareerTrack(trackId) ?? careerTracks[0];
  const earnedCourseNames = input.courses.filter(isCourseEarned).map(course => course.name);
  const plannedNames = input.plannedCourseNames ?? [];
  const earnedCertNames = (input.achievements ?? []).filter(isCertificationEarned).map(record => record.title);

  const trackNodeIds = new Set(track.nodeIds);
  const resolved = new Map<string, EvaluatedSkillNode>();

  const ordered = topologicalOrder(track.nodeIds, trackNodeIds);

  for (const item of ordered) {
    const matchedCourses = earnedCourseNames.filter(name =>
      item.courses.some(requirement => nameMatches(requirement, name))
    );
    const plannedCourses = plannedNames.filter(
      name =>
        item.courses.some(requirement => nameMatches(requirement, name)) &&
        !matchedCourses.some(done => normalizeName(done) === normalizeName(name))
    );
    const matchedCertifications = earnedCertNames.filter(name =>
      item.certifications.some(requirement => nameMatches(requirement, name))
    );

    // 只計算同一路線內的前置節點；跨路線的前置不擋住這條路線的進度。
    const prerequisites = item.dependsOn.filter(id => trackNodeIds.has(id));
    const missingPrerequisites = prerequisites
      .filter(id => resolved.get(id)?.state !== "unlocked")
      .map(id => skillNodeMap.get(id)?.name ?? id);

    const requirementMet =
      matchedCertifications.length > 0 || matchedCourses.length >= item.requiredCourseCount;
    const prerequisitesMet = missingPrerequisites.length === 0;

    let state: SkillNodeState;
    if (prerequisitesMet && requirementMet) state = "unlocked";
    else if (!prerequisitesMet) state = "locked";
    else if (plannedCourses.length > 0 || matchedCourses.length > 0) state = "in-progress";
    else state = "available";

    resolved.set(item.id, {
      ...item,
      state,
      matchedCourses,
      plannedCourses,
      matchedCertifications,
      remainingCourseCount: requirementMet
        ? 0
        : Math.max(0, item.requiredCourseCount - matchedCourses.length),
      missingPrerequisites,
    });
  }

  const nodes = track.nodeIds
    .map(id => resolved.get(id))
    .filter((item): item is EvaluatedSkillNode => Boolean(item));

  const unlockedCount = nodes.filter(item => item.state === "unlocked").length;
  const coreNodes = nodes.filter(item => track.coreNodeIds.includes(item.id));
  const coreUnlocked = coreNodes.filter(item => item.state === "unlocked").length;
  const progress = coreNodes.length
    ? Math.round((coreUnlocked / coreNodes.length) * 100)
    : 0;

  const tierOrder: SkillTier[] = [1, 2, 3, 4];
  const tiers = tierOrder
    .map(tier => ({
      tier,
      label: skillTierLabel[tier],
      nodes: nodes.filter(item => item.tier === tier),
    }))
    .filter(group => group.nodes.length > 0);

  const nextNodes = nodes
    .filter(item => item.state === "available" || item.state === "in-progress")
    .sort(
      (a, b) =>
        Number(track.coreNodeIds.includes(b.id)) - Number(track.coreNodeIds.includes(a.id)) ||
        a.tier - b.tier ||
        a.remainingCourseCount - b.remainingCourseCount
    )
    .slice(0, 3);

  return {
    track,
    nodes,
    tiers,
    unlockedCount,
    totalCount: nodes.length,
    progress,
    earnedXp: nodes.reduce((sum, item) => sum + (item.state === "unlocked" ? item.xp : 0), 0),
    totalXp: nodes.reduce((sum, item) => sum + item.xp, 0),
    nextNodes,
  };
}

/** 一次比較所有路線的完成度，用來回答「我現在最接近哪個職涯」。 */
export function rankCareerTracks(input: CareerTreeInput): Array<{
  track: CareerTrack;
  progress: number;
  unlockedCount: number;
  totalCount: number;
}> {
  return careerTracks
    .map(track => {
      const result = evaluateCareerTree(track.id, input);
      return {
        track,
        progress: result.progress,
        unlockedCount: result.unlockedCount,
        totalCount: result.totalCount,
      };
    })
    .sort((a, b) => b.progress - a.progress || b.unlockedCount - a.unlockedCount);
}
