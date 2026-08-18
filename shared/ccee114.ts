import type { CareerPath, CourseCategory, CourseRecord } from "./academic";

export type Ccee114CourseGroup = "系必修" | "大二核心" | "大三核心" | "大一二專業實習" | "大三專業實習" | "職場實習" | "其他選修" | "電腦與資訊" | "通訊與電子" | "網路與多媒體";
export type Ccee114RequirementId = "year2-core" | "year3-core" | "year12-lab" | "year3-lab";

export type Ccee114CourseEntry = {
  id: string;
  name: string;
  credits: number;
  recommendedTerm: string;
  category: CourseCategory;
  group: Ccee114CourseGroup;
  requirement?: Ccee114RequirementId;
  prerequisite?: { name: string; minNumericScore: number };
  skills: string[];
  careerFit: Record<CareerPath, number>;
  description: string;
};

const fit = (frontend: number, data: number, product: number, research: number): Record<CareerPath, number> => ({ frontend, data, product, research });
const required = (id: string, name: string, credits: number, recommendedTerm: string, skills: string[], description: string): Ccee114CourseEntry => ({ id, name, credits, recommendedTerm, category: "required", group: "系必修", skills, careerFit: fit(58, 58, 45, 60), description });
const elective = (id: string, name: string, credits: number, recommendedTerm: string, group: Ccee114CourseGroup, skills: string[], careerFit: Record<CareerPath, number>, description: string, requirement?: Ccee114RequirementId, prerequisite?: Ccee114CourseEntry["prerequisite"]): Ccee114CourseEntry => ({ id, name, credits, recommendedTerm, category: "elective", group, skills, careerFit, description, ...(requirement ? { requirement } : {}), ...(prerequisite ? { prerequisite } : {}) });

/**
 * 高科大電通系四技 114 入學規劃表明列的系專業課程；課程地圖只用於規劃，不代表當期開課。
 * 資料來源：官方 114 課程結構規劃表第 2–3 頁。
 */
export const ccee114CourseMap: readonly Ccee114CourseEntry[] = [
  required("programming-1", "計算機程式設計(一)", 3, "114-1", ["程式邏輯", "Git"], "程式設計基礎。"),
  required("calculus-1", "微積分(一)", 3, "114-1", ["數學建模"], "工程數學基礎。"),
  required("physics-1", "物理(一)", 3, "114-1", ["工程物理"], "工程物理基礎。"),
  required("communication-intro", "通訊導論", 3, "114-1", ["通訊系統"], "通訊工程入門。"),
  required("internet-design-lab", "網際網路設計實習", 1, "114-1", ["網路", "實作"], "網路實作基礎。"),
  required("electrical-lab-1", "基礎電工實習(一)", 1, "114-1", ["電路實作"], "電工量測基礎。"),
  required("programming-2", "計算機程式設計(二)", 3, "114-2", ["程式設計", "演算法"], "進階程式設計。"),
  required("calculus-2", "微積分(二)", 3, "114-2", ["數學建模"], "工程數學延伸。"),
  required("physics-2", "物理(二)", 3, "114-2", ["工程物理"], "工程物理延伸。"),
  required("multimedia-network-intro", "多媒體與網路導論", 3, "114-2", ["網路", "多媒體"], "網路與多媒體系統入門。"),
  required("ccee-english", "電腦與通訊英語", 3, "114-2", ["專業英文", "溝通表達"], "電通專業英文。"),
  required("programming-lab", "程式設計實習", 1, "114-2", ["程式設計", "實作"], "程式設計實作。"),
  required("circuits-1", "電路學(一)", 3, "115-1", ["電路分析"], "電路分析基礎。"),
  required("digital-design", "數位設計", 3, "115-1", ["數位系統"], "數位邏輯設計。"),
  required("digital-design-lab", "數位設計實習", 1, "115-1", ["數位系統", "實作"], "數位設計實作。"),
  required("electronics", "電子電路", 3, "115-2", ["電子電路"], "電子電路基礎。"),
  required("electronics-lab", "電子電路實習", 1, "115-2", ["電子電路", "實作"], "電子電路實作。"),
  required("probability", "機率", 3, "115-2", ["機率", "統計"], "隨機系統基礎。"),
  required("capstone-1", "實務專題(一)", 2, "116-1", ["專題管理", "溝通表達"], "專題規劃與實作。"),
  required("microprocessor", "微處理器應用", 3, "116-1", ["嵌入式系統"], "微處理器應用。"),
  required("capstone-2", "實務專題(二)", 2, "116-2", ["專題管理", "整合實作"], "專題成果整合。"),

  elective("data-structures", "資料結構", 3, "115-1", "大二核心", ["資料結構", "演算法"], fit(82, 82, 48, 68), "大二核心；建立程式資料組織能力。", "year2-core"),
  elective("linear-algebra", "線性代數", 3, "115-1", "大二核心", ["線性代數", "數學建模"], fit(28, 88, 30, 88), "大二核心；資料與通訊分析的數學基礎。", "year2-core"),
  elective("differential-equations", "微分方程", 3, "115-1", "大二核心", ["數學建模"], fit(20, 62, 25, 86), "大二核心；連續系統建模基礎。", "year2-core"),
  elective("discrete-math", "離散數學", 3, "115-1", "大二核心", ["離散數學", "演算法"], fit(78, 74, 35, 78), "大二核心；演算法與計算理論基礎。", "year2-core"),
  elective("assembly", "組合語言", 3, "115-1", "大二核心", ["系統程式", "嵌入式系統"], fit(56, 44, 24, 70), "大二核心；低階系統基礎。", "year2-core"),

  elective("electrical-lab-2", "基礎電工實習(二)", 1, "115-1", "大一二專業實習", ["電路實作"], fit(32, 32, 22, 42), "大一二專業實習。", "year12-lab"),
  elective("scientific-computing-lab", "科學計算軟體實習", 1, "115-2", "大一二專業實習", ["科學計算", "資料處理"], fit(48, 72, 32, 75), "大一二專業實習。", "year12-lab"),
  elective("operating-systems-lab", "作業系統實習", 1, "115-2", "大一二專業實習", ["作業系統", "實作"], fit(72, 38, 26, 52), "大一二專業實習。", "year12-lab"),
  elective("data-structures-lab", "資料結構實習", 1, "115-2", "大一二專業實習", ["資料結構", "演算法"], fit(75, 72, 35, 62), "大一二專業實習。", "year12-lab"),
  elective("iot-lab", "智慧物聯網應用實習", 1, "115-2", "大一二專業實習", ["物聯網", "嵌入式系統"], fit(58, 55, 36, 58), "大一二專業實習。", "year12-lab"),
  elective("oo-analysis-lab", "物件導向系統分析實習", 1, "115-2", "大一二專業實習", ["系統分析", "軟體工程"], fit(86, 42, 82, 50), "大一二專業實習。", "year12-lab"),

  elective("communication-lab", "通訊實習", 1, "116-1", "大三專業實習", ["通訊系統", "實作"], fit(35, 45, 24, 78), "大三專業實習。", "year3-lab"),
  elective("mobile-os-lab", "行動裝置作業系統應用實習", 1, "116-1", "大三專業實習", ["行動系統", "實作"], fit(74, 36, 42, 44), "大三專業實習。", "year3-lab"),
  elective("windows-programming-lab", "視窗程式應用設計實習", 1, "116-1", "大三專業實習", ["應用程式開發", "UI/UX"], fit(85, 28, 56, 28), "大三專業實習。", "year3-lab"),
  elective("digital-systems-lab", "數位系統實習", 1, "116-2", "大三專業實習", ["數位系統", "實作"], fit(54, 38, 24, 64), "大三專業實習。", "year3-lab"),
  elective("microprocessor-lab", "微處理器實習", 1, "116-2", "大三專業實習", ["嵌入式系統", "實作"], fit(56, 42, 26, 68), "大三專業實習。", "year3-lab"),
  elective("microwave-component-lab", "微波元件實習", 1, "116-2", "大三專業實習", ["微波", "實作"], fit(18, 30, 18, 92), "官方擋修：電磁學須達 40 分。", "year3-lab", { name: "電磁學", minNumericScore: 40 }),
  elective("antenna-design-lab", "天線設計實習", 1, "116-2", "大三專業實習", ["天線", "實作"], fit(18, 32, 18, 92), "大三專業實習。", "year3-lab"),

  elective("summer-industry-internship", "資通訊產業暑期實習", 2, "116-2", "職場實習", ["產業實習", "職涯探索"], fit(55, 55, 65, 50), "官方職場實習選修。"),
  elective("offcampus-internship-1", "校外學期實習(一)", 3, "117-1", "職場實習", ["產業實習", "職涯探索"], fit(60, 60, 70, 55), "官方職場實習選修。"),
  elective("offcampus-internship-2", "校外學期實習(二)", 3, "117-2", "職場實習", ["產業實習", "職涯探索"], fit(60, 60, 70, 55), "官方職場實習選修。"),
  elective("factory-practicum-1", "工廠學期實務(一)", 3, "117-1", "職場實習", ["產業實習", "製程實務"], fit(42, 45, 52, 48), "官方職場實習選修。"),
  elective("factory-practicum-2", "工廠學期實習(二)", 3, "117-2", "職場實習", ["產業實習", "製程實務"], fit(42, 45, 52, 48), "官方職場實習選修。"),
  elective("practical-semester-1", "實務學期實習(一)", 3, "117-1", "職場實習", ["產業實習", "實務整合"], fit(55, 55, 65, 55), "官方職場實習選修。"),
  elective("practical-semester-2", "實務學期實習(二)", 3, "117-2", "職場實習", ["產業實習", "實務整合"], fit(55, 55, 65, 55), "官方職場實習選修。"),
  elective("ccee-project-internship-1", "電腦與通訊專案實習(一)", 2, "117-1", "職場實習", ["專案實作", "協作"], fit(75, 62, 80, 62), "官方職場實習選修。"),
  elective("ccee-project-internship-2", "電腦與通訊專案實習(二)", 2, "117-2", "職場實習", ["專案實作", "協作"], fit(75, 62, 80, 62), "官方職場實習選修。"),
  elective("calculus-practice-1", "微積分演習(一)", 1, "114-1", "其他選修", ["微積分", "數學建模"], fit(25, 55, 22, 65), "官方其他專業選修。"),
  elective("calculus-practice-2", "微積分演習(二)", 1, "114-2", "其他選修", ["微積分", "數學建模"], fit(25, 55, 22, 65), "官方其他專業選修。"),

  elective("digital-electronics", "數位電子電路", 3, "116-1", "大三核心", ["數位系統", "電子電路"], fit(48, 42, 24, 82), "大三核心。", "year3-core"),
  elective("random-statistics", "隨機變數與統計", 3, "116-1", "大三核心", ["統計", "機率"], fit(32, 92, 42, 92), "大三核心。", "year3-core"),
  elective("signals-systems", "信號與系統", 3, "116-1", "大三核心", ["信號處理", "系統分析"], fit(28, 68, 25, 94), "大三核心。", "year3-core"),
  elective("communication-principles", "通訊原理", 3, "116-1", "大三核心", ["通訊系統"], fit(28, 52, 22, 94), "大三核心。", "year3-core"),
  elective("algorithms", "演算法", 3, "116-1", "大三核心", ["演算法", "程式設計"], fit(90, 85, 45, 78), "大三核心。", "year3-core"),
  elective("electromagnetics", "電磁學", 3, "116-1", "大三核心", ["電磁學"], fit(18, 35, 18, 98), "大三核心；微波元件實習的官方擋修前提。", "year3-core"),
  elective("big-data", "巨量資料分析應用與實作", 3, "116-1", "大三核心", ["資料分析", "資料處理"], fit(50, 98, 58, 76), "大三核心。", "year3-core"),

  elective("operating-systems", "作業系統應用", 3, "115-1", "電腦與資訊", ["作業系統", "系統程式"], fit(86, 50, 34, 65), "電腦與資訊領域選修。"),
  elective("windows-programming", "視窗程式設計", 3, "115-1", "電腦與資訊", ["應用程式開發", "UI/UX"], fit(88, 34, 52, 32), "電腦與資訊領域選修。"),
  elective("cloud-computing", "雲端運算", 3, "116-1", "電腦與資訊", ["雲端", "部署"], fit(88, 58, 46, 55), "電腦與資訊領域選修。"),
  elective("system-programming", "系統程式", 3, "116-1", "電腦與資訊", ["系統程式", "作業系統"], fit(82, 42, 28, 70), "電腦與資訊領域選修。"),
  elective("software-engineering", "軟體工程", 3, "116-1", "電腦與資訊", ["軟體工程", "協作"], fit(88, 50, 82, 55), "電腦與資訊領域選修。"),
  elective("smart-tech", "智慧科技應用專論", 3, "116-1", "電腦與資訊", ["智慧科技", "跨域應用"], fit(60, 70, 72, 65), "電腦與資訊領域選修。"),
  elective("numerical-methods", "數值方法", 3, "116-1", "電腦與資訊", ["數值分析", "科學計算"], fit(25, 75, 24, 90), "電腦與資訊領域選修。"),
  elective("database-systems", "資料庫系統", 3, "116-2", "電腦與資訊", ["資料庫", "SQL"], fit(76, 96, 65, 58), "電腦與資訊領域選修。"),
  elective("system-analysis", "系統分析與設計", 3, "116-2", "電腦與資訊", ["系統分析", "需求工程"], fit(72, 46, 96, 54), "電腦與資訊領域選修。"),
  elective("evolutionary-computation", "演化式計算", 3, "116-2", "電腦與資訊", ["最佳化", "人工智慧"], fit(34, 88, 35, 88), "電腦與資訊領域選修。"),
  elective("quantum-computing", "量子計算導論", 3, "116-2", "電腦與資訊", ["量子計算", "研究方法"], fit(24, 62, 20, 98), "電腦與資訊領域選修。"),
  elective("computational-intelligence", "計算智慧", 3, "117-1", "電腦與資訊", ["人工智慧", "最佳化"], fit(42, 94, 45, 85), "電腦與資訊領域選修。"),
  elective("project-management", "軟體專案管理", 3, "117-1", "電腦與資訊", ["專案管理", "協作"], fit(62, 38, 98, 42), "電腦與資訊領域選修。"),
  elective("artificial-intelligence", "人工智慧", 3, "117-1", "電腦與資訊", ["人工智慧", "資料分析"], fit(46, 98, 55, 86), "電腦與資訊領域選修。"),
  elective("llm-practice", "大型語言模型實務", 3, "117-1", "電腦與資訊", ["大型語言模型", "人工智慧"], fit(62, 98, 65, 85), "電腦與資訊領域選修。"),
  elective("mobile-programming-lab", "行動裝置程式設計實習", 2, "117-2", "電腦與資訊", ["行動開發", "實作"], fit(88, 42, 50, 36), "電腦與資訊領域選修。"),

  elective("ic-design-intro", "積體電路設計導論", 3, "115-1", "通訊與電子", ["積體電路", "電子電路"], fit(25, 38, 22, 88), "通訊與電子領域選修。"),
  elective("electronic-circuit-design", "電子電路設計", 3, "116-1", "通訊與電子", ["電子電路", "電路設計"], fit(24, 38, 22, 90), "通訊與電子領域選修。"),
  elective("complex-variables", "複變數", 3, "116-2", "通訊與電子", ["數學建模"], fit(18, 48, 20, 92), "通訊與電子領域選修。"),
  elective("digital-signal-processor-lab", "數位訊號處理器實習", 2, "117-1", "通訊與電子", ["訊號處理", "實作"], fit(24, 62, 20, 92), "通訊與電子領域選修。"),
  elective("communication-system-design-lab", "通訊系統設計實習", 2, "117-1", "通訊與電子", ["通訊系統", "實作"], fit(22, 56, 20, 95), "通訊與電子領域選修。"),
  elective("digital-communication", "數位通訊理論", 3, "116-2", "通訊與電子", ["數位通訊"], fit(18, 50, 18, 98), "通訊與電子領域選修。"),
  elective("edge-computing", "行動邊緣計算", 3, "116-2", "通訊與電子", ["邊緣運算", "行動系統"], fit(60, 74, 42, 72), "通訊與電子領域選修。"),
  elective("mobile-communication", "個人與行動通訊系統", 3, "116-2", "通訊與電子", ["行動通訊"], fit(30, 56, 25, 96), "通訊與電子領域選修。"),
  elective("soc-design-lab", "系統晶片設計實習", 2, "116-2", "通訊與電子", ["系統晶片", "實作"], fit(22, 42, 18, 94), "通訊與電子領域選修。"),
  elective("stochastic-processes", "隨機過程", 3, "116-2", "通訊與電子", ["隨機過程", "統計"], fit(20, 78, 20, 98), "通訊與電子領域選修。"),
  elective("vlsi", "超大型積體電路設計", 3, "117-1", "通訊與電子", ["積體電路", "晶片設計"], fit(20, 36, 18, 98), "通訊與電子領域選修。"),
  elective("microwave-circuit-lab", "微波電路與系統實習", 2, "117-1", "通訊與電子", ["微波", "實作"], fit(16, 32, 16, 98), "通訊與電子領域選修。"),
  elective("vlsi-lab", "超大型積體電路設計實習", 2, "117-1", "通訊與電子", ["晶片設計", "實作"], fit(18, 36, 16, 98), "通訊與電子領域選修。"),
  elective("antenna-practice", "天線設計實務", 3, "117-1", "通訊與電子", ["天線", "通訊系統"], fit(18, 34, 18, 98), "通訊與電子領域選修。"),
  elective("5g", "5G行動通訊網路", 3, "117-1", "通訊與電子", ["5G", "行動通訊"], fit(30, 68, 32, 94), "通訊與電子領域選修。"),
  elective("next-gen-communication", "次世代通訊技術", 3, "117-1", "通訊與電子", ["通訊系統", "研究方法"], fit(25, 62, 24, 98), "通訊與電子領域選修。"),
  elective("analog-ic-lab", "類比積體電路設計與佈局實習", 2, "117-1", "通訊與電子", ["類比積體電路", "實作"], fit(16, 30, 16, 98), "通訊與電子領域選修。"),

  elective("computer-networks", "電腦網路", 3, "115-2", "網路與多媒體", ["電腦網路", "網路協定"], fit(92, 58, 48, 62), "官方擋修：多媒體與網路導論須達 60 分。", undefined, { name: "多媒體與網路導論", minNumericScore: 60 }),
  elective("data-compression", "資料壓縮", 3, "116-1", "網路與多媒體", ["資料壓縮", "多媒體"], fit(48, 76, 25, 78), "網路與多媒體領域選修。"),
  elective("digital-image", "數位影像處理", 3, "116-1", "網路與多媒體", ["影像處理", "多媒體"], fit(52, 85, 35, 82), "網路與多媒體領域選修。"),
  elective("digital-speech", "數位語音處理", 3, "116-1", "網路與多媒體", ["語音處理", "訊號處理"], fit(36, 76, 28, 86), "網路與多媒體領域選修。"),
  elective("color-video", "彩色視訊處理", 3, "116-1", "網路與多媒體", ["視訊處理", "多媒體"], fit(48, 78, 30, 85), "網路與多媒體領域選修。"),
  elective("network-security", "網路安全與資安監控", 3, "116-1", "網路與多媒體", ["資安", "網路"], fit(86, 55, 56, 75), "網路與多媒體領域選修。"),
  elective("sensor-fusion", "感測資料融合", 3, "116-1", "網路與多媒體", ["感測資料", "資料分析"], fit(46, 90, 42, 82), "網路與多媒體領域選修。"),
  elective("smart-sensor-network", "智慧感測網路", 3, "116-1", "網路與多媒體", ["物聯網", "網路"], fit(62, 76, 42, 78), "網路與多媒體領域選修。"),
  elective("broadband-network", "寬頻網路", 3, "116-1", "網路與多媒體", ["網路", "通訊系統"], fit(62, 55, 32, 86), "網路與多媒體領域選修。"),
  elective("computer-graphics", "電腦圖學", 3, "116-2", "網路與多媒體", ["電腦圖學", "視覺設計"], fit(88, 48, 50, 58), "網路與多媒體領域選修。"),
  elective("multimedia-design-lab", "多媒體設計實習", 2, "116-2", "網路與多媒體", ["多媒體", "實作"], fit(88, 48, 58, 50), "網路與多媒體領域選修。"),
  elective("cyber-attack-lab", "網路與資安攻防實習", 2, "116-2", "網路與多媒體", ["資安", "實作"], fit(90, 55, 52, 74), "網路與多媒體領域選修。"),
  elective("biomedical-signal", "生醫訊號處理", 3, "116-2", "網路與多媒體", ["生醫訊號", "資料分析"], fit(34, 88, 38, 90), "網路與多媒體領域選修。"),
];

export const ccee114RequirementDefinitions: ReadonlyArray<{ id: Ccee114RequirementId; label: string; requiredCourses: number; requiredCredits: number; detail: string }> = [
  { id: "year2-core", label: "大二核心", requiredCourses: 3, requiredCredits: 9, detail: "至少選修且及格 3 門、共 9 學分" },
  { id: "year3-core", label: "大三核心", requiredCourses: 3, requiredCredits: 9, detail: "至少選修且及格 3 門、共 9 學分" },
  { id: "year12-lab", label: "大一、大二專業實習", requiredCourses: 2, requiredCredits: 2, detail: "至少選修且及格 2 門、共 2 學分" },
  { id: "year3-lab", label: "大三專業實習", requiredCourses: 3, requiredCredits: 3, detail: "至少選修且及格 3 門、共 3 學分" },
];

type PlannedCourseLike = Pick<Ccee114CourseEntry, never> & { name: string; credits: number };
const normalizedName = (value: string) => value.trim().toLocaleLowerCase("zh-Hant");
const entryByName = new Map(ccee114CourseMap.map(entry => [normalizedName(entry.name), entry]));
const isPassed = (course: CourseRecord) => course.grade !== "F";

export function getCcee114RequirementProgress(completedCourses: CourseRecord[], plannedCourses: PlannedCourseLike[]) {
  const completedNames = new Set(completedCourses.filter(isPassed).map(course => normalizedName(course.name)));
  return ccee114RequirementDefinitions.map(definition => {
    const matchingCompleted = completedCourses.filter(course => isPassed(course) && entryByName.get(normalizedName(course.name))?.requirement === definition.id);
    const matchingPlanned = plannedCourses.filter(course => !completedNames.has(normalizedName(course.name)) && entryByName.get(normalizedName(course.name))?.requirement === definition.id);
    const completedCredits = matchingCompleted.reduce((sum, course) => sum + course.credits, 0);
    const plannedCredits = matchingPlanned.reduce((sum, course) => sum + course.credits, 0);
    return {
      ...definition,
      completedCourses: matchingCompleted.length,
      completedCredits,
      plannedCourses: matchingPlanned.length,
      plannedCredits,
      remainingCourses: Math.max(0, definition.requiredCourses - matchingCompleted.length - matchingPlanned.length),
      remainingCredits: Math.max(0, definition.requiredCredits - completedCredits - plannedCredits),
    };
  });
}

export function getCcee114PrerequisiteAlerts(completedCourses: CourseRecord[], plannedCourses: PlannedCourseLike[]) {
  const completedByName = new Map(completedCourses.filter(isPassed).map(course => [normalizedName(course.name), course]));
  return plannedCourses.flatMap(course => {
    const entry = entryByName.get(normalizedName(course.name));
    if (!entry?.prerequisite) return [];
    const prerequisite = completedByName.get(normalizedName(entry.prerequisite.name));
    const satisfied = Boolean(prerequisite && typeof prerequisite.numericScore === "number" && prerequisite.numericScore >= entry.prerequisite.minNumericScore);
    return satisfied ? [] : [{ courseName: entry.name, prerequisiteName: entry.prerequisite.name, minNumericScore: entry.prerequisite.minNumericScore, reason: prerequisite ? `已找到 ${entry.prerequisite.name}，但需要已填入且達 ${entry.prerequisite.minNumericScore} 分的數字成績。` : `尚未找到已及格的 ${entry.prerequisite.name}。` }];
  });
}

export function getCcee114CourseEntry(name: string) {
  return entryByName.get(normalizedName(name));
}
