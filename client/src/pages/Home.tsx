import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarPlus,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Crown,
  Download,
  ExternalLink,
  FolderKanban,
  FileText,
  GraduationCap,
  Heart,
  Pencil,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NkustTimetableImportDialog } from "@/components/NkustTimetableImportDialog";
import { TranscriptImportDialogV2 } from "@/components/TranscriptImportDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { CareerTreePanel } from "@/components/CareerTreePanel";
import { IS_STATIC_MODE } from "@/staticMode";
import { careerTracks, type CareerTrackId } from "@shared/careerTree";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { decodeFragmentNumericScoreUpdate, decodeFragmentTranscriptImport, mergeFragmentNumericScoreUpdate, mergeFragmentTranscriptImport } from "@shared/fragmentImport";
import { createLocalBackup, parseLocalBackup } from "@shared/localBackup";
import { NOTION_EXAM_SYNC_LEDGER_URL } from "@shared/notionExamSync";
import { achievementRecordKindLabel, achievementRecordStatusLabel, isAchievementRecord, type AchievementEvidence, type AchievementMediaKind, type AchievementRecord, type AchievementRecordKind, type AchievementRecordStatus } from "@shared/achievementRecords";
import { createExamWorkspaces, examResourceKindLabel, getExamCountdown, getExamTasksForDate, normalizeExamWorkspace, updateExamDailyLog, type ExamDailyLog, type ExamResourceKind, type ExamWorkspace } from "@shared/examWorkspace";
import { createMedievalGuildWorkspaceProject, isWorkspaceProject, type WorkspaceProject, type WorkspaceTaskStatus, workspaceTaskStatusLabel } from "@shared/projectWorkspace";
import { ccee114CourseMap, ccee114RequirementDefinitions, getCcee114PrerequisiteAlerts, getCcee114RequirementProgress, type Ccee114CourseEntry, type Ccee114CourseGroup } from "@shared/ccee114";
import {
  buildCareerRecommendations,
  applyGraduationGoalTemplate,
  buildCcee114RequiredCoursePlanCsv,
  buildCoursePlanCalendar,
  buildCoursePlanCsv,
  buildNotionCoursePlanCsv,
  calculateCredits,
  calculatePlannedCredits,
  careerProfiles,
  ccee114CommonEducationTargets,
  ccee114GraduationGoals,
  createBlankAcademicStart,
  createCourseEditorDraft,
  defaultGraduationGoals,
  defaultRecommendationPreferences,
  calculateGpa,
  calculateNumericAverage,
  getAchievements,
  getAcademicSkills,
  getGradePoint,
  getLevel,
  getCreditPlanStatus,
  getCreditRecognitionSummary,
  getGeneralCreditRecognition,
  getCoursePlanSelectionState,
  getCcee114CommonEducationProgress,
  getCalendarReadyPlanCourses,
  getExportablePlanCourses,
  getTermGpas,
  getTermNumericAverages,
  getXp,
  migrateCceeCommonRequiredCourses,
  migrateUndeclaredRequiredCourses,
  normalizeTermRanks,
  gradeOptions,
  buildNkustTimetableTemplate,
  prepareNkustTimetableDraftImport,
  prepareNkustTimetableImport,
  prepareTranscriptImport,
  prepareTranscriptDraftImport,
  resolveAcademicHashNavigation,
  resolveInitialAcademicView,
  transcriptFieldLabels,
  type CourseCategory,
  type CourseRecord,
  type CareerPath,
  type CreditRecognition,
  type GradePointSystem,
  type GraduationGoals,
  type LetterGrade,
  type NkustPlannedCourseDraft,
  type NkustTimetableImportPreview,
  type ProjectRecord,
  type ProjectStatus,
  type RecommendationPreferences,
  type TranscriptImportPreview,
  type TranscriptField,
  type TranscriptFieldMap,
  type TermRank,
} from "@shared/academic";

type View = "plan" | "dashboard" | "grades" | "credits" | "quest" | "projects" | "exams" | "achievements" | "badges";

type PlannedCourse = {
  id: string;
  term: string;
  name: string;
  credits: number;
  category: CourseCategory;
  priority: "must" | "important" | "explore";
};

type QuestData = {
  courses: CourseRecord[];
  projects: ProjectRecord[];
  goals: GraduationGoals;
  system: "4.3";
  careerPath: CareerPath;
  careerTrackId: CareerTrackId;
  preferences: RecommendationPreferences;
  plannedCourses: PlannedCourse[];
  termRanks: Record<string, TermRank>;
  hasCompletedPlanIntro: boolean;
  workspaces: WorkspaceProject[];
  examWorkspaces: ExamWorkspace[];
  achievementRecords: AchievementRecord[];
};

type AiPlanningSection = Exclude<View, "plan" | "achievements" | "exams">;
type AiPlannerSnapshot = {
  gpa: number;
  gpaSystem: GradePointSystem;
  totalCredits: number;
  remainingCredits: number;
  semestersLeft: number;
  termTrend: { term: string; gpa: number }[];
  skills: string[];
  careerPath: string;
  preferences: { workload: string; category: string; projectStyle: string };
  courses: { name: string; term: string; credits: number; grade: string; category: string }[];
  projects: { name: string; status: string; tags: string[] }[];
  unlockedAchievements: number;
};
type AiAdvice = { title: string; overview: string; focus: string; actions: { label: string; reason: string; urgency: "now" | "next" | "later" }[]; caution: string };

const STORAGE_KEY = "campus-quest-save-v1";
const legacyDemoCourseIds = new Set(["c1", "c2", "c3", "c4", "c5"]);
const legacyDemoProjectIds = new Set(["p1", "p2"]);

const initialGoals: GraduationGoals = defaultGraduationGoals;

const emptyQuestData: QuestData = {
  ...createBlankAcademicStart(),
  careerPath: "frontend",
  careerTrackId: "frontend",
  preferences: defaultRecommendationPreferences,
  goals: initialGoals,
  plannedCourses: [],
  termRanks: {},
  hasCompletedPlanIntro: false,
  workspaces: [],
  examWorkspaces: [],
  achievementRecords: [],
};

const categoryLabel: Record<CourseCategory, string> = { required: "電通系必修", elective: "專業選修", common: "校內共同必修", general: "通識", "undeclared-required": "不分系必修" };
const recognitionLabel = { standard: "一般／系內", "approved-external": "外系已認列", pending: "待確認認列" } as Record<CreditRecognition, string>;
const recognitionTone: Record<CreditRecognition, string> = { standard: "border-[#58709d] bg-[#1e3458] text-[#d3e2ff]", "approved-external": "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]", pending: "border-[#f4c659] bg-[#4c4024] text-[#ffe797]", "gpa-only": "border-[#aa97ff] bg-[#40376f] text-[#ded6ff]" };
const statusLabel: Record<ProjectStatus, string> = { planning: "籌備中", active: "進行中", done: "已完成" };
const categoryTone: Record<CourseCategory, string> = { required: "bg-[#f4c659] text-[#18203b]", elective: "bg-[#8ec6ff] text-[#13223d]", common: "bg-[#d6a8ff] text-[#241a3b]", general: "bg-[#a9e6ba] text-[#132b29]", "undeclared-required": "bg-[#cf9bc9] text-[#2f1830]" };
const statusTone: Record<ProjectStatus, string> = { planning: "bg-[#687b9e]", active: "bg-[#6c55d9]", done: "bg-[#3b9a74]" };

const navItems: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "plan", label: "課程規劃", icon: BookOpen },
  { id: "dashboard", label: "冒險總覽", icon: Compass },
  { id: "grades", label: "成績卷軸", icon: ScrollText },
  { id: "credits", label: "學分地圖", icon: Target },
  { id: "quest", label: "智慧任務", icon: WandSparkles },
  { id: "projects", label: "專題工坊", icon: FolderKanban },
  { id: "exams", label: "考試計畫", icon: Clock3 },
  { id: "achievements", label: "證照與比賽", icon: Trophy },
  { id: "badges", label: "成就圖鑑", icon: Award },
];

const emptyCourse = (): Omit<CourseRecord, "id"> => ({ term: "114-2", name: "", credits: 3, grade: "A", category: "required", recognition: "standard" });
const emptyProject = (): Omit<ProjectRecord, "id"> => ({ name: "", description: "", tags: [], startDate: "2026-02", endDate: "2026-06", status: "planning" });
const emptyPlannedCourse = (): PlannedCourse => ({ id: crypto.randomUUID(), term: "", name: "", credits: 3, category: "required", priority: "must" });

function normalizeQuestData(parsed: Partial<QuestData>): QuestData {
  const restoredGoals = { ...initialGoals, ...(parsed.goals ?? {}) };
  const usesLegacyGenericGoals = restoredGoals.total === 128 && restoredGoals.required === 60 && restoredGoals.elective === 42 && restoredGoals.general === 26;
  return {
    courses: migrateUndeclaredRequiredCourses(migrateCceeCommonRequiredCourses(Array.isArray(parsed.courses) ? parsed.courses.filter(course => !legacyDemoCourseIds.has(course.id)) : [])),
    projects: Array.isArray(parsed.projects) ? parsed.projects.filter(project => !legacyDemoProjectIds.has(project.id)) : [],
    goals: usesLegacyGenericGoals ? { ...ccee114GraduationGoals, semestersLeft: restoredGoals.semestersLeft } : restoredGoals,
    system: "4.3",
    careerPath: careerProfiles.some(profile => profile.id === parsed.careerPath) ? parsed.careerPath as CareerPath : "frontend",
    careerTrackId: careerTracks.some(track => track.id === parsed.careerTrackId) ? parsed.careerTrackId as CareerTrackId : "frontend",
    preferences: {
      workload: parsed.preferences?.workload === "light" || parsed.preferences?.workload === "ambitious" ? parsed.preferences.workload : defaultRecommendationPreferences.workload,
      category: parsed.preferences?.category === "required" || parsed.preferences?.category === "elective" || parsed.preferences?.category === "general" ? parsed.preferences.category : defaultRecommendationPreferences.category,
      projectStyle: parsed.preferences?.projectStyle === "team" || parsed.preferences?.projectStyle === "research" ? parsed.preferences.projectStyle : defaultRecommendationPreferences.projectStyle,
    },
    plannedCourses: Array.isArray(parsed.plannedCourses) ? parsed.plannedCourses.filter((course): course is PlannedCourse => Boolean(course && typeof course.name === "string" && typeof course.term === "string" && Number.isFinite(course.credits) && (course.category === "required" || course.category === "elective" || course.category === "general" || course.category === "common" || course.category === "undeclared-required") && (course.priority === "must" || course.priority === "important" || course.priority === "explore"))) : [],
    termRanks: normalizeTermRanks(parsed.termRanks),
    hasCompletedPlanIntro: Boolean(parsed.hasCompletedPlanIntro),
    workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces.filter(isWorkspaceProject).map(project => ({ ...project, members: [], dailyLogs: Array.isArray(project.dailyLogs) ? project.dailyLogs : [] })) : [],
    examWorkspaces: Array.isArray(parsed.examWorkspaces) ? parsed.examWorkspaces.map(normalizeExamWorkspace).filter((workspace): workspace is ExamWorkspace => workspace !== null) : [],
    achievementRecords: Array.isArray(parsed.achievementRecords) ? parsed.achievementRecords.filter(isAchievementRecord) : [],
  };
}

function loadData(): QuestData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeQuestData(JSON.parse(saved) as Partial<QuestData>) : emptyQuestData;
  } catch {
    return emptyQuestData;
  }
}

function hasQuestData(data: QuestData) {
  return data.courses.length > 0 || data.projects.length > 0 || data.plannedCourses.length > 0 || data.workspaces.length > 0 || data.examWorkspaces.length > 0 || data.achievementRecords.length > 0 || Object.keys(data.termRanks).length > 0 || data.hasCompletedPlanIntro;
}

function courseMergeKey(course: Pick<CourseRecord, "term" | "name">) {
  return `${course.term.trim().toLocaleLowerCase("zh-Hant")}\u0000${course.name.trim().toLocaleLowerCase("zh-Hant")}`;
}

function mergeQuestData(cloud: QuestData, local: QuestData): QuestData {
  const localCourses = new Map(local.courses.map(course => [courseMergeKey(course), course]));
  const cloudCourses = cloud.courses.map(course => ({ ...course, ...localCourses.get(courseMergeKey(course)), note: localCourses.get(courseMergeKey(course))?.note ?? course.note }));
  const mergedCourses = [...cloudCourses, ...local.courses.filter(course => !cloudCourses.some(existing => courseMergeKey(existing) === courseMergeKey(course)))];
  const localProjects = new Map(local.projects.map(project => [project.id, project]));
  const mergedProjects = [...cloud.projects.map(project => ({ ...project, ...localProjects.get(project.id) })), ...local.projects.filter(project => !cloud.projects.some(existing => existing.id === project.id))];
  const localWorkspaces = new Map(local.workspaces.map(project => [project.id, project]));
  const mergedWorkspaces = [...cloud.workspaces.map(project => localWorkspaces.get(project.id) ?? project), ...local.workspaces.filter(project => !cloud.workspaces.some(existing => existing.id === project.id))];
  const localExamWorkspaces = new Map(local.examWorkspaces.map(workspace => [workspace.id, workspace]));
  const mergedExamWorkspaces = [...cloud.examWorkspaces.map(workspace => localExamWorkspaces.get(workspace.id) ?? workspace), ...local.examWorkspaces.filter(workspace => !cloud.examWorkspaces.some(existing => existing.id === workspace.id))];
  const localAchievementRecords = new Map(local.achievementRecords.map(record => [record.id, record]));
  const mergedAchievementRecords = [...cloud.achievementRecords.map(record => ({ ...record, ...localAchievementRecords.get(record.id) })), ...local.achievementRecords.filter(record => !cloud.achievementRecords.some(existing => existing.id === record.id))];
  const plannedKeys = new Set(cloud.plannedCourses.map(course => courseMergeKey(course)));
  return {
    ...cloud,
    courses: mergedCourses,
    projects: mergedProjects,
    plannedCourses: [...cloud.plannedCourses, ...local.plannedCourses.filter(course => !plannedKeys.has(courseMergeKey(course)))],
    termRanks: { ...cloud.termRanks, ...local.termRanks },
    workspaces: mergedWorkspaces,
    examWorkspaces: mergedExamWorkspaces,
    achievementRecords: mergedAchievementRecords,
    goals: hasQuestData(local) ? local.goals : cloud.goals,
    careerPath: hasQuestData(local) ? local.careerPath : cloud.careerPath,
    preferences: hasQuestData(local) ? local.preferences : cloud.preferences,
    hasCompletedPlanIntro: cloud.hasCompletedPlanIntro || local.hasCompletedPlanIntro,
  };
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Panel({ children, className = "", gold = false }: { children: React.ReactNode; className?: string; gold?: boolean }) {
  return <section className={`${gold ? "pixel-panel-gold" : "pixel-panel"} bg-[#1a2642] ${className}`}>{children}</section>;
}

function PanelTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-[#5d719b] px-5 py-4">
      <div>
        <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-wide text-[#fff8df]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function PixelButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`pixel-button pixel-corners inline-flex items-center justify-center gap-2 bg-[#31496f] px-4 py-2 text-sm font-bold text-[#fff8df] ${className}`} {...props}>{children}</button>;
}

function ProgressBar({ value, tone = "gold" }: { value: number; tone?: "gold" | "mint" | "violet" }) {
  return <div className={`pixel-progress ${tone === "gold" ? "" : tone}`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function PreferenceControls({ preferences, onChange }: { preferences: RecommendationPreferences; onChange: (next: RecommendationPreferences) => void }) {
  return <Panel className="mb-4 overflow-hidden animate-pop-in"><PanelTitle eyebrow="RECOMMENDATION PREFERENCES" title="推薦偏好設定" action={<WandSparkles className="text-[#f4c659]" />} /><div className="grid gap-3 p-4 md:grid-cols-3"><Field label="本學期負荷"><select value={preferences.workload} onChange={event => onChange({ ...preferences, workload: event.target.value as RecommendationPreferences["workload"] })} className="pixel-input w-full px-3 py-2.5"><option value="light">輕量 12–14 學分</option><option value="balanced">平衡 15–18 學分</option><option value="ambitious">挑戰 18+ 學分</option></select></Field><Field label="偏好課程類別"><select value={preferences.category} onChange={event => onChange({ ...preferences, category: event.target.value as RecommendationPreferences["category"] })} className="pixel-input w-full px-3 py-2.5"><option value="any">不限類別</option><option value="required">必修優先</option><option value="elective">選修優先</option><option value="general">通識優先</option></select></Field><Field label="專題取向"><select value={preferences.projectStyle} onChange={event => onChange({ ...preferences, projectStyle: event.target.value as RecommendationPreferences["projectStyle"] })} className="pixel-input w-full px-3 py-2.5"><option value="individual">個人作品集</option><option value="team">團隊協作</option><option value="research">研究／競賽</option></select></Field></div></Panel>;
}

const cceeGroupLabels: Record<Ccee114CourseGroup, string> = {
  "系必修": "系必修主線",
  "大二核心": "大二核心",
  "大三核心": "大三核心",
  "大一二專業實習": "大一／二專業實習",
  "大三專業實習": "大三專業實習",
  "職場實習": "職場實習",
  "其他選修": "其他選修",
  "電腦與資訊": "電腦與資訊",
  "通訊與電子": "通訊與電子",
  "網路與多媒體": "網路與多媒體",
};

function Ccee114CourseMapPanel({ completedCourses, plannedCourses, onAdd }: { completedCourses: CourseRecord[]; plannedCourses: PlannedCourse[]; onAdd: (course: Ccee114CourseEntry) => void }) {
  const [selectedGroup, setSelectedGroup] = useState<"all" | Ccee114CourseGroup>("all");
  const groups = ["all", ...Array.from(new Set(ccee114CourseMap.map(course => course.group)))] as Array<"all" | Ccee114CourseGroup>;
  const visibleCourses = selectedGroup === "all" ? ccee114CourseMap : ccee114CourseMap.filter(course => course.group === selectedGroup);
  const plannedNames = new Set([
    ...plannedCourses.map(course => course.name.trim().toLocaleLowerCase("zh-Hant")),
    ...completedCourses.filter(course => getGradePoint(course.grade, "4.0") > 0).map(course => course.name.trim().toLocaleLowerCase("zh-Hant")),
  ]);
  const requirementProgress = getCcee114RequirementProgress(completedCourses, plannedCourses);
  const prerequisiteAlerts = getCcee114PrerequisiteAlerts(completedCourses, plannedCourses);
  return <div className="space-y-4">
    <Panel gold className="overflow-hidden"><PanelTitle eyebrow="CCEE 114 COURSE MAP" title="電通系完整課程地圖" action={<GraduationCap className="text-[#f4c659]" />} /><div className="space-y-4 p-5"><p className="max-w-4xl text-sm leading-7 text-[#d5e0f2]">依電通系四技 114 課程結構收錄系必修、核心、專業實習與三大系專業選修領域。這裡<strong className="text-[#ffe797]">不判斷當期是否開課</strong>；按下加入後會直接寫入你的本機規劃，並以官方建議學期作為起點，之後仍可自行調整。</p><p className="border-l-4 border-[#74e2b1] bg-[#173b3b] px-3 py-2 text-xs leading-5 text-[#cef5e7]">同名課程一旦已規劃或已有通過成績，就會鎖定不可重複加入；不及格課程仍可規劃重修。官方擋修只會顯示提醒，實際選課仍以系所規定為準。</p><div className="flex flex-wrap gap-2">{groups.map(group => <button key={group} onClick={() => setSelectedGroup(group)} className={`border px-3 py-2 text-xs font-black transition ${selectedGroup === group ? "border-[#f4c659] bg-[#f4c659] text-[#172440]" : "border-[#56709c] bg-[#162744] text-[#c8d8f2] hover:border-[#8eb7ed]"}`}>{group === "all" ? `全部 ${ccee114CourseMap.length}` : cceeGroupLabels[group]}</button>)}</div></div></Panel>
    <div className="grid gap-4 lg:grid-cols-2">{requirementProgress.map(item => <Panel key={item.id} className="overflow-hidden"><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#fff8df]">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#adc0df]">{item.detail}</p></div><span className="border border-[#f4c659] bg-[#574a28] px-2 py-1 text-xs font-black text-[#ffe797]">缺 {item.remainingCourses} 門／{item.remainingCredits} 學分</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="border border-[#48618c] bg-[#14233d] p-3"><p className="text-[#9db2d4]">已完成</p><p className="mt-1 font-black text-[#74e2b1]">{item.completedCourses} 門／{item.completedCredits} 學分</p></div><div className="border border-[#48618c] bg-[#14233d] p-3"><p className="text-[#9db2d4]">已規劃</p><p className="mt-1 font-black text-[#bba8ff]">{item.plannedCourses} 門／{item.plannedCredits} 學分</p></div></div></div></Panel>)}</div>
    {prerequisiteAlerts.length > 0 && <Panel className="overflow-hidden"><PanelTitle eyebrow="PREREQUISITE ALERTS" title="官方擋修提醒" action={<ShieldCheck className="text-[#f4c659]" />} /><div className="space-y-2 p-5">{prerequisiteAlerts.map(alert => <div key={alert.courseName} className="border-l-4 border-[#f4c659] bg-[#4c4024] px-3 py-2 text-xs leading-5 text-[#ffe797]">{alert.courseName}：須先修 <b>{alert.prerequisiteName}</b> 且數字成績達 {alert.minNumericScore} 分。{alert.reason}</div>)}</div></Panel>}
    <Panel className="overflow-hidden"><PanelTitle eyebrow="SELECT FROM MAP" title={selectedGroup === "all" ? `全部官方系課程 · ${visibleCourses.length} 門` : `${cceeGroupLabels[selectedGroup]} · ${visibleCourses.length} 門`} action={<BookOpen className="text-[#74e2b1]" />} /><div className="max-h-[760px] overflow-y-auto p-4"><div className="grid gap-3 xl:grid-cols-2">{visibleCourses.map(course => { const alreadyPlanned = plannedNames.has(course.name.trim().toLocaleLowerCase("zh-Hant")); return <article key={course.id} className="border-2 border-[#405b87] bg-[#152540] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#fff8df]">{course.name}</p><p className="mt-1 text-xs text-[#a9bddb]">建議 {course.recommendedTerm} · {course.credits} 學分 · {cceeGroupLabels[course.group]}</p></div><span className={`shrink-0 border px-2 py-1 text-[10px] font-black ${course.category === "required" ? "border-[#f4c659] bg-[#594a28] text-[#ffe797]" : "border-[#8aaeff] bg-[#243d69] text-[#d5e5ff]"}`}>{course.category === "required" ? "必修" : "專業選修"}</span></div><p className="mt-3 min-h-10 text-xs leading-5 text-[#c4d3eb]">{course.description}</p><div className="mt-3 flex flex-wrap gap-1">{course.skills.map(skill => <span key={skill} className="border border-[#5873a1] bg-[#1b3154] px-2 py-1 text-[10px] text-[#d7e5ff]">{skill}</span>)}</div>{course.prerequisite && <p className="mt-3 border-l-4 border-[#f4c659] pl-2 text-[11px] leading-5 text-[#ffe797]">擋修：{course.prerequisite.name} ≥ {course.prerequisite.minNumericScore} 分</p>}<PixelButton disabled={alreadyPlanned} onClick={() => onAdd(course)} className={`mt-4 w-full ${alreadyPlanned ? "cursor-not-allowed bg-[#465a7d] opacity-70" : "bg-[#74e2b1] text-[#112b2d]"}`}>{alreadyPlanned ? "已在規劃中" : <><Plus size={15} /> 加入規劃</>}</PixelButton></article>; })}</div></div></Panel>
  </div>;
}

function CoursePlanView({ courses, completedCredits, plannedCredits, plannedRequiredCredits, goals, exportableCount, calendarReadyCount, exportNotice, onAdd, onUpdate, onRemove, onExportCsv, onExportNotionCsv, onOpenNotion, onExportCalendar, onComplete }: { courses: PlannedCourse[]; completedCredits: number; plannedCredits: number; plannedRequiredCredits: number; goals: GraduationGoals; exportableCount: number; calendarReadyCount: number; exportNotice: string | null; onAdd: () => void; onUpdate: (id: string, patch: Partial<PlannedCourse>) => void; onRemove: (id: string) => void; onExportCsv: () => void; onExportNotionCsv: () => void; onOpenNotion: () => void; onExportCalendar: () => void; onComplete: () => void }) {
  const priorityLabel: Record<PlannedCourse["priority"], string> = { must: "一定要修", important: "很想安排", explore: "還在考慮" };
  const priorityTone: Record<PlannedCourse["priority"], string> = { must: "border-[#f4c659] bg-[#594a28] text-[#ffe797]", important: "border-[#74e2b1] bg-[#24534a] text-[#c7f7dc]", explore: "border-[#a998ff] bg-[#473d82] text-[#e7dfff]" };
  const remainingTarget = Math.max(0, goals.total - completedCredits);
  return <div className="space-y-4 animate-pop-in">
    <Panel gold className="overflow-hidden"><div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)]"><span className="crest mx-auto flex h-16 w-16 items-center justify-center bg-[#f4c659] text-[#1d3153] shadow-[4px_4px_0_#080d1f] lg:mx-0"><BookOpen size={31} /></span><div><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">FIRST STEP · YOUR COURSE PLAN</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">先把你心中的課表寫下來</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#c9d7ee]">不用一次把大學四年排得很完整。先從你已知道、最想修，或覺得不能錯過的課開始；之後可以隨時回來修改。這份規劃只是一張幫你思考的地圖，不會被當成已完成的成績或學分。</p></div></div></Panel>
    <div className="grid gap-4 md:grid-cols-3"><SmallMetric label="已完成學分" value={`${completedCredits}`} /><SmallMetric label="目前規劃學分" value={`${plannedCredits}`} /><SmallMetric label="規劃中的必修" value={`${plannedRequiredCredits}`} /></div>
    <Panel className="overflow-hidden"><PanelTitle eyebrow="COURSE PLAN TABLE" title="我的修課規劃" action={<PixelButton onClick={onAdd} className="bg-[#f4c659] text-[#152544]"><Plus size={16} /> 加入一門課</PixelButton>} /><div className="p-4 sm:p-5">{courses.length === 0 ? <EmptyState icon={<BookOpen />} title="先從下一門想修的課開始" detail="例如填入下一學期的必修、想探索的選修，或只是暫時放進來比較的課。這裡沒有標準答案。" action={onAdd} /> : <><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="text-xs text-[#9caed0]"><tr><th className="pb-2 pl-2">預計學期</th><th className="pb-2">課程名稱</th><th className="pb-2 text-center">學分</th><th className="pb-2">類別</th><th className="pb-2">優先程度</th><th className="pb-2 text-right">操作</th></tr></thead><tbody>{courses.map(course => <tr key={course.id} className="border-t-2 border-[#334b73]"><td className="py-2 pl-2 pr-2"><input aria-label={`${course.name || "新課程"}的預計學期`} value={course.term} onChange={event => onUpdate(course.id, { term: event.target.value })} placeholder="例如：115-1" className="pixel-input w-28 px-2 py-2 text-xs" /></td><td className="py-2 pr-2"><input aria-label="課程名稱" value={course.name} onChange={event => onUpdate(course.id, { name: event.target.value })} placeholder="例如：統計學" className="pixel-input w-full min-w-48 px-2 py-2 text-xs" /></td><td className="py-2 pr-2 text-center"><input aria-label="預估學分" type="number" min="1" max="12" step="0.5" value={course.credits} onChange={event => onUpdate(course.id, { credits: Number(event.target.value) })} className="pixel-input w-20 px-2 py-2 text-center text-xs" /></td><td className="py-2 pr-2"><select aria-label="課程類別" value={course.category} onChange={event => onUpdate(course.id, { category: event.target.value as CourseCategory })} className="pixel-input w-24 px-2 py-2 text-xs">{Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-2 pr-2"><select aria-label="優先程度" value={course.priority} onChange={event => onUpdate(course.id, { priority: event.target.value as PlannedCourse["priority"] })} className="pixel-input w-32 px-2 py-2 text-xs">{Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-2 text-right"><button onClick={() => onRemove(course.id)} className="p-2 text-[#b9c8e6] hover:text-[#f28682]" aria-label={`移除 ${course.name || "這門課"}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap gap-2">{courses.map(course => <span key={`${course.id}-badge`} className={`border px-2 py-1 text-xs font-black ${priorityTone[course.priority]}`}>{course.name.trim() || "尚未命名的課程"} · {priorityLabel[course.priority]}</span>)}</div></>}</div></Panel>
    <Panel className="overflow-hidden"><PanelTitle eyebrow="SAVE YOUR PLAN" title="把規劃帶著走" action={<Download className="text-[#f4c659]" />} /><div className="space-y-4 p-5"><p className="max-w-3xl text-sm leading-7 text-[#c7d5eb]">CSV 適合放進 Excel、Google 試算表或之後再匯入；行事曆會依學期建立全天提醒，第一學期標在 8 月 1 日、第二學期標在隔年 2 月 1 日，實際上課時間請再依校方課表調整。</p><div className="grid gap-3 md:grid-cols-2"><div className="border-2 border-[#4d638d] bg-[#15233f] p-4"><p className="font-black text-[#fff8df]">CSV 課程規劃表</p><p className="mt-2 text-xs leading-5 text-[#aec0de]">匯出學期、課程、學分、類別與優先程度。已可匯出 {exportableCount} 門課。</p><PixelButton disabled={!exportableCount} onClick={onExportCsv} className="mt-4 w-full bg-[#f4c659] text-[#152544] disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} /> 下載 CSV</PixelButton></div><div className="border-2 border-[#5b5194] bg-[#1d2549] p-4"><p className="font-black text-[#fff8df]">行事曆提醒（.ics）</p><p className="mt-2 text-xs leading-5 text-[#cfc7f5]">可加入 Apple、Google 或 Outlook 行事曆。已可建立 {calendarReadyCount} 個提醒。</p><PixelButton disabled={!calendarReadyCount} onClick={onExportCalendar} className="mt-4 w-full bg-[#5a48b9] disabled:cursor-not-allowed disabled:opacity-50"><CalendarPlus size={16} /> 下載 .ics</PixelButton></div></div>{exportNotice && <p className="border-l-4 border-[#74e2b1] bg-[#1b433f] px-3 py-2 text-xs leading-5 text-[#d2f8e3]">{exportNotice}</p>}</div></Panel>
    <Panel gold className="overflow-hidden"><PanelTitle eyebrow="NOTION FOUR-YEAR PLAN" title="Notion 四年規劃已連結" action={<BookOpen className="text-[#f4c659]" />} /><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm leading-7 text-[#d5e0f2]">你的 Notion「四年學業戰略規劃」已新增 Campus Quest 四年課程地圖與同步欄位。下載合併 CSV 後，在 Notion 的「📚 課程管理」選擇 <b className="text-[#ffe797]">Merge with CSV</b>，即可把規劃課程帶入四年地圖。</p><p className="mt-3 border-l-4 border-[#74e2b1] pl-3 text-xs leading-5 text-[#c7f7dc]">這是使用者主動匯出的單向合併流程：不會自動覆寫 Notion 既有資料，也不會修改這台裝置上的課程規劃。</p></div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col"><PixelButton onClick={onOpenNotion} className="bg-[#5a48b9]"><BookOpen size={16} /> 開啟四年規劃</PixelButton><PixelButton disabled={!exportableCount} onClick={onExportNotionCsv} className="bg-[#f4c659] text-[#152544] disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} /> 下載 Notion 合併 CSV</PixelButton></div></div></Panel>
    <Panel className="overflow-hidden"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-[#fff8df]">你離畢業目標還有 {remainingTarget} 學分。</p><p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8c9e4]">完成這一步後，系統會把你的規劃放進總覽與選課建議中。沒有填完也沒關係，未來每次選課前都可以回來補充。</p></div><PixelButton onClick={onComplete} className="shrink-0 bg-[#5a48b9]"><ShieldCheck size={16} /> {courses.length ? "帶著規劃前往總覽" : "先看看我的總覽"}</PixelButton></div></Panel>
  </div>;
}

function AiPlannerPanel({ section, snapshot }: { section: AiPlanningSection; snapshot: AiPlannerSnapshot }) {
  const [advice, setAdvice] = useState<AiAdvice | null>(null);
  const advisor = trpc.aiPlanner.generate.useMutation({ onSuccess: result => setAdvice(result.advice) });
  const sectionLabel: Record<AiPlanningSection, string> = { dashboard: "整體冒險", grades: "成績卷軸", credits: "學分地圖", quest: "智慧任務", projects: "專題工坊", badges: "成就圖鑑" };
  const urgencyTone = { now: "border-[#f4c659] bg-[#594a28] text-[#ffe797]", next: "border-[#74e2b1] bg-[#24534a] text-[#c7f7dc]", later: "border-[#a998ff] bg-[#473d82] text-[#e7dfff]" };
  const urgencyLabel = { now: "立即", next: "下一步", later: "稍後" };

  useEffect(() => { setAdvice(null); }, [section]);

  return <Panel className="mt-4 overflow-hidden animate-pop-in" gold>
    <PanelTitle eyebrow="AI PLANNING COMPANION" title={`${sectionLabel[section]} AI 顧問`} action={<Sparkles className="text-[#f4c659]" />} />
    <div className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-[#fff8df]">依你的本機學業摘要生成可執行下一步</p><p className="mt-1 text-xs leading-5 text-[#aebdd9]">僅在你按下按鈕時傳送最小化摘要給 AI；建議不會自動修改成績、學分或專題資料。</p></div><PixelButton disabled={advisor.isPending} onClick={() => advisor.mutate({ section, snapshot })} className="shrink-0 bg-[#5a48b9]">{advisor.isPending ? <><Sparkles className="animate-pulse" size={16} /> AI 思考中</> : <><WandSparkles size={16} /> 召喚 AI 顧問</>}</PixelButton></div>
      {advisor.error && <p className="mt-4 border-2 border-[#e8817a] bg-[#4a2d35] px-3 py-2 text-xs font-bold text-[#ffd7d2]">AI 服務暫時無法回應，請稍後再試。</p>}
      {advice && <div className="mt-5 border-t-2 border-[#4f668f] pt-5 animate-pop-in"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">ADVISOR REPORT</p><h3 className="mt-1 text-xl font-black text-[#fff8df]">{advice.title}</h3></div><span className="border-2 border-[#74e2b1] bg-[#24534a] px-2 py-1 text-xs font-black text-[#c7f7dc]">{advisor.data?.source === "local" ? "本機策略備案" : "AI 分析完成"}</span></div><p className="mt-3 text-sm leading-6 text-[#c6d2e9]">{advice.overview}</p><div className="mt-4 border-l-4 border-[#f4c659] bg-[#14213b] px-4 py-3"><p className="text-[11px] font-black text-[#f4c659]">本輪焦點</p><p className="mt-1 text-sm font-bold leading-6 text-[#fff8df]">{advice.focus}</p></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{advice.actions.map((action, index) => <div key={`${action.label}-${index}`} className="border-2 border-[#4a608a] bg-[#152440] p-3"><span className={`inline-flex border px-2 py-1 text-[10px] font-black ${urgencyTone[action.urgency]}`}>{urgencyLabel[action.urgency]}</span><p className="mt-2 text-sm font-black text-[#fff8df]">{action.label}</p><p className="mt-1 text-xs leading-5 text-[#b9c9e4]">{action.reason}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-[#aebbd3]">注意：{advice.caution}</p></div>}
    </div>
  </Panel>;
}

function PrivateQuestContent() {
  const [data, setData] = useState<QuestData>(loadData);
  const [activeView, setActiveView] = useState<View>(() => {
    const requested = window.location.hash.replace("#", "") as View;
    return resolveInitialAcademicView(requested.startsWith("cq-import") ? "grades" : requested, data.hasCompletedPlanIntro, navItems.map(item => item.id)) as View;
  });
  const [courseForm, setCourseForm] = useState<Omit<CourseRecord, "id"> | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<Omit<ProjectRecord, "id"> | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [celebration, setCelebration] = useState<{ title: string; description: string; icon: string } | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState<TranscriptImportPreview | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState<Omit<CourseRecord, "id">[]>([]);
  const [transcriptMapping, setTranscriptMapping] = useState<TranscriptFieldMap>({});
  const [pdfConversionNote, setPdfConversionNote] = useState<string | null>(null);
  const [planExportNotice, setPlanExportNotice] = useState<string | null>(null);
  const [nkustImportOpen, setNkustImportOpen] = useState(false);
  const [nkustTimetableText, setNkustTimetableText] = useState("");
  const [nkustTimetablePreview, setNkustTimetablePreview] = useState<NkustTimetableImportPreview | null>(null);
  const [nkustTimetableDraft, setNkustTimetableDraft] = useState<NkustPlannedCourseDraft[]>([]);
  const [nkustImportMode, setNkustImportMode] = useState<"timetable" | "ccee114">("timetable");
  const [importReport, setImportReport] = useState<{ courseCount: number; skillNames: string[]; xpGain: number; leveledUp: boolean } | null>(null);
  const [fragmentImportError, setFragmentImportError] = useState<string | null>(null);
  const [fragmentHash, setFragmentHash] = useState(() => window.location.hash);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [achievementNotice, setAchievementNotice] = useState<string | null>(null);
  const [examSyncNotice, setExamSyncNotice] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"loading" | "ready" | "saving" | "offline">("loading");
  const mounted = useRef(false);
  const fragmentImportInFlight = useRef(false);
  const previousAchievementIds = useRef<string[]>([]);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const cloudBootstrapComplete = useRef(false);
  const cloudRevision = useRef(0);
  const cloudSaveTimer = useRef<number | null>(null);
  const latestQuestData = useRef(data);
  const pdfConverter = trpc.transcriptPdf.convert.useMutation({
    onSuccess: (result: { csv: string; summary: string; source: "ai" | "local" }) => {
      setTranscriptText(result.csv);
      const preview = prepareTranscriptImport(result.csv, data.courses);
      setTranscriptMapping(preview.mapping ?? {});
      setTranscriptPreview(preview);
      setTranscriptDraft(preview.toImport);
      setPdfConversionNote(`${result.source === "ai" ? "AI 已完成 PDF 轉 CSV。" : "已建立 PDF 文字草稿。"} ${result.summary}`);
    },
    onError: (error: { message: string }) => {
      setPdfConversionNote(null);
      setTranscriptPreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: error.message || "PDF 轉換失敗，請改用 CSV／TSV 或可選取文字的 PDF。", raw: "PDF" }] });
    },
  });
  const cloudState = trpc.academicSync.get.useQuery(undefined, { retry: 1, refetchOnWindowFocus: false });
  const cloudSave = trpc.academicSync.save.useMutation();
  const achievementMediaUpload = trpc.achievementMedia.upload.useMutation();
  const examNotionSync = trpc.notionSync.appendExamSnapshot.useMutation({
    onSuccess: result => setExamSyncNotice(result.status === "synced" ? "已將目前考試快照追加到 Notion 同步紀錄頁。" : result.status === "duplicate" ? "這份考試資料已同步過，Notion 不會新增重複紀錄。" : "相同快照正在同步中，請稍候再查看 Notion 紀錄頁。"),
    onError: error => setExamSyncNotice(error.message || "Notion 同步暫時失敗；你的網站資料沒有被刪除，請稍後重試。"),
  });

  const gpa = useMemo(() => calculateGpa(data.courses, data.system), [data.courses, data.system]);
  const numericAverage = useMemo(() => calculateNumericAverage(data.courses), [data.courses]);
  const credits = useMemo(() => calculateCredits(data.courses), [data.courses]);
  const termGpas = useMemo(() => getTermGpas(data.courses, data.system), [data.courses, data.system]);
  const termNumericAverages = useMemo(() => getTermNumericAverages(data.courses), [data.courses]);
  const achievements = useMemo(() => getAchievements(data.courses, data.projects, data.system), [data.courses, data.projects, data.system]);
  const unlockedAchievements = achievements.filter(achievement => achievement.unlocked);
  const xp = useMemo(() => getXp(data.courses, data.projects), [data.courses, data.projects]);
  const level = useMemo(() => getLevel(xp), [xp]);
  const academicSkills = useMemo(() => getAcademicSkills(data.courses), [data.courses]);
  const recommendationPreferences = data.preferences ?? defaultRecommendationPreferences;
  const recommendations = useMemo(() => buildCareerRecommendations(data.courses, data.projects, data.goals, data.system, data.careerPath, recommendationPreferences, data.plannedCourses.map(course => course.name)), [data.courses, data.projects, data.goals, data.system, data.careerPath, data.plannedCourses, recommendationPreferences]);
  const completedProjects = data.projects.filter(project => project.status === "done").length;
  const plannedCreditBreakdown = useMemo(() => calculatePlannedCredits(data.plannedCourses), [data.plannedCourses]);
  const plannedCredits = plannedCreditBreakdown.total;
  const plannedRequiredCredits = plannedCreditBreakdown.required;
  const creditPlanStatus = useMemo(() => getCreditPlanStatus(credits, plannedCreditBreakdown, data.goals), [credits, data.goals, plannedCreditBreakdown]);
  const exportablePlanCourses = useMemo(() => getExportablePlanCourses(data.plannedCourses), [data.plannedCourses]);
  const calendarReadyPlanCourses = useMemo(() => getCalendarReadyPlanCourses(data.plannedCourses), [data.plannedCourses]);
  const aiSnapshot = useMemo<AiPlannerSnapshot>(() => ({
    gpa,
    gpaSystem: data.system,
    totalCredits: credits.total,
    remainingCredits: Math.max(0, data.goals.total - credits.total),
    semestersLeft: data.goals.semestersLeft,
    termTrend: termGpas.map(item => ({ term: item.term, gpa: item.gpa })),
    skills: academicSkills.map(skill => `${skill.name} · ${skill.tier === "mastered" ? "精通" : skill.tier === "proficient" ? "熟練" : "養成"}`),
    careerPath: data.careerPath,
    preferences: recommendationPreferences,
    courses: data.courses.map(course => ({ name: course.name, term: course.term, credits: course.credits, grade: course.grade, category: course.category })),
    projects: data.projects.map(project => ({ name: project.name, status: project.status, tags: project.tags })),
    unlockedAchievements: unlockedAchievements.length,
  }), [academicSkills, credits.total, data.careerPath, data.courses, data.goals.semestersLeft, data.goals.total, data.projects, data.system, gpa, recommendationPreferences, termGpas, unlockedAchievements.length]);

  function scheduleCloudSave(nextData: QuestData, delay = 700) {
    if (!cloudBootstrapComplete.current) return;
    if (cloudSaveTimer.current !== null) window.clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = window.setTimeout(() => {
      cloudSave.mutate({ baseRevision: cloudRevision.current, payload: nextData }, {
        onSuccess: result => {
          if (result.status === "saved") {
            cloudRevision.current = result.revision;
            setCloudSyncStatus("ready");
            return;
          }
          if (!result.latest) {
            setCloudSyncStatus("offline");
            return;
          }
          const merged = mergeQuestData(normalizeQuestData(result.latest.payload), latestQuestData.current);
          cloudRevision.current = result.latest.revision;
          latestQuestData.current = merged;
          setData(merged);
          setCloudSyncStatus("saving");
          scheduleCloudSave(merged, 150);
        },
        onError: () => setCloudSyncStatus("offline"),
      });
    }, delay);
  }

  useEffect(() => {
    latestQuestData.current = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (cloudBootstrapComplete.current) {
      setCloudSyncStatus("saving");
      scheduleCloudSave(data);
    }
  }, [data]);

  useEffect(() => {
    if (cloudBootstrapComplete.current) return;
    if (cloudState.isError) {
      setCloudSyncStatus("offline");
      return;
    }
    if (!cloudState.data) return;
    const localData = latestQuestData.current;
    cloudBootstrapComplete.current = true;
    if (cloudState.data.status === "empty") {
      cloudRevision.current = 0;
      setCloudSyncStatus(hasQuestData(localData) ? "saving" : "ready");
      if (hasQuestData(localData)) scheduleCloudSave(localData, 0);
      return;
    }
    const cloudData = normalizeQuestData(cloudState.data.payload);
    const shouldMerge = hasQuestData(localData);
    const resolved = shouldMerge ? mergeQuestData(cloudData, localData) : cloudData;
    cloudRevision.current = cloudState.data.revision;
    latestQuestData.current = resolved;
    setData(resolved);
    setCloudSyncStatus(shouldMerge ? "saving" : "ready");
    if (shouldMerge) scheduleCloudSave(resolved, 0);
  }, [cloudState.data, cloudState.isError]);

  useEffect(() => {
    if (!cloudBootstrapComplete.current || !["ready", "saving"].includes(cloudSyncStatus)) return;
    setData(current => current.workspaces.some(project => project.id === "notion-medieval-guild-scheduler")
      ? current
      : { ...current, workspaces: [...current.workspaces, createMedievalGuildWorkspaceProject()] });
  }, [cloudSyncStatus]);

  useEffect(() => {
    if (!cloudBootstrapComplete.current || !["ready", "saving"].includes(cloudSyncStatus)) return;
    setData(current => {
      const imported = createExamWorkspaces();
      const missing = imported.filter(workspace => !current.examWorkspaces.some(existing => existing.id === workspace.id));
      return missing.length ? { ...current, examWorkspaces: [...current.examWorkspaces, ...missing] } : current;
    });
  }, [cloudSyncStatus]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setFragmentHash(hash);
      const navigation = resolveAcademicHashNavigation(hash, data.hasCompletedPlanIntro, navItems.map(item => item.id));
      if (navigation.type === "view") setActiveView(navigation.view as View);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [data.hasCompletedPlanIntro]);

  useEffect(() => {
    if (!fragmentHash.startsWith("#cq-import") || fragmentImportInFlight.current) return;
    fragmentImportInFlight.current = true;
    void (async () => {
      const fragment = fragmentHash.slice(1);
      const fragmentCourses = await decodeFragmentTranscriptImport(fragment);
      if (!fragmentCourses) {
        const usesCompressedImport = fragmentHash.startsWith("#cq-import-gz=");
        setFragmentImportError(usesCompressedImport && typeof DecompressionStream === "undefined"
          ? "此瀏覽器不支援壓縮匯入連結。請改用最新版 Chrome、Safari 或 Edge 後重新開啟連結。"
          : "這個一次性匯入連結無法解讀或已不完整，因此沒有寫入任何成績資料。請重新取得完整連結後再試。");
        setActiveView("grades");
        setFragmentHash("#grades");
        window.history.replaceState(null, "", `${import.meta.env.BASE_URL || "/"}#grades`);
        fragmentImportInFlight.current = false;
        return;
      }
      const merged = mergeFragmentTranscriptImport(data.courses, fragmentCourses, data.goals, () => crypto.randomUUID());
      const imported = merged.imported;
      if (imported.length) {
        const beforeSkills = new Set(getAcademicSkills(data.courses).map(skill => skill.name));
        const combinedCourses = merged.courses;
        const gainedSkills = getAcademicSkills(combinedCourses).map(skill => skill.name).filter(skill => !beforeSkills.has(skill));
        const nextXp = getXp(combinedCourses, data.projects);
        setImportReport({ courseCount: imported.length, skillNames: gainedSkills, xpGain: nextXp - getXp(data.courses, data.projects), leveledUp: getLevel(nextXp).level > getLevel(getXp(data.courses, data.projects)).level });
      }
      setData(current => ({
        ...current,
        courses: merged.courses,
        goals: merged.goals,
        hasCompletedPlanIntro: true,
      }));
      setActiveView("grades");
      setFragmentHash("#grades");
      window.history.replaceState(null, "", `${import.meta.env.BASE_URL || "/"}#grades`);
      fragmentImportInFlight.current = false;
    })();
  }, [fragmentHash]);

  useEffect(() => {
    if (!fragmentHash.startsWith("#cq-score-update") || fragmentImportInFlight.current) return;
    fragmentImportInFlight.current = true;
    void (async () => {
      const fragment = fragmentHash.slice(1);
      const updates = await decodeFragmentNumericScoreUpdate(fragment);
      if (!updates) {
        const usesCompressedUpdate = fragmentHash.startsWith("#cq-score-update-gz=");
        setFragmentImportError(usesCompressedUpdate && typeof DecompressionStream === "undefined"
          ? "此瀏覽器不支援壓縮數字成績更新連結。請改用最新版 Chrome、Safari 或 Edge 後重新開啟連結。"
          : "這個數字成績更新連結無法解讀或已不完整，因此沒有修改任何課程。請重新取得完整連結後再試。");
        setActiveView("grades");
        setFragmentHash("#grades");
        window.history.replaceState(null, "", `${import.meta.env.BASE_URL || "/"}#grades`);
        fragmentImportInFlight.current = false;
        return;
      }
      setData(current => ({ ...current, courses: mergeFragmentNumericScoreUpdate(current.courses, updates).courses, hasCompletedPlanIntro: true }));
      setFragmentImportError(`已處理 ${updates.length} 筆既有課程更新資料；系統只會套用符合原學期與課名的課程，可能補寫數字成績、調整學期或加入備註，未新增或刪除任何課程。`);
      setActiveView("grades");
      setFragmentHash("#grades");
      window.history.replaceState(null, "", `${import.meta.env.BASE_URL || "/"}#grades`);
      fragmentImportInFlight.current = false;
    })();
  }, [fragmentHash]);

  useEffect(() => {
    const current = unlockedAchievements.map(achievement => achievement.id);
    if (!mounted.current) {
      mounted.current = true;
      previousAchievementIds.current = current;
      return;
    }
    const newId = current.find(id => !previousAchievementIds.current.includes(id));
    previousAchievementIds.current = current;
    if (newId) {
      const achievement = achievements.find(item => item.id === newId);
      if (achievement) setCelebration(achievement);
    }
  }, [achievements, unlockedAchievements]);

  function navigateToView(view: View) {
    setActiveView(view);
    // 部署在子路徑（GitHub Pages 的 /<repo>/）時，網址不能寫死成 "/"，
    // 否則會跳出應用程式的目錄而變成 404。BASE_URL 由 Vite 依建置設定產生，
    // 部署在根目錄時它就是 "/"，行為與原本相同。
    const base = import.meta.env.BASE_URL || "/";
    const nextUrl = view === "dashboard" ? base : `${base}#${view}`;
    if (`${window.location.pathname}${window.location.hash}` !== nextUrl) window.history.pushState(null, "", nextUrl);
  }

  function resetQuest() {
    if (window.confirm("確定要清除這台裝置上的課程、成績與專題紀錄，重新開始規劃嗎？")) {
      setData(emptyQuestData);
      navigateToView("plan");
      setCourseForm(null);
      setProjectForm(null);
    }
  }

  function downloadLocalBackup() {
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(createLocalBackup(data as unknown as Record<string, unknown>), `campus-quest-private-backup-${date}.json`, "application/json");
    setBackupNotice("已下載本機備份。請只透過你自己的方式傳到手機，匯入後即可在 Android APK 內查看。");
  }

  async function importLocalBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("備份檔過大，請選擇 1 MB 以下的 Campus Quest 備份。");
      const backup = parseLocalBackup(await file.text());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));
      const restored = loadData();
      setData(restored);
      setActiveView(restored.courses.length ? "grades" : "plan");
      setBackupNotice(`已匯入 ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString("zh-TW") : "這份"} 備份；資料只寫入這台裝置。`);
    } catch (error) {
      setBackupNotice(error instanceof Error ? error.message : "無法匯入這份本機備份。");
    } finally {
      if (backupFileInputRef.current) backupFileInputRef.current.value = "";
    }
  }

  function addPlannedCourse() {
    setData(current => ({ ...current, plannedCourses: [...current.plannedCourses, emptyPlannedCourse()] }));
  }

  function addCcee114CourseToPlan(course: Ccee114CourseEntry) {
    setData(current => {
      if (getCoursePlanSelectionState(course.name, current.courses, current.plannedCourses) !== "available") return current;
      return {
        ...current,
        goals: applyGraduationGoalTemplate(current.goals, "ccee114"),
        plannedCourses: [...current.plannedCourses, { id: crypto.randomUUID(), term: course.recommendedTerm, name: course.name, credits: course.credits, category: course.category, priority: course.category === "required" ? "must" : "important" }],
        hasCompletedPlanIntro: true,
      };
    });
    setPlanExportNotice(`已將「${course.name}」加入電通系課程規劃（${course.recommendedTerm}／${course.credits} 學分）。地圖不判斷當期開課；如有官方擋修條件，會另以提醒顯示。`);
  }

  function updatePlannedCourse(id: string, patch: Partial<PlannedCourse>) {
    const target = data.plannedCourses.find(course => course.id === id);
    if (target) {
      const candidate = { ...target, ...patch };
      const selectionState = getCoursePlanSelectionState(candidate.name, data.courses, data.plannedCourses.filter(course => course.id !== id));
      if (selectionState !== "available") {
        setPlanExportNotice(selectionState === "completed" ? `「${candidate.name.trim()}」已有通過成績，不能再次加入規劃。` : `「${candidate.name.trim()}」已在課程規劃中，不能重複加入。`);
        return;
      }
    }
    setData(current => ({ ...current, plannedCourses: current.plannedCourses.map(course => course.id === id ? { ...course, ...patch } : course) }));
  }

  function removePlannedCourse(id: string) {
    setData(current => ({ ...current, plannedCourses: current.plannedCourses.filter(course => course.id !== id) }));
  }

  function completePlanIntro() {
    setData(current => ({ ...current, hasCompletedPlanIntro: true }));
    navigateToView("dashboard");
  }

  function exportCoursePlanCsv() {
    if (!exportablePlanCourses.length) {
      setPlanExportNotice("請先填寫至少一門課的學期、課程名稱與有效學分，才能建立 CSV。");
      return;
    }
    downloadTextFile(buildCoursePlanCsv(data.plannedCourses), "campus-quest-course-plan.csv", "text/csv");
    setPlanExportNotice(`已下載 CSV，包含 ${exportablePlanCourses.length} 門已完成欄位的規劃課程。`);
  }

  function exportNotionCoursePlanCsv() {
    if (!exportablePlanCourses.length) {
      setPlanExportNotice("請先填寫至少一門課的學期、課程名稱與有效學分，才能建立 Notion 合併 CSV。");
      return;
    }
    downloadTextFile(buildNotionCoursePlanCsv(data.plannedCourses), "campus-quest-notion-four-year-plan.csv", "text/csv");
    setPlanExportNotice(`已下載 Notion 合併 CSV，包含 ${exportablePlanCourses.length} 門規劃課程；匯入前請先在 Notion 的「📚 課程管理」選擇 Merge with CSV。`);
  }

  function openNotionFourYearPlan() {
    window.open("https://app.notion.com/p/3a00b85565a5818c8ae1f0b0d8748d4d?pvs=204", "_blank", "noopener,noreferrer");
  }

  function exportCoursePlanCalendar() {
    if (!calendarReadyPlanCourses.length) {
      setPlanExportNotice("行事曆需要「115-1」或「115/1」這類學期格式，請先補齊至少一門課的學期。");
      return;
    }
    downloadTextFile(buildCoursePlanCalendar(data.plannedCourses), "campus-quest-course-plan.ics", "text/calendar");
    const skipped = exportablePlanCourses.length - calendarReadyPlanCourses.length;
    setPlanExportNotice(`已下載 .ics 行事曆，建立 ${calendarReadyPlanCourses.length} 個全天課程規劃提醒${skipped > 0 ? `；另有 ${skipped} 門因學期格式未辨識而未加入。` : "。"}`);
  }

  function previewNkustTimetable(text = nkustTimetableText) {
    const preview = prepareNkustTimetableImport(text, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)]);
    setNkustTimetablePreview(preview);
    setNkustTimetableDraft(preview.accepted);
  }

  function openCcee114RequiredPlan() {
    const text = buildCcee114RequiredCoursePlanCsv();
    const preview = prepareNkustTimetableImport(text, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)]);
    setNkustImportMode("ccee114");
    setNkustTimetableText(text);
    setNkustTimetablePreview(preview);
    setNkustTimetableDraft(preview.accepted);
    setNkustImportOpen(true);
  }

  function updateNkustTimetableDraft(index: number, patch: Partial<NkustPlannedCourseDraft>) {
    setNkustTimetableDraft(current => {
      const next = current.map((course, rowIndex) => rowIndex === index ? { ...course, ...patch } : course);
      setNkustTimetablePreview(prepareNkustTimetableDraftImport(next, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)], nkustTimetablePreview?.headers));
      return next;
    });
  }

  function removeNkustTimetableDraftRow(index: number) {
    setNkustTimetableDraft(current => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      setNkustTimetablePreview(prepareNkustTimetableDraftImport(next, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)], nkustTimetablePreview?.headers));
      return next;
    });
  }

  function readNkustTimetableFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 500_000) {
      setNkustTimetablePreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "檔案超過 500 KB，請先匯出精簡的高科大 CSV 或 TSV 課表。", raw: "" }], headers: [] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setNkustTimetableText(text);
      const preview = prepareNkustTimetableImport(text, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)]);
      setNkustTimetablePreview(preview);
      setNkustTimetableDraft(preview.accepted);
    };
    reader.onerror = () => setNkustTimetablePreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "無法讀取這份檔案，請確認它是 UTF-8 的 CSV、TSV 或純文字檔。", raw: "" }], headers: [] });
    reader.readAsText(file);
  }

  function confirmNkustTimetableImport() {
    if (!nkustTimetablePreview?.toImport.length) return;
    const imported = nkustTimetablePreview.toImport.map(course => ({ ...course, id: crypto.randomUUID() }));
    const importedCcee114Plan = nkustImportMode === "ccee114";
    setData(current => ({
      ...current,
      goals: applyGraduationGoalTemplate(current.goals, importedCcee114Plan ? "ccee114" : "none"),
      plannedCourses: [...current.plannedCourses, ...imported],
      hasCompletedPlanIntro: true,
    }));
    setPlanExportNotice(importedCcee114Plan
      ? `已載入電通系 114 課程結構的 ${imported.length} 門系必修，並將目標更新為必修 51、選修 49、通識與校共同 28、總計 128 學分；這些課程不會計入 GPA、已完成學分、能力或 XP。`
      : `已將 ${imported.length} 門高科大課表課程加入規劃；這些課程不會計入 GPA、已完成學分、能力或 XP。`);
    setNkustTimetableText("");
    setNkustTimetablePreview(null);
    setNkustTimetableDraft([]);
    setNkustImportMode("timetable");
    setNkustImportOpen(false);
  }

  function saveCourse() {
    if (!courseForm || !courseForm.name.trim() || !courseForm.term.trim() || courseForm.credits < 1) return;
    setData(current => ({
      ...current,
      courses: editingCourseId
        ? current.courses.map(course => course.id === editingCourseId ? { ...courseForm, id: editingCourseId, name: courseForm.name.trim() } : course)
        : [...current.courses, { ...courseForm, id: crypto.randomUUID(), name: courseForm.name.trim() }],
    }));
    setCourseForm(null);
    setEditingCourseId(null);
  }

  function saveProject() {
    if (!projectForm || !projectForm.name.trim()) return;
    setData(current => ({
      ...current,
      projects: editingProjectId
        ? current.projects.map(project => project.id === editingProjectId ? { ...projectForm, id: editingProjectId, name: projectForm.name.trim() } : project)
        : [...current.projects, { ...projectForm, id: crypto.randomUUID(), name: projectForm.name.trim() }],
    }));
    setProjectForm(null);
    setEditingProjectId(null);
  }

  function addAchievementRecord(kind: AchievementRecordKind) {
    const timestamp = new Date().toISOString();
    setData(current => ({ ...current, achievementRecords: [{ id: crypto.randomUUID(), kind, title: kind === "certificate" ? "未命名證照" : "未命名比賽", status: "planning", skills: [], evidence: [], createdAt: timestamp, updatedAt: timestamp }, ...current.achievementRecords] }));
  }

  function updateAchievementRecord(id: string, patch: Partial<AchievementRecord>) {
    setData(current => ({ ...current, achievementRecords: current.achievementRecords.map(record => record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record) }));
  }

  async function uploadAchievementEvidence(recordId: string, file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setAchievementNotice("圖片或影片檔案上限為 20 MB，請改用較小檔案或新增外部影片連結。");
      return;
    }
    try {
      const encoded = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("檔案讀取失敗"));
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.readAsDataURL(file);
      });
      const evidence = await achievementMediaUpload.mutateAsync({ recordId, fileName: file.name, mimeType: file.type || "application/octet-stream", base64: encoded });
      const currentEvidence = data.achievementRecords.find(record => record.id === recordId)?.evidence ?? [];
      updateAchievementRecord(recordId, { evidence: [...currentEvidence, evidence] });
      setAchievementNotice(`已安全上傳「${file.name}」，只有本人登入後可查看。`);
    } catch (error) {
      setAchievementNotice(error instanceof Error ? error.message : "附件上傳失敗，請稍後再試。");
    }
  }

  function updateWorkspace(projectId: string, update: (project: WorkspaceProject) => WorkspaceProject) {
    setData(current => ({ ...current, workspaces: current.workspaces.map(project => project.id === projectId ? update(project) : project) }));
  }

  function updateExamWorkspace(workspaceId: string, update: (workspace: ExamWorkspace) => ExamWorkspace) {
    setData(current => ({ ...current, examWorkspaces: current.examWorkspaces.map(workspace => workspace.id === workspaceId ? update(workspace) : workspace) }));
  }

  function openCourseEditor(course?: CourseRecord) {
    setEditingCourseId(course?.id ?? null);
    setCourseForm(course ? createCourseEditorDraft(course) : emptyCourse());
  }

  function openProjectEditor(project?: ProjectRecord) {
    setEditingProjectId(project?.id ?? null);
    setProjectForm(project ? { name: project.name, description: project.description, tags: project.tags, startDate: project.startDate, endDate: project.endDate, status: project.status } : emptyProject());
  }

  function updateGoals(key: keyof GraduationGoals, value: number) {
    setData(current => ({ ...current, goals: { ...current.goals, [key]: Math.max(0, value) } }));
  }

  function applyCcee114Goals() {
    setData(current => ({ ...current, goals: { ...ccee114GraduationGoals, semestersLeft: current.goals.semestersLeft } }));
  }

  function previewTranscript(text = transcriptText, mapping = transcriptMapping) {
    const preview = prepareTranscriptImport(text, data.courses, mapping);
    setTranscriptPreview(preview);
    setTranscriptDraft(preview.toImport);
    if (preview.needsMapping) setTranscriptMapping(preview.mapping ?? {});
  }

  function updateTranscriptDraft(index: number, patch: Partial<Omit<CourseRecord, "id">>) {
    setTranscriptDraft(current => {
      const next = current.map((course, rowIndex) => rowIndex === index ? { ...course, ...patch } : course);
      setTranscriptPreview(prepareTranscriptDraftImport(next, data.courses));
      return next;
    });
  }

  function removeTranscriptDraftRow(index: number) {
    setTranscriptDraft(current => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      setTranscriptPreview(prepareTranscriptDraftImport(next, data.courses));
      return next;
    });
  }

  function readTranscriptFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPdfConversionNote(null);
    if (file.size > 500_000) {
      setTranscriptPreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "檔案超過 500 KB，請先匯出精簡的 CSV 或 TSV 成績資料。", raw: file.name }] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setTranscriptText(text);
      const preview = prepareTranscriptImport(text, data.courses);
      setTranscriptMapping(preview.mapping ?? {});
      setTranscriptPreview(preview);
      setTranscriptDraft(preview.toImport);
    };
    reader.onerror = () => setTranscriptPreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "無法讀取這份檔案，請確認它是 UTF-8 的 CSV、TSV 或純文字檔。", raw: file.name }] });
    reader.readAsText(file);
  }

  function readTranscriptPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPdfConversionNote(null);
    if (file.size > 2_000_000) {
      setTranscriptPreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "PDF 超過 2 MB，請先匯出較精簡的文字型成績單。", raw: file.name }] });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      pdfConverter.mutate({ fileName: file.name, pdfBase64: base64 });
    };
    reader.onerror = () => setTranscriptPreview({ accepted: [], toImport: [], duplicates: [], issues: [{ row: 0, message: "無法讀取這份 PDF，請改用 CSV／TSV。", raw: file.name }] });
    reader.readAsDataURL(file);
  }

  function confirmTranscriptImport() {
    if (!transcriptPreview?.toImport.length) return;
    const imported = transcriptPreview.toImport.map(course => ({ ...course, id: crypto.randomUUID() }));
    const beforeSkills = new Set(academicSkills.map(skill => skill.name));
    const combinedCourses = [...data.courses, ...imported];
    const gainedSkills = getAcademicSkills(combinedCourses).map(skill => skill.name).filter(skill => !beforeSkills.has(skill));
    const nextXp = getXp(combinedCourses, data.projects);
    setImportReport({ courseCount: imported.length, skillNames: gainedSkills, xpGain: nextXp - xp, leveledUp: getLevel(nextXp).level > level.level });
    setData(current => ({ ...current, courses: [...current.courses, ...imported] }));
    setTranscriptText("");
    setTranscriptPreview(null);
    setTranscriptDraft([]);
    setTranscriptOpen(false);
  }

  const currentTitle = navItems.find(item => item.id === activeView)?.label ?? "冒險總覽";

  return (
    <main className="min-h-screen overflow-x-hidden pb-10">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 lg:px-7 lg:py-6">
        <header className="pixel-panel scanline flex flex-col gap-4 bg-[#17243f] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button onClick={() => navigateToView(data.hasCompletedPlanIntro ? "dashboard" : "plan")} className="flex items-center gap-3 text-left" aria-label="前往主要頁面">
            <span className="crest flex h-12 w-12 items-center justify-center bg-[#f4c659] text-[#1d3153] shadow-[3px_3px_0_#080d1f]"><GraduationCap size={27} strokeWidth={2.8} /></span>
            <span>
              <span className="pixel-font block text-[10px] leading-6 text-[#f4c659]">CAMPUS QUEST</span>
              <span className="block text-sm font-bold tracking-[.22em] text-[#f7f2d3]">大學生涯冒險誌</span>
            </span>
          </button>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden text-right sm:block">
              <p className="pixel-font text-[8px] text-[#93a7cb]">PRIVATE CLOUD SYNC</p>
              <p className={`mt-1 text-xs font-semibold ${cloudSyncStatus === "offline" ? "text-[#ffe797]" : "text-[#dce7ff]"}`}>{cloudSyncStatus === "loading" ? "正在讀取私人資料" : cloudSyncStatus === "saving" ? "正在同步至本人帳號" : cloudSyncStatus === "offline" ? "暫時離線，資料保留在此裝置" : "已同步至本人帳號"}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#74e2b1]" aria-hidden="true" />
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="pixel-panel h-fit bg-[#17243f] p-3 lg:sticky lg:top-5">
            <div className="border-b-2 border-[#4b628e] px-3 pb-4 pt-2">
              <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">PLAYER PROFILE</p>
              <p className="mt-2 font-extrabold text-[#fff8df]">學術冒險者</p>
            </div>
            <nav className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="主要功能">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return <button key={item.id} onClick={() => navigateToView(item.id)} className={`pixel-corners flex items-center gap-3 px-3 py-3 text-left text-sm font-bold transition-colors ${isActive ? "bg-[#f4c659] text-[#16233f] shadow-[3px_3px_0_#080d1f]" : "text-[#dce7ff] hover:bg-[#293d61]"}`}><Icon size={18} /><span>{item.label}</span>{isActive && <ChevronRight className="ml-auto hidden lg:block" size={16} />}</button>;
              })}
            </nav>
            <ExamCountdownSidebar workspaces={data.examWorkspaces} onOpen={() => navigateToView("exams")} />
            <div className="mt-4 border-t-2 border-[#4b628e] px-3 pt-4">
              <p className="pixel-font text-[8px] leading-5 text-[#93a7cb]">GAME SYSTEM</p>
              <input ref={backupFileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => { void importLocalBackup(event.target.files?.[0]); }} />
              <button onClick={downloadLocalBackup} className="mt-2 block text-left text-xs font-bold text-[#b8c9ed] underline decoration-[#b8c9ed]/40 underline-offset-4 hover:text-[#74e2b1]">下載私人備份（帶到手機）</button>
              <button onClick={() => backupFileInputRef.current?.click()} className="mt-2 block text-left text-xs font-bold text-[#b8c9ed] underline decoration-[#b8c9ed]/40 underline-offset-4 hover:text-[#74e2b1]">匯入私人備份（手機資料）</button>
              <button onClick={resetQuest} className="mt-2 text-xs font-bold text-[#b8c9ed] underline decoration-[#b8c9ed]/40 underline-offset-4 hover:text-[#f4c659]">清除本機資料，重新開始</button>
              {backupNotice && <p className="mt-3 border-l-2 border-[#74e2b1] pl-2 text-[11px] leading-5 text-[#c5f1dd]">{backupNotice}</p>}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="pixel-font text-[8px] leading-5 text-[#8194bb]">COMMAND WINDOW</p>
                <h1 className="text-2xl font-extrabold tracking-wide text-[#fff8df] sm:text-3xl">{currentTitle}</h1>
              </div>
              <div className="border-2 border-[#526995] bg-[#192844] px-3 py-2 text-xs font-bold text-[#d8e4fb]">GPA 計算採用 <b className="ml-1 text-[#f4c659]">4.3 制</b></div>
            </div>

            {activeView === "plan" && <><CoursePlanView courses={data.plannedCourses} completedCredits={credits.total} plannedCredits={plannedCredits} plannedRequiredCredits={plannedRequiredCredits} goals={data.goals} exportableCount={exportablePlanCourses.length} calendarReadyCount={calendarReadyPlanCourses.length} exportNotice={planExportNotice} onAdd={addPlannedCourse} onUpdate={updatePlannedCourse} onRemove={removePlannedCourse} onExportCsv={exportCoursePlanCsv} onExportNotionCsv={exportNotionCoursePlanCsv} onOpenNotion={openNotionFourYearPlan} onExportCalendar={exportCoursePlanCalendar} onComplete={completePlanIntro} /><Ccee114CourseMapPanel completedCourses={data.courses} plannedCourses={data.plannedCourses} onAdd={addCcee114CourseToPlan} /><Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="NKUST TIMETABLE CSV" title="高科大課表匯入" action={<FileText className="text-[#74e2b1]" />} /><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm leading-7 text-[#d5e0f2]">可匯入你自行從高科大課程資料查詢整理並另存的 CSV／TSV。系統只讀取學期、課程、學分與類別；任何學號、姓名、成績或缺曠欄位都不會對應或保存。</p><p className="mt-3 border-l-4 border-[#74e2b1] pl-3 text-xs leading-5 text-[#c7f7dc]">先預覽並逐列確認，才會加入本機「規劃中」課程；不會改變 GPA、已完成學分、能力或 XP。</p></div><PixelButton onClick={() => setNkustImportOpen(true)} className="bg-[#245d58] text-[#e1fff6]"><FileText size={16} /> 匯入高科大 CSV</PixelButton></div></Panel></>}
            {activeView === "dashboard" && <DashboardView gpa={gpa} numericAverage={numericAverage} data={data} credits={credits} level={level} xp={xp} skills={academicSkills} recommendations={recommendations} termGpas={termGpas} completedProjects={completedProjects} unlockedAchievements={unlockedAchievements.length} onGo={navigateToView} />}
            {activeView === "plan" && <Panel gold className="mt-4 overflow-hidden"><PanelTitle eyebrow="CCEE 114 CURRICULUM" title="電通系 114 課程結構" action={<GraduationCap className="text-[#f4c659]" />} /><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm leading-7 text-[#d5e0f2]">依高科大電腦與通訊工程系四技 114 學年度入學課程結構，畢業目標為總計 128 學分：系必修 51、系專業選修 49、校共同與通識 28。模板只帶入官方明列的 21 門系必修，不會捏造你尚未選定的 49 學分選修。</p><p className="mt-3 border-l-4 border-[#f4c659] pl-3 text-xs leading-5 text-[#ffe9a4]">載入後仍會先顯示逐列草稿；你確認匯入時才更新這台裝置的學分目標與規劃。既有同學期、同課名課程會略過，不會被覆寫。</p></div><PixelButton onClick={openCcee114RequiredPlan} className="bg-[#f4c659] text-[#152544]"><GraduationCap size={16} /> 載入電通 114 必修</PixelButton></div></Panel>}
            {activeView === "grades" && <GradesView courses={data.courses} system={data.system} gpa={gpa} numericAverage={numericAverage} termGpas={termGpas} termNumericAverages={termNumericAverages} termRanks={data.termRanks} onTermRankSave={(term, rank) => setData(current => {
              const termRanks = { ...current.termRanks };
              if (rank) termRanks[term] = rank;
              else delete termRanks[term];
              return { ...current, termRanks };
            })} courseForm={courseForm} editingCourseId={editingCourseId} setCourseForm={setCourseForm} onOpen={openCourseEditor} onImport={() => setTranscriptOpen(true)} importReport={importReport} fragmentImportError={fragmentImportError} onSave={saveCourse} onCancel={() => { setCourseForm(null); setEditingCourseId(null); }} onDelete={id => setData(current => ({ ...current, courses: current.courses.filter(course => course.id !== id) }))} />}
            {activeView === "credits" && <><CreditPlanningSummary status={creditPlanStatus} /><CreditsView credits={credits} goals={data.goals} showEditor={showGoalEditor} setShowEditor={setShowGoalEditor} onGoalChange={updateGoals} onApplyCcee114Goals={applyCcee114Goals} /><CceeCommonEducationMap courses={data.courses} /><CreditRecognitionMapV2 courses={data.courses} /></>}
            {activeView === "quest" && <><PreferenceControls preferences={recommendationPreferences} onChange={preferences => setData(current => ({ ...current, preferences }))} /><CareerQuestView recommendations={recommendations} careerPath={data.careerPath} onCareerPathChange={careerPath => setData(current => ({ ...current, careerPath }))} goals={data.goals} gpa={gpa} credits={credits} completedProjects={completedProjects} /><CareerRealityPanel recommendations={recommendations} /><div className="mt-4"><CareerTreePanel courses={data.courses} achievements={data.achievementRecords} plannedCourseNames={data.plannedCourses.map(course => course.name)} trackId={data.careerTrackId} onTrackChange={careerTrackId => setData(current => ({ ...current, careerTrackId }))} /></div></>}
            {activeView === "projects" && <><ProjectsView projects={data.projects} projectForm={projectForm} editingProjectId={editingProjectId} setProjectForm={setProjectForm} onOpen={openProjectEditor} onSave={saveProject} onCancel={() => { setProjectForm(null); setEditingProjectId(null); }} onDelete={id => setData(current => ({ ...current, projects: current.projects.filter(project => project.id !== id) }))} /><NotionProjectWorkspace workspaces={data.workspaces} onUpdate={updateWorkspace} /></>}
            {activeView === "exams" && <ExamWorkspaceView workspaces={data.examWorkspaces} onUpdate={updateExamWorkspace} syncing={examNotionSync.isPending} syncNotice={examSyncNotice} canSync={cloudSyncStatus === "ready"} onSync={() => { if (cloudSyncStatus !== "ready") { setExamSyncNotice("請先等待網站完成私人雲端同步，再追加到 Notion。"); return; } setExamSyncNotice(null); examNotionSync.mutate({ examWorkspaces: data.examWorkspaces }); }} />}
            {activeView === "achievements" && <AchievementRecordsView records={data.achievementRecords} academicSkills={academicSkills.map(skill => skill.name)} notice={achievementNotice} uploading={achievementMediaUpload.isPending} onAdd={addAchievementRecord} onUpdate={updateAchievementRecord} onDelete={id => setData(current => ({ ...current, achievementRecords: current.achievementRecords.filter(record => record.id !== id) }))} onUpload={uploadAchievementEvidence} />}
            {activeView === "badges" && <BadgesView achievements={achievements} unlocked={unlockedAchievements.length} />}
            <AiPlannerPanel section={activeView === "plan" || activeView === "achievements" || activeView === "exams" ? "dashboard" : activeView as AiPlanningSection} snapshot={aiSnapshot} />
          </div>
        </div>
      </div>

      {celebration && <AchievementCelebration achievement={celebration} onClose={() => setCelebration(null)} />}
      <TranscriptImportDialogV2 open={transcriptOpen} onOpenChange={setTranscriptOpen} text={transcriptText} preview={transcriptPreview} draft={transcriptDraft} onTextChange={text => { setTranscriptText(text); setTranscriptMapping({}); const preview = prepareTranscriptImport(text, data.courses); setTranscriptPreview(preview); setTranscriptDraft(preview.toImport); setPdfConversionNote(null); }} onFileChange={readTranscriptFile} onPdfChange={readTranscriptPdf} isPdfConverting={pdfConverter.isPending} pdfNote={pdfConversionNote} onDraftChange={updateTranscriptDraft} onDraftDelete={removeTranscriptDraftRow} onPreview={() => previewTranscript()} onConfirm={confirmTranscriptImport} />
      <NkustTimetableImportDialog open={nkustImportOpen} onOpenChange={setNkustImportOpen} text={nkustTimetableText} preview={nkustTimetablePreview} draft={nkustTimetableDraft} onTextChange={text => { setNkustTimetableText(text); const preview = prepareNkustTimetableImport(text, [...data.plannedCourses, ...data.courses.filter(course => getGradePoint(course.grade, "4.0") > 0)]); setNkustTimetablePreview(preview); setNkustTimetableDraft(preview.accepted); }} onFileChange={readNkustTimetableFile} onDownloadTemplate={() => downloadTextFile(buildNkustTimetableTemplate(), "nkust-timetable-template.csv", "text/csv")} onDraftChange={updateNkustTimetableDraft} onDraftDelete={removeNkustTimetableDraftRow} onPreview={() => previewNkustTimetable()} onConfirm={confirmNkustTimetableImport} />
      {transcriptOpen && transcriptPreview?.needsMapping && <TranscriptMappingWizard open headers={transcriptPreview.headers ?? []} sample={transcriptPreview.sample ?? []} mapping={transcriptMapping} onChange={setTranscriptMapping} onApply={() => previewTranscript(transcriptText, transcriptMapping)} onClose={() => setTranscriptPreview(null)} />}
    </main>
  );
}

function PrivateAccessScreen({ title, description, action }: { title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return <main className="min-h-screen bg-[#0c1730] px-4 py-8 text-[#fff8df] sm:p-10"><div className="mx-auto flex min-h-[80vh] max-w-xl items-center"><section className="pixel-panel w-full border-2 border-[#f4c659] bg-[#172640] p-6 shadow-[6px_6px_0_#071024] sm:p-8"><div className="flex h-14 w-14 items-center justify-center border-2 border-[#f4c659] bg-[#394d70] text-[#f4c659]"><ShieldCheck size={30} /></div><p className="pixel-font mt-5 text-[9px] tracking-wider text-[#f4c659]">PRIVATE CAMPUS QUEST</p><h1 className="mt-3 text-2xl font-black leading-tight text-[#fff8df]">{title}</h1><p className="mt-4 text-sm leading-7 text-[#c9d7ee]">{description}</p><p className="mt-4 border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-6 text-[#d6f7e6]">成績、課程規劃與專題只會在本人帳號通過驗證後安全同步；網站不會向其他帳號公開或提供讀寫權限。</p>{action && <button onClick={action.onClick} className="mt-6 inline-flex items-center gap-2 border-2 border-[#f4c659] bg-[#f4c659] px-4 py-3 text-sm font-black text-[#172440] shadow-[3px_3px_0_#071024] transition hover:bg-[#ffe797] active:scale-[.97]"><ShieldCheck size={17} />{action.label}</button>}</section></div></main>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const ownerAccess = trpc.auth.ownerAccess.useQuery(undefined, { enabled: isAuthenticated && !IS_STATIC_MODE, retry: false, refetchOnWindowFocus: false });

  // 靜態離線版沒有伺服器，資料只在這台裝置上，因此不做登入與擁有者檢查。
  if (IS_STATIC_MODE) return <PrivateQuestContent />;

  if (loading || (isAuthenticated && ownerAccess.isLoading)) return <PrivateAccessScreen title="正在確認私人存取權限" description="請稍候，系統正在安全確認登入身分。" />;
  if (!isAuthenticated) return <PrivateAccessScreen title="這是你的私人學業基地" description="請使用擁有 Campus Quest 的本人帳號登入。登入後才會載入這台裝置上的本機學業資料。" action={{ label: "使用本人帳號登入", onClick: startLogin }} />;
  if (ownerAccess.isError) return <PrivateAccessScreen title="此帳號沒有存取權限" description={`目前登入的是「${user?.name ?? "未知帳號"}」。Campus Quest 已設為僅供擁有者帳號使用；請切換回本人帳號後再登入。`} action={{ label: "登出並切換帳號", onClick: () => { void logout(); } }} />;
  return <PrivateQuestContent />;
}

function DashboardView({ gpa, numericAverage, data, credits, level, xp, skills, recommendations, termGpas, completedProjects, unlockedAchievements, onGo }: { gpa: number; numericAverage: number | null; data: QuestData; credits: ReturnType<typeof calculateCredits>; level: ReturnType<typeof getLevel>; xp: number; skills: ReturnType<typeof getAcademicSkills>; recommendations: ReturnType<typeof buildCareerRecommendations>; termGpas: ReturnType<typeof getTermGpas>; completedProjects: number; unlockedAchievements: number; onGo: (view: View) => void }) {
  const recent = [...data.courses].sort((a, b) => b.term.localeCompare(a.term, "zh-Hant"))[0];
  return <div className="space-y-4 animate-pop-in">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
      <Panel gold className="scanline overflow-hidden">
        <div className="grid gap-5 p-5 sm:grid-cols-[136px_minmax(0,1fr)] sm:p-7">
          <div className="relative mx-auto h-[136px] w-[136px] animate-drift">
            <div className="absolute inset-0 border-[5px] border-[#f4c659] bg-[#31496f] shadow-[6px_6px_0_#071024] [clip-path:polygon(50%_0,83%_10%,100%_43%,92%_78%,50%_100%,8%_78%,0_43%,17%_10%)]" />
            <div className="absolute inset-4 flex items-center justify-center border-[4px] border-[#8ea0c8] bg-[#1c3152] [clip-path:polygon(50%_0,83%_10%,100%_43%,92%_78%,50%_100%,8%_78%,0_43%,17%_10%)]"><Crown className="h-14 w-14 text-[#ffe38a]" strokeWidth={1.8} /></div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-[#0b1124] bg-[#f4c659] px-3 py-1 text-xs font-black text-[#152442] shadow-[2px_2px_0_#080d1f]">LV. {level.level}</div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">STUDENT CHARACTER CARD</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">學術冒險者</h2><p className="mt-1 text-sm text-[#bfcce3]">主修未知領域 · 正在開拓下一張地圖</p></div>
              <span className="border-2 border-[#67cca0] bg-[#1c4e48] px-3 py-1.5 text-xs font-black text-[#caffdd]">狀態：探索中</span>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 text-xs font-bold"><span className="text-[#cad6ed]">經驗值 <b className="text-[#f4c659]">{xp} XP</b></span><span className="text-[#93a7cb]">距離 LV.{level.level + 1}：{level.xpToNext - level.xpIntoLevel} XP</span></div>
            <div className="mt-2"><ProgressBar value={level.progress} /></div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <StatChip icon={<BarChart3 />} label="累計 GPA" value={gpa.toFixed(2)} tone="gold" />
              <StatChip icon={<ScrollText />} label="數字總平均" value={numericAverage === null ? "—" : numericAverage.toFixed(2)} tone="gold" />
              <StatChip icon={<BookOpen />} label="完成學分" value={`${credits.total}`} tone="mint" />
              <StatChip icon={<FolderKanban />} label="完成專題" value={`${completedProjects}`} tone="violet" />
            </div>
            <div className="mt-4 border-t-2 border-[#3d547d] pt-3"><p className="pixel-font text-[8px] leading-5 text-[#9fb1d3]">EARNED ABILITIES</p><div className="mt-2 flex flex-wrap gap-1.5">{skills.length ? skills.slice(0, 6).map(skill => <span key={skill.name} className={`border px-2 py-1 text-[11px] font-black ${skill.tier === "mastered" ? "border-[#f4c659] bg-[#5a4825] text-[#ffe797]" : skill.tier === "proficient" ? "border-[#69d9aa] bg-[#1d4b44] text-[#c7f7dc]" : "border-[#8ca0c6] bg-[#314563] text-[#d6e3fa]"}`}>{skill.name} <span className="opacity-80">· {skill.tier === "mastered" ? "精通" : skill.tier === "proficient" ? "熟練" : "養成"}</span></span>) : <span className="text-xs text-[#9fb1d3]">匯入或新增及格課程後，這裡會顯示能力標籤。</span>}</div><p className="mt-2 text-[11px] text-[#8fa3c6]">及格課程才會解鎖能力；A− 以上會提供雙倍熟練度。</p></div>
          </div>
        </div>
      </Panel>
      <Panel className="overflow-hidden">
        <PanelTitle eyebrow="NEXT QUEST" title="下一個里程碑" action={<Target className="text-[#f4c659]" />} />
        <div className="p-5">
          <div className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#a998ff] bg-[#4a3d95] text-[#eadfff]"><Sparkles size={21} /></span><div><p className="font-extrabold text-[#fff8df]">{recommendations.goal}</p><p className="mt-2 text-sm leading-6 text-[#bac9e5]">剩餘 {recommendations.remainingCredits} 學分，建議以每學期 {recommendations.suggestedCredits} 學分的節奏推進。</p></div></div>
          <PixelButton onClick={() => onGo("quest")} className="mt-5 w-full bg-[#5a48b9]">查看智慧任務 <ChevronRight size={16} /></PixelButton>
        </div>
      </Panel>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <Panel>
        <PanelTitle eyebrow="ACADEMIC LOG" title="學業走勢" action={<button onClick={() => onGo("grades")} className="text-xs font-bold text-[#f4c659] hover:underline">檢視成績</button>} />
        <div className="p-5"><GpaChart points={termGpas} system={data.system} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SmallMetric label="本學期" value={termGpas.at(-1)?.gpa.toFixed(2) ?? "—"} /><SmallMetric label="學期數" value={`${termGpas.length}`} /><SmallMetric label="已記錄課程" value={`${data.courses.length}`} /><SmallMetric label="系統" value={data.system} /></div></div>
      </Panel>
      <Panel>
        <PanelTitle eyebrow="LATEST ACTIVITY" title="近期動態" action={<Heart className="text-[#eb7371]" />} />
        <div className="divide-y-2 divide-[#40557c] px-5 pb-2">
          <ActivityRow icon={<ScrollText size={17} />} tone="gold" title={recent ? `已紀錄：${recent.name}` : "等待新增課程"} detail={recent ? `${recent.term} · ${recent.credits} 學分 · ${recent.grade}` : "從成績卷軸開始你的冒險"} />
          <ActivityRow icon={<Trophy size={17} />} tone="violet" title={`已解鎖 ${unlockedAchievements} 枚成就徽章`} detail="達成更多學業里程碑，圖鑑將持續擴張。" />
          <ActivityRow icon={<FolderKanban size={17} />} tone="mint" title={`${data.projects.filter(project => project.status === "active").length} 個專題正在進行`} detail="專題工坊會替你留下每段創作歷程。" />
        </div>
      </Panel>
    </div>
  </div>;
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "gold" | "mint" | "violet" }) {
  const colors = { gold: "border-[#f4c659] bg-[#594a28] text-[#ffe695]", mint: "border-[#74e2b1] bg-[#24534a] text-[#b6f6d5]", violet: "border-[#aa97ff] bg-[#473d82] text-[#ded6ff]" };
  return <div className={`border-2 ${colors[tone]} px-2 py-2.5`}><div className="flex items-center gap-1.5 text-[10px] font-bold opacity-85">{icon}<span>{label}</span></div><p className="mt-1 text-xl font-black">{value}</p></div>;
}
function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="border-2 border-[#4c6089] bg-[#17243f] px-3 py-2"><p className="text-[11px] font-bold text-[#93a7cb]">{label}</p><p className="mt-1 text-lg font-black text-[#fff8df]">{value}</p></div>; }
function ActivityRow({ icon, tone, title, detail }: { icon: React.ReactNode; tone: "gold" | "mint" | "violet"; title: string; detail: string }) { const color = { gold: "border-[#f4c659] text-[#f4c659]", mint: "border-[#74e2b1] text-[#74e2b1]", violet: "border-[#aa97ff] text-[#aa97ff]" }[tone]; return <div className="flex gap-3 py-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 ${color} bg-[#14213d]`}>{icon}</span><div><p className="text-sm font-extrabold text-[#f8f2d9]">{title}</p><p className="mt-1 text-xs leading-5 text-[#aebbd3]">{detail}</p></div></div>; }

function GradesView({ courses, system, gpa, numericAverage, termGpas, termNumericAverages, termRanks, onTermRankSave, courseForm, editingCourseId, setCourseForm, onOpen, onImport, importReport, fragmentImportError, onSave, onCancel, onDelete }: { courses: CourseRecord[]; system: GradePointSystem; gpa: number; numericAverage: number | null; termGpas: ReturnType<typeof getTermGpas>; termNumericAverages: ReturnType<typeof getTermNumericAverages>; termRanks: Record<string, TermRank>; onTermRankSave: (term: string, rank: TermRank | null) => void; courseForm: Omit<CourseRecord, "id"> | null; editingCourseId: string | null; setCourseForm: React.Dispatch<React.SetStateAction<Omit<CourseRecord, "id"> | null>>; onOpen: (course?: CourseRecord) => void; onImport: () => void; importReport: { courseCount: number; skillNames: string[]; xpGain: number; leveledUp: boolean } | null; fragmentImportError: string | null; onSave: () => void; onCancel: () => void; onDelete: (id: string) => void }) {
  const grouped = Array.from(new Set(courses.map(course => course.term))).sort((a, b) => b.localeCompare(a, "zh-Hant"));
  return <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px] animate-pop-in">
    <Panel className="overflow-hidden"><PanelTitle eyebrow="GRADE SCROLL" title="成績卷軸" action={<div className="flex flex-wrap gap-2"><PixelButton onClick={onImport} className="bg-[#4a3d95]"><ScrollText size={17} /> 匯入成績單</PixelButton><PixelButton onClick={() => onOpen()} className="bg-[#f4c659] text-[#152544]"><Plus size={17} /> 新增課程</PixelButton></div>} />
      <div className="p-4 sm:p-5">{fragmentImportError && <div className="mb-5 border-2 border-[#e8817a] bg-[#4a2d35] p-4 text-sm font-bold leading-6 text-[#ffd7d2]">{fragmentImportError}</div>}{importReport && <div className="mb-5 border-2 border-[#f4c659] bg-[#4d4024] p-4 shadow-[3px_3px_0_#080d1f]"><p className="pixel-font text-[8px] leading-5 text-[#ffe797]">TRANSCRIPT LOOT ACQUIRED</p><p className="mt-2 font-black text-[#fff8df]">已匯入 {importReport.courseCount} 門課程，獲得 +{importReport.xpGain} XP{importReport.leveledUp ? "，角色已升級！" : "。"}</p><p className="mt-2 text-xs leading-5 text-[#e2d3a4]">新解鎖能力：{importReport.skillNames.length ? importReport.skillNames.join("、") : "已存在的能力標籤已強化"}</p></div>}<div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5"><SmallMetric label="累計 GPA" value={gpa.toFixed(2)} /><SmallMetric label="數字總平均" value={numericAverage === null ? "—" : numericAverage.toFixed(2)} /><SmallMetric label="計算制度" value={system} /><SmallMetric label="課程總數" value={`${courses.length}`} /><SmallMetric label="學期數" value={`${termGpas.length}`} /></div><p className="mb-4 text-xs leading-5 text-[#aebfdb]">數字平均只使用已輸入的百分制成績並依學分加權；只有等第的課程不會被系統自行換算成分數。</p>
      {grouped.length === 0 ? <EmptyState icon={<ScrollText />} title="卷軸仍是空白" detail="新增第一門課程，開始記錄你的學術冒險。" action={() => onOpen()} /> : <div className="space-y-5">{grouped.map(term => { const entries = courses.filter(course => course.term === term); const termGpa = termGpas.find(item => item.term === term)?.gpa ?? 0; const termAverage = termNumericAverages.find(item => item.term === term)?.average; return <div key={term}><div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#4e638c] pb-2"><p className="pixel-font text-[9px] leading-5 text-[#f4c659]">{term} TERM</p><div className="flex flex-wrap items-center gap-3"><span className="text-xs font-black text-[#d9e5fb]">學期 GPA <b className="ml-1 text-base text-[#f4c659]">{termGpa.toFixed(2)}</b></span><span className="text-xs font-black text-[#d9e5fb]">數字平均 <b className="ml-1 text-base text-[#74e2b1]">{termAverage === undefined ? "—" : termAverage.toFixed(2)}</b></span></div></div><TermRankEditor term={term} value={termRanks[term]} onSave={onTermRankSave} /><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs text-[#9caed0]"><tr><th className="pb-2 pl-2">課程</th><th className="pb-2">類別</th><th className="pb-2 text-center">學分</th><th className="pb-2 text-center">數字成績</th><th className="pb-2 text-center">等第</th><th className="pb-2 text-center">點數</th><th className="pb-2 text-right">操作</th></tr></thead><tbody>{entries.map(course => <tr key={course.id} className="border-t-2 border-[#334b73] hover:bg-[#213554]"><td className="py-3 pl-2 font-bold text-[#fff8df]">{course.name}</td><td><span className={`inline-flex px-2 py-1 text-xs font-black ${categoryTone[course.category]}`}>{categoryLabel[course.category]}</span></td><td className="text-center font-bold text-[#d8e4fc]">{course.credits}</td><td className="text-center font-bold text-[#74e2b1]">{course.numericScore === undefined ? "—" : course.numericScore.toFixed(2)}</td><td className="text-center"><span className="inline-flex min-w-9 justify-center border-2 border-[#f4c659] bg-[#4e4023] px-2 py-1 font-black text-[#ffe58e]">{course.grade}</span></td><td className="text-center font-bold text-[#bcd1f6]">{getGradePoint(course.grade, system).toFixed(1)}</td><td className="pr-2 text-right"><button onClick={() => onOpen(course)} className="mr-2 p-1.5 text-[#b9c8e6] hover:text-[#f4c659]" aria-label={`編輯 ${course.name}`}><Pencil size={16} /></button><button onClick={() => window.confirm(`確定刪除「${course.name}」嗎？`) && onDelete(course.id)} className="p-1.5 text-[#b9c8e6] hover:text-[#f28682]" aria-label={`刪除 ${course.name}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></div>; })}</div>}</div>
    </Panel>
    <div className="space-y-4"><RecognitionStatusSummaryV2 courses={courses} /><CourseNoteSummary courses={courses} /><CourseEditor form={courseForm} editing={Boolean(editingCourseId)} setForm={setCourseForm} onSave={onSave} onCancel={onCancel} /></div>
  </div>;
}

function TermRankEditor({ term, value, onSave }: { term: string; value?: TermRank; onSave: (term: string, rank: TermRank | null) => void }) {
  const [rank, setRank] = useState(value ? String(value.rank) : "");
  const [cohortSize, setCohortSize] = useState(value ? String(value.cohortSize) : "");
  useEffect(() => { setRank(value ? String(value.rank) : ""); setCohortSize(value ? String(value.cohortSize) : ""); }, [value?.cohortSize, value?.rank]);
  const save = () => {
    const parsedRank = Number(rank);
    const parsedCohortSize = Number(cohortSize);
    if (!rank && !cohortSize) return onSave(term, null);
    if (!Number.isInteger(parsedRank) || !Number.isInteger(parsedCohortSize) || parsedRank < 1 || parsedCohortSize < 1 || parsedRank > parsedCohortSize) return;
    onSave(term, { rank: parsedRank, cohortSize: parsedCohortSize });
  };
  return <div className="flex flex-wrap items-end gap-2 border-2 border-[#4d638d] bg-[#15233f] p-3"><div className="mr-1"><p className="text-xs font-black text-[#fff8df]">官方學期排名</p><p className="mt-1 text-[11px] leading-4 text-[#9fb1d3]">請依校方成績單手動輸入；系統不會自行推測。</p></div><label className="text-[11px] font-bold text-[#b7c9e7]">名次<input aria-label={`${term} 官方排名`} type="number" min="1" value={rank} onChange={event => setRank(event.target.value)} onBlur={save} placeholder="例如 12" className="pixel-input mt-1 block w-20 px-2 py-1.5 text-center text-xs" /></label><span className="pb-2 text-[#8ea3ca]">／</span><label className="text-[11px] font-bold text-[#b7c9e7]">總人數<input aria-label={`${term} 排名總人數`} type="number" min="1" value={cohortSize} onChange={event => setCohortSize(event.target.value)} onBlur={save} placeholder="例如 85" className="pixel-input mt-1 block w-20 px-2 py-1.5 text-center text-xs" /></label><PixelButton onClick={save} className="bg-[#315b75] px-3 py-1.5 text-xs">儲存排名</PixelButton>{value && <button onClick={() => { setRank(""); setCohortSize(""); onSave(term, null); }} className="px-2 py-1.5 text-xs font-bold text-[#b8c9e6] hover:text-[#f28682]">清除</button>}</div>;
}

function CourseEditor({ form, editing, setForm, onSave, onCancel }: { form: Omit<CourseRecord, "id"> | null; editing: boolean; setForm: React.Dispatch<React.SetStateAction<Omit<CourseRecord, "id"> | null>>; onSave: () => void; onCancel: () => void }) {
  return <Panel className="h-fit overflow-hidden 2xl:sticky 2xl:top-5"><PanelTitle eyebrow="COURSE EDITOR" title={form ? editing ? "編輯課程" : "新增課程" : "準備書寫"} action={<BookOpen className="text-[#f4c659]" />} /><div className="p-5">{!form ? <EmptyState icon={<Plus />} title="新增一則紀錄" detail="將每一次修課成果收入卷軸，GPA 與學分進度會自動更新。" /> : <div className="space-y-4"><Field label="課程名稱"><input value={form.name} onChange={event => setForm(current => current && { ...current, name: event.target.value })} placeholder="例如：演算法" className="pixel-input w-full px-3 py-2.5" /></Field><div className="grid grid-cols-2 gap-3"><Field label="學期"><input value={form.term} onChange={event => setForm(current => current && { ...current, term: event.target.value })} placeholder="114-2" className="pixel-input w-full px-3 py-2.5" /></Field><Field label="學分"><input type="number" min="1" max="12" value={form.credits} onChange={event => setForm(current => current && { ...current, credits: Number(event.target.value) })} className="pixel-input w-full px-3 py-2.5" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="成績等第"><select value={form.grade} onChange={event => setForm(current => current && { ...current, grade: event.target.value as LetterGrade })} className="pixel-input w-full px-3 py-2.5">{gradeOptions.map(grade => <option key={grade}>{grade}</option>)}</select></Field><Field label="數字成績（選填）"><input type="number" min="0" max="100" step="0.01" value={form.numericScore ?? ""} onChange={event => { const raw = event.target.value; setForm(current => current && { ...current, numericScore: raw === "" ? undefined : Number(raw) }); }} placeholder="例如：88" className="pixel-input w-full px-3 py-2.5" /><p className="mt-1.5 text-[11px] leading-5 text-[#91a5c8]">用於百分制平均；若成績單只有等第可留白。</p></Field></div><Field label="課程類別"><select value={form.category} onChange={event => setForm(current => current && { ...current, category: event.target.value as CourseCategory })} className="pixel-input w-full px-3 py-2.5">{Object.entries(categoryLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="畢業學分認列"><select value={form.recognition ?? "standard"} onChange={event => setForm(current => current && { ...current, recognition: event.target.value as CreditRecognition })} className="pixel-input w-full px-3 py-2.5">{Object.entries(recognitionLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><p className="mt-1.5 text-[11px] leading-5 text-[#91a5c8]">所有正式成績都計入 GPA；請在「課程類別」選擇「不分系必修」以保留 GPA、固定排除電通系畢業總學分、系必修、專業選修與校共同／通識進度。</p></Field><div className="flex gap-3 pt-2"><PixelButton onClick={onSave} disabled={!form.name.trim() || !form.term.trim() || (form.numericScore !== undefined && (!Number.isFinite(form.numericScore) || form.numericScore < 0 || form.numericScore > 100))} className="flex-1 bg-[#f4c659] text-[#162442]"><ShieldCheck size={16} /> 儲存紀錄</PixelButton><PixelButton onClick={onCancel} className="bg-[#33486c]"><X size={16} /></PixelButton></div></div>}</div></Panel>;
}

function TranscriptMappingWizard({ open, headers, sample, mapping, onChange, onApply, onClose }: { open: boolean; headers: string[]; sample: string[]; mapping: TranscriptFieldMap; onChange: (mapping: TranscriptFieldMap) => void; onApply: () => void; onClose: () => void }) {
  const fields: TranscriptField[] = ["term", "name", "credits", "grade", "category", "recognition"];
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-4 border-[#a998ff] bg-[#172640] p-0 text-[#e8f0ff] shadow-[7px_7px_0_#080d1f]"><DialogHeader className="border-b-2 border-[#5b719c] px-5 pb-4 pt-5 text-left"><p className="pixel-font text-[8px] leading-5 text-[#c9bcff]">COLUMN MAPPING WIZARD · STEP 1/2</p><DialogTitle className="text-2xl font-black text-[#fff8df]">配對成績單欄位</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-[#b8c9e6]">系統無法完全辨識標題列。請將來源欄位配對至學業資料；課程名稱、學分、成績為必填，學期與類別可略過。</DialogDescription></DialogHeader><div className="space-y-5 p-5"><div className="overflow-x-auto border-2 border-[#415a86] bg-[#13213b]"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-[#263958] text-[#bfcdea]"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className="px-3 py-2 font-black">#{index + 1} {header || "（空白標題）"}</th>)}</tr></thead><tbody><tr>{headers.map((_, index) => <td key={index} className="border-t-2 border-[#334b73] px-3 py-2 text-[#d9e5fa]">{sample[index] || "—"}</td>)}</tr></tbody></table></div><div className="grid gap-3 sm:grid-cols-2"><p className="sm:col-span-2 text-xs leading-5 text-[#d6caff]"><b className="text-[#ffe797]">必要：</b>課程名稱、學分、成績。每個來源欄位僅能配對一次。</p>{fields.map(field => <Field key={field} label={`${transcriptFieldLabels[field]}${["name", "credits", "grade"].includes(field) ? "（必要）" : "（選填）"}`}><select value={mapping[field] === undefined ? "none" : String(mapping[field])} onChange={event => { const value = event.target.value; onChange({ ...mapping, [field]: value === "none" ? undefined : Number(value) }); }} className="pixel-input w-full px-3 py-2.5"><option value="none">不對應</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>#{index + 1} · {header || "（空白標題）"}</option>)}</select></Field>)}</div></div><DialogFooter className="border-t-2 border-[#5b719c] px-5 py-4"><PixelButton onClick={onClose} className="bg-[#33486c]"><X size={16} /> 返回修改資料</PixelButton><PixelButton onClick={onApply} className="bg-[#f4c659] text-[#152544]"><ShieldCheck size={16} /> 套用配對並預覽</PixelButton></DialogFooter></DialogContent></Dialog>;
}

function TranscriptImportDialog({ open, onOpenChange, text, preview, onTextChange, onFileChange, onPdfChange, isPdfConverting, pdfNote, onPreview, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; text: string; preview: TranscriptImportPreview | null; onTextChange: (text: string) => void; onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onPdfChange: (event: React.ChangeEvent<HTMLInputElement>) => void; isPdfConverting: boolean; pdfNote: string | null; onPreview: () => void; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-4 border-[#f4c659] bg-[#172640] p-0 text-[#e8f0ff] shadow-[7px_7px_0_#080d1f]"><DialogHeader className="border-b-2 border-[#5b719c] px-5 pb-4 pt-5 text-left"><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">TRANSCRIPT IMPORT TERMINAL</p><DialogTitle className="text-2xl font-black text-[#fff8df]">匯入成績單</DialogTitle><DialogDescription className="mt-1 max-w-2xl text-sm leading-6 text-[#b8c9e6]">貼上或上傳 CSV／TSV 純文字檔，或將文字型 PDF 交由 AI 轉為可預覽的 CSV。資料只有在你確認匯入後才會寫入此裝置。</DialogDescription></DialogHeader><div className="space-y-4 p-5"><div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><Field label="貼上成績資料"><textarea value={text} onChange={event => onTextChange(event.target.value)} rows={9} placeholder={"學期,課程名稱,學分,成績,類別\n115-1,統計學,3,A,必修\n115-1,資料庫系統,3,88,選修"} className="pixel-input min-h-48 w-full resize-y px-3 py-3 font-mono text-xs leading-6" /></Field><div className="space-y-3"><div className="border-2 border-dashed border-[#637aa4] bg-[#13213b] p-4"><p className="font-black text-[#fff8df]">上傳 CSV／TSV 文字檔</p><p className="mt-2 text-xs leading-5 text-[#a9bbda]">支援 .csv、.tsv、.txt，最大 500 KB。</p><label className="pixel-button pixel-corners mt-4 inline-flex cursor-pointer items-center gap-2 bg-[#31496f] px-4 py-2 text-sm font-bold text-[#fff8df]"><ScrollText size={16} /> 選擇文字檔<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" onChange={onFileChange} className="sr-only" /></label></div><div className="border-2 border-dashed border-[#a998ff] bg-[#1b2446] p-4"><p className="font-black text-[#fff8df]">AI PDF → CSV 轉換</p><p className="mt-2 text-xs leading-5 text-[#cfc7f5]">支援可選取文字的 PDF，最大 2 MB。按下後會暫時傳送 PDF 至伺服器擷取文字，再交由 AI 整理為 CSV；不會自動寫入成績，也不保留原始檔。</p><label className={`pixel-button pixel-corners mt-4 inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-bold ${isPdfConverting ? "cursor-wait bg-[#4c427b] text-[#ded6ff]" : "bg-[#5a48b9] text-[#fff8df]"}`}><FileText size={16} /> {isPdfConverting ? "AI 轉換中…" : "選擇 PDF 成績單"}<input type="file" accept=".pdf,application/pdf" disabled={isPdfConverting} onChange={onPdfChange} className="sr-only" /></label></div><div className="border-l-4 border-[#a998ff] pl-3 text-xs leading-5 text-[#d7ceff]"><p className="font-black">安全合併規則</p><p className="mt-1">同一學期＋同名課程將標記為重複並略過，不覆蓋既有紀錄。</p></div></div></div>{pdfNote && <div className="border-2 border-[#9c8df1] bg-[#332e65] p-3 text-xs leading-5 text-[#e4dfff]"><b className="text-[#fff2ad]">PDF 轉換結果：</b>{pdfNote}</div>}{preview && <div className="border-2 border-[#58709d] bg-[#13213b] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-[#fff8df]">解析預覽</p><p className="mt-1 text-xs text-[#aebfdb]">可新增 {preview.toImport.length} 筆 · 略過重複 {preview.duplicates.length} 筆 · 格式問題 {preview.issues.length} 列</p></div><span className="border-2 border-[#74e2b1] bg-[#1d4b44] px-2 py-1 text-xs font-black text-[#c7f7dc]">準備整併</span></div>{preview.toImport.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-[#aebfdb]"><tr><th className="pb-2">學期</th><th className="pb-2">課程</th><th className="pb-2">學分</th><th className="pb-2">等第</th><th className="pb-2">類別</th></tr></thead><tbody>{preview.toImport.map(course => <tr key={`${course.term}-${course.name}`} className="border-t-2 border-[#334b73]"><td className="py-2">{course.term}</td><td className="py-2 font-bold text-[#fff8df]">{course.name}</td><td className="py-2">{course.credits}</td><td className="py-2 text-[#ffe797]">{course.grade}</td><td className="py-2">{categoryLabel[course.category]}</td></tr>)}</tbody></table></div>}{preview.duplicates.length > 0 && <p className="mt-3 text-xs leading-5 text-[#e7c984]">已略過重複：{preview.duplicates.map(course => `${course.term} ${course.name}`).join("、")}</p>}{preview.issues.length > 0 && <div className="mt-3 border-l-4 border-[#ee817c] bg-[#4c2b35] p-3 text-xs leading-5 text-[#ffd1cf]">{preview.issues.slice(0, 3).map(issue => <p key={`${issue.row}-${issue.raw}`}>第 {issue.row || "—"} 列：{issue.message}</p>)}</div>}</div>}</div><DialogFooter className="border-t-2 border-[#5b719c] px-5 py-4"><PixelButton onClick={() => onOpenChange(false)} className="bg-[#33486c]"><X size={16} /> 取消</PixelButton>{preview ? <PixelButton onClick={onConfirm} disabled={!preview.toImport.length} className="bg-[#f4c659] text-[#152544]"><ShieldCheck size={16} /> 確認匯入 {preview.toImport.length} 筆</PixelButton> : <PixelButton onClick={onPreview} disabled={!text.trim() || isPdfConverting} className="bg-[#f4c659] text-[#152544]"><ScrollText size={16} /> 解析成績單</PixelButton>}</DialogFooter></DialogContent></Dialog>;
}

function RecognitionStatusSummary({ courses }: { courses: CourseRecord[] }) {
  const groups = (Object.keys(recognitionLabel) as CreditRecognition[]).map(recognition => ({ recognition, courses: courses.filter(course => (course.recognition ?? "standard") === recognition) })).filter(group => group.courses.length > 0);
  return <Panel className="overflow-hidden"><PanelTitle eyebrow="TRANSFER & CREDIT STATUS" title="轉系課程認列" action={<ScrollText className="text-[#74e2b1]" />} /><div className="space-y-3 p-4"><p className="text-xs leading-5 text-[#b7c7e2]">所有正式成績都計入 GPA；只有「外系已認列」或「一般／系內」會計入目前畢業學分。待確認認列與僅計 GPA 不會先增加電通系畢業進度。</p>{groups.length ? groups.map(group => <div key={group.recognition} className={`border-2 p-3 ${recognitionTone[group.recognition]}`}><p className="text-xs font-black">{recognitionLabel[group.recognition]} · {group.courses.length} 門</p><p className="mt-1 text-xs leading-5">{group.courses.map(course => `${course.term} ${course.name}`).join("、")}</p></div>) : <p className="border-2 border-dashed border-[#4d638d] p-3 text-xs leading-5 text-[#9dafcf]">尚未建立轉系或外系課程紀錄。匯入歷年成績後，可逐列標記認列狀態。</p>}</div></Panel>;
}

function CreditRecognitionMap({ courses }: { courses: CourseRecord[] }) {
  const groups = (Object.keys(recognitionLabel) as CreditRecognition[])
    .filter(recognition => recognition !== "standard")
    .map(recognition => ({ recognition, courses: courses.filter(course => (course.recognition ?? "standard") === recognition) }))
    .filter(group => group.courses.length > 0);
  return <Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="TRANSFER CREDIT MAP" title="轉系與外系學分狀態" action={<ScrollText className="text-[#74e2b1]" />} /><div className="p-5"><p className="text-sm leading-7 text-[#c8d7ec]">這裡列出會影響電通系畢業進度的外系課程狀態。所有列出的正式成績仍納入 GPA；待確認認列與僅計 GPA 的學分不會先加入畢業進度。</p>{groups.length ? <div className="mt-4 grid gap-3 md:grid-cols-3">{groups.map(group => { const credits = group.courses.reduce((total, course) => total + course.credits, 0); const countsTowardGraduation = group.recognition === "approved-external"; return <div key={group.recognition} className={`border-2 p-4 ${recognitionTone[group.recognition]}`}><p className="font-black">{recognitionLabel[group.recognition]}</p><p className="mt-2 text-xs leading-5">{group.courses.length} 門 · {credits} 學分</p><p className="mt-2 text-xs leading-5">{countsTowardGraduation ? "已納入電通系畢業學分" : "目前不納入電通系畢業學分"}</p><p className="mt-3 border-t border-current/30 pt-2 text-xs leading-5">{group.courses.map(course => `${course.term} ${course.name}`).join("、")}</p></div>; })}</div> : <p className="mt-4 border-2 border-dashed border-[#4d638d] p-3 text-xs leading-5 text-[#9dafcf]">尚未標記外系認列課程。可在成績卷軸或成績單匯入草稿逐列設定。</p>}</div></Panel>;
}

function CourseNoteSummary({ courses }: { courses: CourseRecord[] }) {
  const noted = courses.filter(course => course.note?.trim());
  if (!noted.length) return null;
  return <Panel className="overflow-hidden"><PanelTitle eyebrow="COURSE NOTES" title="課程備註" action={<BookOpen className="text-[#d7c8ff]" />} /><div className="space-y-3 p-4">{noted.map(course => <div key={course.id} className="border-2 border-[#8d7bca] bg-[#2f2958] p-3"><p className="text-xs font-black text-[#fff8df]">{course.term} · {course.name}</p><p className="mt-1 text-xs font-bold leading-5 text-[#e1d8ff]">{course.note}</p><p className="mt-1 text-[11px] leading-4 text-[#b8abd8]">成績與學分維持 {course.numericScore === undefined ? course.grade : `${course.numericScore} 分／${course.credits} 學分`}</p></div>)}</div></Panel>;
}

function RecognitionStatusSummaryV2({ courses }: { courses: CourseRecord[] }) {
  const undeclared = courses.filter(course => course.category === "undeclared-required");
  const groups = (Object.keys(recognitionLabel) as Array<Exclude<CreditRecognition, "gpa-only">>)
    .map(recognition => ({ recognition, courses: courses.filter(course => course.category !== "undeclared-required" && (course.recognition ?? "standard") === recognition) }))
    .filter(group => group.courses.length > 0);
  return <Panel className="overflow-hidden"><PanelTitle eyebrow="TRANSFER & CREDIT STATUS" title="轉系課程認列" action={<ScrollText className="text-[#74e2b1]" />} /><div className="space-y-3 p-4"><p className="text-xs leading-5 text-[#b7c7e2]">所有正式成績都計入 GPA。只有非「不分系必修」且標為一般／系內或外系已認列的課程，才會加入電通系畢業學分；不分系必修固定只計 GPA。</p>{groups.map(group => <div key={group.recognition} className={`border-2 p-3 ${recognitionTone[group.recognition]}`}><p className="text-xs font-black">{recognitionLabel[group.recognition]} · {group.courses.length} 門</p><p className="mt-1 text-xs leading-5">{group.courses.map(course => `${course.term} ${course.name}`).join("、")}</p></div>)}{undeclared.length > 0 && <div className="border-2 border-[#cf9bc9] bg-[#402d47] p-3 text-[#ffe0fa]"><p className="text-xs font-black">不分系必修 · {undeclared.length} 門 · {undeclared.reduce((total, course) => total + course.credits, 0)} 學分</p><p className="mt-1 text-xs leading-5">僅計入 GPA，不增加電通系畢業學分：{undeclared.map(course => `${course.term} ${course.name}`).join("、")}</p></div>}{!groups.length && !undeclared.length && <p className="border-2 border-dashed border-[#4d638d] p-3 text-xs leading-5 text-[#9dafcf]">尚未建立轉系、外系或不分系課程紀錄。匯入歷年成績後，可逐列設定類別與認列狀態。</p>}</div></Panel>;
}

function CreditRecognitionMapV2({ courses }: { courses: CourseRecord[] }) {
  const { approvedExternal, pending, undeclared } = getCreditRecognitionSummary(courses);
  const creditTotal = (items: CourseRecord[]) => items.reduce((total, course) => total + course.credits, 0);
  return <Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="TRANSFER CREDIT MAP" title="轉系與外系學分狀態" action={<ScrollText className="text-[#74e2b1]" />} /><div className="p-5"><p className="text-sm leading-7 text-[#c8d7ec]">已認列的外系課會納入電通系畢業進度；待確認認列與不分系必修都會保留在 GPA 與成績卷軸，但暫不增加畢業學分。</p>{approvedExternal.length || pending.length || undeclared.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{approvedExternal.length > 0 && <div className="border-2 border-[#74e2b1] bg-[#1d4b44] p-4 text-[#c7f7dc]"><p className="font-black">外系已認列</p><p className="mt-2 text-xs leading-5">{approvedExternal.length} 門 · {creditTotal(approvedExternal)} 學分</p><p className="mt-2 text-xs leading-5">已納入電通系畢業學分</p><p className="mt-3 border-t border-current/30 pt-2 text-xs leading-5">{approvedExternal.map(course => `${course.term} ${course.name}`).join("、")}</p></div>}{pending.length > 0 && <div className="border-2 border-[#f4c659] bg-[#4c4024] p-4 text-[#ffe797]"><p className="font-black">待確認認列</p><p className="mt-2 text-xs leading-5">{pending.length} 門 · {creditTotal(pending)} 學分</p><p className="mt-2 text-xs leading-5">計入 GPA，暫不納入電通系畢業學分</p><p className="mt-3 border-t border-current/30 pt-2 text-xs leading-5">{pending.map(course => `${course.term} ${course.name}`).join("、")}</p></div>}{undeclared.length > 0 && <div className="border-2 border-[#cf9bc9] bg-[#402d47] p-4 text-[#ffe0fa]"><p className="font-black">不分系必修</p><p className="mt-2 text-xs leading-5">{undeclared.length} 門 · {creditTotal(undeclared)} 學分</p><p className="mt-2 text-xs leading-5">僅計入 GPA，不納入電通系畢業學分</p><p className="mt-3 border-t border-current/30 pt-2 text-xs leading-5">{undeclared.map(course => `${course.term} ${course.name}`).join("、")}</p></div>}</div> : <p className="mt-4 border-2 border-dashed border-[#4d638d] p-3 text-xs leading-5 text-[#9dafcf]">尚未標記外系認列、待確認認列或不分系必修課程。</p>}</div></Panel>;
}

function CreditPlanningSummary({ status }: { status: ReturnType<typeof getCreditPlanStatus> }) {
  const labels: Record<(typeof status)[number]["category"], string> = { total: "畢業總學分", required: "電通系必修", elective: "專業選修", general: "校共同與通識" };
  return <Panel gold className="mb-4 overflow-hidden animate-pop-in"><PanelTitle eyebrow="PLAN VS. PROGRESS" title="規劃與實際進度" action={<BookOpen className="text-[#f4c659]" />} /><div className="p-5"><p className="max-w-3xl text-sm leading-7 text-[#c8d7ec]">這裡會把你已完成的學分與課程規劃表中的預計學分分開看。規劃能幫你估算缺口，但不會被當作已修學分，也不會影響 GPA。</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{status.map(row => <div key={row.category} className="border-2 border-[#4d638d] bg-[#15233f] p-3"><p className="font-black text-[#fff8df]">{labels[row.category]}</p><p className="mt-2 text-xs text-[#9fb2d2]">已完成 <b className="text-[#74e2b1]">{row.completedCredits}</b> · 規劃中 <b className="text-[#f4c659]">{row.plannedCredits}</b></p><p className="mt-2 text-sm font-black text-[#dce8ff]">規劃後尚差 <span className="text-[#f4c659]">{row.remainingAfterPlan}</span> 學分</p></div>)}</div></div></Panel>;
}

function CreditsView({ credits, goals, showEditor, setShowEditor, onGoalChange, onApplyCcee114Goals }: { credits: ReturnType<typeof calculateCredits>; goals: GraduationGoals; showEditor: boolean; setShowEditor: (show: boolean) => void; onGoalChange: (key: keyof GraduationGoals, value: number) => void; onApplyCcee114Goals: () => void }) {
  const commonTarget = ccee114CommonEducationTargets.chinese + ccee114CommonEducationTargets.english;
  const rows: { key: "total" | CourseCategory; label: string; done: number; target: number; tone: "gold" | "mint" | "violet" }[] = [ { key: "total", label: "畢業總學分", done: credits.total, target: goals.total, tone: "gold" }, { key: "required", label: "電通系必修主線", done: credits.required, target: goals.required, tone: "mint" }, { key: "elective", label: "專業選修支線", done: credits.elective, target: goals.elective, tone: "violet" }, { key: "common", label: "校內共同必修（國英文）", done: credits.common, target: commonTarget, tone: "violet" }, { key: "general", label: "通識探索（博雅＋校訂）", done: credits.general, target: Math.max(0, goals.general - commonTarget), tone: "gold" } ];
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] animate-pop-in"><Panel className="overflow-hidden"><PanelTitle eyebrow="CREDIT MAP" title="學分地圖" action={<PixelButton onClick={() => setShowEditor(!showEditor)}><Pencil size={16} /> 設定目標</PixelButton>} /><div className="p-5 sm:p-7"><div className="relative overflow-hidden border-4 border-[#50668f] bg-[#13213b] p-5 sm:p-8"><div className="absolute right-4 top-4 text-[#273e62]"><Compass size={96} strokeWidth={1} /></div><p className="pixel-font text-[9px] leading-6 text-[#f4c659]">GRADUATION ROUTE</p><h3 className="mt-3 max-w-lg text-2xl font-black text-[#fff8df]">還有 {Math.max(0, goals.total - credits.total)} 學分，抵達畢業城門。</h3><p className="mt-3 max-w-xl text-sm leading-7 text-[#afc0df]">系必修、專業選修、校內共同必修與通識各自追蹤；國英文不會計入電通系必修 51 學分。</p></div><div className="mt-6 space-y-5">{rows.map(row => { const remaining = Math.max(0, row.target - row.done); const percent = row.target ? (row.done / row.target) * 100 : 0; return <div key={row.key} className="border-2 border-[#4c628c] bg-[#172640] p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-extrabold text-[#fff8df]">{row.label}</p><p className="mt-1 text-xs text-[#aebfdd]">已修 {row.done} / {row.target} 學分</p></div><p className="text-sm font-black text-[#f4c659]">尚差 {remaining}</p></div><div className="mt-3"><ProgressBar value={percent} tone={row.tone} /></div></div>; })}</div></div></Panel><Panel className="h-fit overflow-hidden"><PanelTitle eyebrow="GOAL SETTINGS" title="畢業任務設定" action={<Target className="text-[#f4c659]" />} /><div className="p-5">{showEditor ? <div className="space-y-4"><p className="text-sm leading-6 text-[#b7c7e2]">變更後會立刻重算每條學分任務的剩餘距離。</p><PixelButton onClick={onApplyCcee114Goals} className="w-full bg-[#245d58] text-[#e1fff6]"><GraduationCap size={16} /> 套用電通系 114 目標（51／49／28／128）</PixelButton><GoalInput label="畢業總學分" value={goals.total} onChange={value => onGoalChange("total", value)} /><GoalInput label="電通系必修學分" value={goals.required} onChange={value => onGoalChange("required", value)} /><GoalInput label="專業選修學分" value={goals.elective} onChange={value => onGoalChange("elective", value)} /><GoalInput label="校共同與通識學分（含國英文）" value={goals.general} onChange={value => onGoalChange("general", value)} /><GoalInput label="剩餘學期" value={goals.semestersLeft} onChange={value => onGoalChange("semestersLeft", value)} /><PixelButton onClick={() => setShowEditor(false)} className="mt-2 w-full bg-[#f4c659] text-[#152544]"><ShieldCheck size={16} /> 套用任務設定</PixelButton></div> : <div className="space-y-4"><div className="border-2 border-[#48608b] bg-[#16243f] p-4"><p className="text-xs font-bold text-[#93a8ce]">目標學分結構</p><div className="mt-3 grid grid-cols-2 gap-3"><SmallMetric label="總學分" value={`${goals.total}`} /><SmallMetric label="剩餘學期" value={`${goals.semestersLeft}`} /><SmallMetric label="電通系必修" value={`${goals.required}`} /><SmallMetric label="專業選修＋校共同通識" value={`${goals.elective + goals.general}`} /></div></div><p className="text-sm leading-7 text-[#b6c5df]">校內共同必修的國英文會獨立顯示，但仍計入校共同與通識 28 學分及畢業總學分。設定不會上傳，會保留在這台裝置。</p><PixelButton onClick={() => setShowEditor(true)} className="w-full"><Pencil size={16} /> 調整畢業目標</PixelButton></div>}</div></Panel></div>;
}
function CceeCommonEducationMap({ courses }: { courses: CourseRecord[] }) {
  const rows = getCcee114CommonEducationProgress(courses);
  const recognition = getGeneralCreditRecognition(courses);
  const completed = rows.reduce((total, row) => total + row.credits, 0);
  const target = rows.reduce((total, row) => total + row.target, 0);
  return <Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="CCEE 114 COMMON EDUCATION" title="校共同與通識進度" action={<GraduationCap className="text-[#f4c659]" />} /><div className="p-5"><p className="max-w-3xl text-sm leading-7 text-[#c8d7ec]">電通系 114 校共同與通識合計 28 學分：中文 4、英文 8、博雅 14（至少三個不同課群）及校訂 2。博雅與校訂通識合計最多認列 16 學分；超出的及格通識仍會保留在成績、4.3 GPA 與百分制平均，但不增加畢業進度。</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rows.map(row => { const percent = row.target ? (row.credits / row.target) * 100 : 0; return <div key={row.id} className="border-2 border-[#4c628c] bg-[#172640] p-4"><div className="flex items-start justify-between gap-3"><p className="font-black text-[#fff8df]">{row.label}</p><span className={`border px-2 py-1 text-[10px] font-black ${row.remaining === 0 ? "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]" : "border-[#f4c659] bg-[#4c4024] text-[#ffe797]"}`}>{row.remaining === 0 ? "已達標" : `尚差 ${row.remaining}`}</span></div><p className="mt-3 text-xl font-black text-[#f4c659]">{row.credits} <span className="text-sm text-[#b7c8e4]">/ {row.target} 學分</span></p><div className="mt-3"><ProgressBar value={percent} tone={row.remaining === 0 ? "mint" : "gold"} /></div><p className="mt-3 text-xs leading-5 text-[#aebfdd]">{row.detail}</p></div>; })}</div><div className="mt-4 border-l-4 border-[#f4c659] bg-[#3e3421] px-4 py-3 text-sm leading-6 text-[#ffe9a4]">目前已在此四項累積 <b>{completed}</b>／{target} 學分；其中通識已修 <b>{recognition.attemptedCredits}</b> 學分、畢業認列 <b>{recognition.recognizedCredits}</b>／16 學分。{recognition.excessCredits > 0 ? `超額 ${recognition.excessCredits} 學分仍計入 GPA 與數字平均。` : "「博雅通識」會顯示已涵蓋的課群，方便檢查至少三個不同課群的規定。"}</div></div></Panel>;
}
function GoalInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c7d5ec]">{label}</span><input className="pixel-input w-full px-3 py-2.5" type="number" min="0" value={value} onChange={event => onChange(Number(event.target.value))} /></label>; }

function QuestView({ recommendations, goals, gpa, credits, completedProjects }: { recommendations: ReturnType<typeof buildCareerRecommendations>; goals: GraduationGoals; gpa: number; credits: ReturnType<typeof calculateCredits>; completedProjects: number }) {
  const completion = goals.total ? Math.round((credits.total / goals.total) * 100) : 0;
  return <div className="space-y-4 animate-pop-in"><Panel gold className="overflow-hidden"><div className="grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:p-8"><span className="crest mx-auto flex h-20 w-20 items-center justify-center bg-[#f4c659] text-[#1d3153] shadow-[5px_5px_0_#080d1f] md:mx-0"><WandSparkles size={38} /></span><div><p className="pixel-font text-[9px] leading-6 text-[#a28cff]">AI-STYLE QUEST GUIDE</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">下一學期的智慧任務</h2><p className="mt-4 max-w-3xl text-base leading-8 text-[#d6e0f1]">{recommendations.goal}</p><div className="mt-5 flex flex-wrap gap-2"><span className="border-2 border-[#f4c659] bg-[#4f4222] px-3 py-1.5 text-xs font-black text-[#ffe796]">建議修習 {recommendations.suggestedCredits} 學分</span><span className="border-2 border-[#74e2b1] bg-[#1f4d47] px-3 py-1.5 text-xs font-black text-[#c5f8dd]">目前 GPA {gpa.toFixed(2)}</span><span className="border-2 border-[#aa97ff] bg-[#443a78] px-3 py-1.5 text-xs font-black text-[#ded6ff]">已完成專題 {completedProjects}</span></div></div></div></Panel><div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="RECOMMENDED QUESTS" title="選課與成長建議" action={<Compass className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#42557d] px-5">{recommendations.suggestions.map((suggestion, index) => <div className="flex gap-4 py-5" key={suggestion}><span className="pixel-font flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#f4c659] bg-[#5a4923] text-[10px] text-[#fff0a8]">0{index + 1}</span><p className="pt-1 text-sm leading-7 text-[#d5e0f3]">{suggestion}</p></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="CAMPAIGN STATUS" title="冒險節奏" action={<BarChart3 className="text-[#f4c659]" />} /><div className="space-y-5 p-5"><div className="border-2 border-[#526896] bg-[#17243f] p-4"><div className="flex justify-between gap-3"><p className="font-extrabold text-[#fff8df]">畢業主線完成度</p><p className="font-black text-[#f4c659]">{completion}%</p></div><div className="mt-3"><ProgressBar value={completion} /></div><p className="mt-3 text-xs leading-5 text-[#a8bad8]">尚有 {recommendations.remainingCredits} 學分；分配至 {goals.semestersLeft} 個學期可維持穩定節奏。</p></div><div className="border-2 border-[#526896] bg-[#17243f] p-4"><p className="font-extrabold text-[#fff8df]">戰術提醒</p><p className="mt-2 text-sm leading-7 text-[#b7c7e3]">排課時先鎖定必修與有先修門檻的課程，再用通識或選修平衡每週負荷。每學期替作品集留下一個能完成、能展示的任務。</p></div><p className="border-l-4 border-[#aa97ff] pl-3 text-xs leading-6 text-[#c8bfff]">本頁推薦使用目前的 GPA、已修學分、分類缺口與剩餘學期即時計算；它不會替你讀取或傳送外部資料。</p></div></Panel></div></div>;
}

function CareerRealityPanel({ recommendations }: { recommendations: ReturnType<typeof buildCareerRecommendations> }) {
  return <Panel className="mt-4 overflow-hidden" gold>
    <PanelTitle eyebrow="ROLE REALITY CHECK" title={`${recommendations.profile.title}：能力與專題構想`} action={<Target className="text-[#f4c659]" />} />
    <div className="space-y-5 p-5">
      <div className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-4 py-3 text-sm leading-7 text-[#d6f7e6]">
        這裡的能力方向參考真實職務的典型工作活動，再轉為大學生可練習的作品集任務；實際職缺會因公司、地點與資歷而不同。{" "}
        <a className="font-black text-[#ffe797] underline underline-offset-4 hover:text-white" href={recommendations.careerEvidence.url} target="_blank" rel="noreferrer">查看 {recommendations.careerEvidence.label}</a>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {recommendations.workRequirements.map(requirement => <article key={requirement.skill} className="border-2 border-[#526995] bg-[#172640] p-4"><p className="font-black text-[#fff8df]">{requirement.skill}</p><p className="mt-2 text-xs leading-6 text-[#bbcae2]">{requirement.rationale}</p></article>)}
      </div>
      <div>
        <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">PORTFOLIO PROJECT QUESTS</p>
        <p className="mt-1 text-sm leading-6 text-[#c4d3e8]">選一項從最小可行成果開始；每個構想都包含可以被檢視的交付物，而不只是題目。</p>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {recommendations.projectIdeas.map((idea, index) => <article key={idea.title} className="border-2 border-[#66558f] bg-[#1e2549] p-4"><div className="flex items-start gap-3"><span className="pixel-font flex h-8 w-8 shrink-0 items-center justify-center border border-[#a998ff] bg-[#443a78] text-[10px] text-[#eee7ff]">0{index + 1}</span><div><h3 className="font-black text-[#fff8df]">{idea.title}</h3><p className="mt-2 text-sm leading-6 text-[#c9d5ed]">{idea.description}</p></div></div><div className="mt-4 border-t border-[#4d5e87] pt-3"><p className="text-[11px] font-black text-[#f4c659]">可交付成果</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#c8d7ee]">{idea.deliverables.map(item => <li key={item}>• {item}</li>)}</ul></div><div className="mt-3 flex flex-wrap gap-2">{idea.skills.map(skill => <span key={skill} className={`border px-2 py-1 text-xs font-black ${idea.gapSkills.includes(skill) ? "border-[#f4c659] bg-[#584923] text-[#ffe797]" : "border-[#5f739c] bg-[#24385b] text-[#d8e7ff]"}`}>{idea.gapSkills.includes(skill) ? "優先補強 · " : ""}{skill}</span>)}</div></article>)}
        </div>
      </div>
    </div>
  </Panel>;
}

function CareerQuestView({ recommendations, careerPath, onCareerPathChange, goals, gpa, credits, completedProjects }: { recommendations: ReturnType<typeof buildCareerRecommendations>; careerPath: CareerPath; onCareerPathChange: (path: CareerPath) => void; goals: GraduationGoals; gpa: number; credits: ReturnType<typeof calculateCredits>; completedProjects: number }) {
  const completion = goals.total ? Math.round((credits.total / goals.total) * 100) : 0;
  return <div className="space-y-4 animate-pop-in">
    <Panel gold className="overflow-hidden"><div className="p-5 sm:p-7"><p className="pixel-font text-[9px] leading-6 text-[#a28cff]">CAREER COMPASS ENGINE</p><div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-2xl font-black text-[#fff8df]">以職涯目標校正下一步</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[#d6e0f1]">系統會對照已修課程、先修條件、能力缺口、選修學分進度與專題標籤，分出現在可修與仍待解鎖的任務。</p></div><div className="border-2 border-[#a998ff] bg-[#30285f] px-4 py-3"><p className="text-xs font-bold text-[#cfc4ff]">{recommendations.profile.title} 就緒度</p><p className="mt-1 text-2xl font-black text-[#fff0a8]">{recommendations.readiness}%</p></div></div><p className="mt-4 border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-6 text-[#c9f8de]">{recommendations.planningContext}</p><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{careerProfiles.map(profile => <button key={profile.id} onClick={() => onCareerPathChange(profile.id)} className={`pixel-corners border-2 px-3 py-3 text-left transition-colors ${careerPath === profile.id ? "border-[#f4c659] bg-[#5b4b26] text-[#fff2b0] shadow-[3px_3px_0_#080d1f]" : "border-[#586e99] bg-[#1d2d4c] text-[#c9d8f2] hover:bg-[#2b4165]"}`}><span className="text-sm font-black">{profile.shortTitle}</span><span className="mt-1 block text-xs leading-5 opacity-80">{profile.description}</span></button>)}</div></div></Panel>
    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="UNLOCKED COURSE QUESTS" title="現在可修的關鍵課程" action={<BookOpen className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#40557c] px-5">{recommendations.recommendedCourses.map((course, index) => <div key={course.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="pixel-font flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#74e2b1] bg-[#1f4d47] text-[10px] text-[#c9ffde]">0{index + 1}</span><div><p className="font-black text-[#fff8df]">{course.name}</p><p className="mt-1 text-xs leading-5 text-[#afc0dd]">{course.description}</p></div></div><span className="border-2 border-[#f4c659] bg-[#514323] px-2 py-1 text-xs font-black text-[#ffe797]">適配 {course.careerFit[careerPath]}%</span></div><div className="mt-3 flex flex-wrap gap-2 pl-12">{course.skills.map(skill => <span key={skill} className="border border-[#5e739c] bg-[#24375a] px-2 py-1 text-xs font-bold text-[#d6e5ff]">{skill}</span>)}<span className="border border-[#6ee1af] bg-[#1e4d46] px-2 py-1 text-xs font-black text-[#bdf8d7]">可立即修習</span></div></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="ABILITY GAP" title="能力缺口與專題任務" action={<WandSparkles className="text-[#f4c659]" />} /><div className="p-5"><div className="border-2 border-[#536994] bg-[#172640] p-4"><p className="text-xs font-bold text-[#aebfdf]">優先補強能力</p><div className="mt-3 flex flex-wrap gap-2">{recommendations.skillGaps.length ? recommendations.skillGaps.map(skill => <span key={skill} className="border-2 border-[#aa97ff] bg-[#40376f] px-2 py-1 text-xs font-black text-[#ded6ff]">{skill}</span>) : <span className="text-sm font-bold text-[#9af0c3]">核心能力已完整，適合挑戰整合型專題。</span>}</div></div><div className="mt-4 border-2 border-[#f4c659] bg-[#3f3521] p-4"><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">PORTFOLIO SIDE QUEST</p><h3 className="mt-2 font-black text-[#fff8df]">{recommendations.projectSuggestion.title}</h3><p className="mt-2 text-sm leading-7 text-[#d3dfef]">{recommendations.projectSuggestion.description}</p><p className="mt-3 border-l-4 border-[#a998ff] pl-3 text-xs leading-6 text-[#d7ccff]">{recommendations.projectSuggestion.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{recommendations.projectSuggestion.skills.map(skill => <span key={skill} className="border border-[#f4c659] px-2 py-1 text-xs font-black text-[#ffe797]">#{skill}</span>)}</div></div></div></Panel></div>
    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="PREREQUISITE GATES" title="待解鎖的進階課程" action={<Target className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#40557c] px-5">{recommendations.lockedCourses.map(course => <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-black text-[#d7e2f6]">{course.name}</p><p className="mt-1 text-xs leading-5 text-[#9eb1d0]">尚缺先修：{course.missingPrerequisites.join("、")}</p></div><span className="inline-flex items-center gap-1 border-2 border-[#677996] bg-[#243451] px-2 py-1 text-xs font-black text-[#c4d2e9]"><CircleHelp size={14} /> 先修未完成</span></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="CAMPAIGN STATUS" title="本學期戰術摘要" action={<BarChart3 className="text-[#f4c659]" />} /><div className="space-y-4 p-5"><SmallMetric label="目前 GPA" value={gpa.toFixed(2)} /><SmallMetric label="畢業主線" value={`${completion}%`} /><SmallMetric label="建議學分節奏" value={`${recommendations.suggestedCredits} 學分／學期`} /><div className="border-l-4 border-[#74e2b1] bg-[#183d3a] p-3 text-xs leading-6 text-[#c5f5dc]">{recommendations.goal}</div><p className="text-xs leading-6 text-[#aebfdd]">已完成專題 {completedProjects} 項；將上方建議專題加入工坊，可持續追蹤作品集成長。</p></div></Panel></div>
  </div>;
}

function AchievementRecordsView({ records, academicSkills, notice, uploading, onAdd, onUpdate, onDelete, onUpload }: { records: AchievementRecord[]; academicSkills: string[]; notice: string | null; uploading: boolean; onAdd: (kind: AchievementRecordKind) => void; onUpdate: (id: string, patch: Partial<AchievementRecord>) => void; onDelete: (id: string) => void; onUpload: (recordId: string, file: File) => Promise<void> }) {
  const statusTone: Record<AchievementRecordStatus, string> = { planning: "border-[#8095bc] bg-[#243955] text-[#dbe8ff]", "in-progress": "border-[#c49dff] bg-[#4a3674] text-[#eee0ff]", earned: "border-[#74e2b1] bg-[#225246] text-[#d5ffe7]", completed: "border-[#f4c659] bg-[#5b4a22] text-[#fff0b6]" };
  const totalEvidence = records.reduce((sum, record) => sum + record.evidence.length, 0);
  const suggestions = [
    !records.some(record => record.kind === "certificate" && ["earned", "completed"].includes(record.status)) ? "先建立一項最想取得的證照，填入目標日期與準備範圍，讓它成為下一個可追蹤的里程碑。" : "為已取得的證照補上證書圖片與可公開查驗連結，讓作品集更完整。",
    !records.some(record => record.kind === "competition") ? "若想累積可展示成果，可先建立一個想參加的比賽紀錄，寫下主題、截止日與預計作品。" : "為正在進行的比賽至少加入一筆進度紀錄與一張成果圖，日後整理作品集會更有效率。",
    academicSkills.length ? `你目前的學業能力標籤包含「${academicSkills.slice(0, 3).join("、")}」，可優先選擇能讓這些能力產出可展示作品的證照或比賽。` : "先把已修課程與職涯方向補齊，系統便能給出更貼近你能力背景的成果建議。",
  ];
  return <div className="space-y-4 animate-pop-in"><Panel gold className="overflow-hidden"><div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="pixel-font text-[8px] text-[#f4c659]">PERSONAL EVIDENCE VAULT</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">證照與比賽紀錄</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#c9d7ee]">集中保存你的證照、競賽、參與成果與準備歷程。圖片與影片會存入私人附件空間，只有本人登入後才可開啟；外部連結則建議只放你願意公開的網址。</p></div><div className="grid grid-cols-2 gap-2 self-end"><SmallMetric label="成果紀錄" value={`${records.length}`} /><SmallMetric label="附件數" value={`${totalEvidence}`} /></div></div></Panel><div className="grid gap-4 lg:grid-cols-3">{suggestions.map((suggestion, index) => <Panel key={suggestion} className="p-4"><p className="pixel-font text-[8px] text-[#f4c659]">NEXT STEP {index + 1}</p><p className="mt-2 text-sm leading-6 text-[#d5e1f5]">{suggestion}</p></Panel>)}</div><Panel className="overflow-hidden"><PanelTitle eyebrow="ADD AN ACHIEVEMENT" title="建立你的成果紀錄" action={<Trophy className="text-[#f4c659]" />} /><div className="flex flex-wrap gap-3 p-5"><PixelButton onClick={() => onAdd("certificate")} className="bg-[#f4c659] text-[#152544]"><Plus size={16} /> 新增證照</PixelButton><PixelButton onClick={() => onAdd("competition")} className="bg-[#5a48b9]"><Plus size={16} /> 新增比賽</PixelButton></div></Panel>{notice && <p className="border-l-4 border-[#74e2b1] bg-[#173f3b] px-4 py-3 text-sm text-[#d7ffe9]">{notice}</p>}{records.length === 0 ? <Panel><EmptyState icon={<Trophy />} title="建立第一份可展示的成果" detail="可以從正在準備的證照、想參加的比賽，或已完成但尚未整理的成果開始。" action={() => onAdd("certificate")} /></Panel> : <div className="grid gap-4 xl:grid-cols-2">{records.map(record => <AchievementRecordCard key={record.id} record={record} statusTone={statusTone} uploading={uploading} onUpdate={onUpdate} onDelete={onDelete} onUpload={onUpload} />)}</div>}</div>;
}

function AchievementRecordCard({ record, statusTone, uploading, onUpdate, onDelete, onUpload }: { record: AchievementRecord; statusTone: Record<AchievementRecordStatus, string>; uploading: boolean; onUpdate: (id: string, patch: Partial<AchievementRecord>) => void; onDelete: (id: string) => void; onUpload: (recordId: string, file: File) => Promise<void> }) {
  const [linkValue, setLinkValue] = useState("");
  const updateSkills = (value: string) => onUpdate(record.id, { skills: Array.from(new Set(value.split(/[，,]/).map(skill => skill.trim()).filter(Boolean))) });
  const addLink = () => {
    try {
      const url = new URL(linkValue);
      if (!/^https?:$/.test(url.protocol)) throw new Error();
      const evidence: AchievementEvidence = { id: crypto.randomUUID(), name: url.hostname, kind: "link", externalUrl: url.toString(), createdAt: new Date().toISOString() };
      onUpdate(record.id, { evidence: [...record.evidence, evidence] });
      setLinkValue("");
    } catch { setLinkValue(""); }
  };
  const removeEvidence = (evidenceId: string) => onUpdate(record.id, { evidence: record.evidence.filter(evidence => evidence.id !== evidenceId) });
  return <Panel className="overflow-hidden"><div className="flex items-start justify-between gap-3 border-b-2 border-[#4b638f] p-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center border-2 ${record.kind === "certificate" ? "border-[#f4c659] bg-[#594a28] text-[#ffe797]" : "border-[#aa98ff] bg-[#443c7d] text-[#e5dfff]"}`}><Trophy size={19} /></span><div><p className="pixel-font text-[8px] text-[#9fb5d8]">{achievementRecordKindLabel[record.kind]}</p><input value={record.title} onChange={event => onUpdate(record.id, { title: event.target.value })} aria-label="成果名稱" className="mt-1 w-full bg-transparent text-lg font-black text-[#fff8df] outline-none placeholder:text-[#7388ad]" placeholder="輸入名稱" /></div></div><button onClick={() => onDelete(record.id)} className="p-2 text-[#adbfdf] hover:text-[#f28682]" aria-label={`刪除 ${record.title}`}><Trash2 size={18} /></button></div><div className="space-y-4 p-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="狀態"><select value={record.status} onChange={event => onUpdate(record.id, { status: event.target.value as AchievementRecordStatus })} className={`pixel-input w-full px-3 py-2 font-bold ${statusTone[record.status]}`}>{Object.entries(achievementRecordStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="主辦單位"><input value={record.organizer ?? ""} onChange={event => onUpdate(record.id, { organizer: event.target.value || undefined })} placeholder="例如：主辦單位名稱" className="pixel-input w-full px-3 py-2" /></Field><Field label="目標／截止日期"><input type="date" value={record.targetDate ?? ""} onChange={event => onUpdate(record.id, { targetDate: event.target.value || undefined })} className="pixel-input w-full px-3 py-2" /></Field><Field label="取得／完成日期"><input type="date" value={record.achievedDate ?? ""} onChange={event => onUpdate(record.id, { achievedDate: event.target.value || undefined })} className="pixel-input w-full px-3 py-2" /></Field></div><Field label="內容與準備紀錄"><textarea rows={3} value={record.description ?? ""} onChange={event => onUpdate(record.id, { description: event.target.value || undefined })} placeholder="記錄考試範圍、比賽主題、準備方式或作品內容…" className="pixel-input w-full resize-y px-3 py-2" /></Field><Field label="成果／名次／反思"><textarea rows={2} value={record.result ?? ""} onChange={event => onUpdate(record.id, { result: event.target.value || undefined })} placeholder="例如：成績、名次、心得或可公開的成果說明…" className="pixel-input w-full resize-y px-3 py-2" /></Field><Field label="能力標籤（以逗號分隔）"><input value={record.skills.join("、")} onChange={event => updateSkills(event.target.value)} placeholder="例如：Python、資料分析、簡報" className="pixel-input w-full px-3 py-2" /></Field><div className="border-t-2 border-[#415b84] pt-4"><p className="pixel-font text-[8px] text-[#93a7cb]">PRIVATE EVIDENCE</p><p className="mt-1 text-xs leading-5 text-[#b9cbe6]">上傳圖片或影片（每個檔案最多 20 MB），或新增公開作品連結。移除附件會讓它不再被私人頁面引用。</p><div className="mt-3 flex flex-wrap gap-2"><label className="pixel-button pixel-corners inline-flex cursor-pointer items-center gap-2 bg-[#245d58] px-3 py-2 text-sm font-bold text-[#e1fff6]"><FileText size={15} /> {uploading ? "上傳中…" : "上傳圖片／影片"}<input disabled={uploading} type="file" accept="image/*,video/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void onUpload(record.id, file); event.currentTarget.value = ""; }} /></label><div className="flex min-w-56 flex-1 gap-2"><input type="url" value={linkValue} onChange={event => setLinkValue(event.target.value)} placeholder="貼上作品或影片網址" className="pixel-input min-w-0 flex-1 px-3 py-2 text-sm" /><PixelButton onClick={addLink} disabled={!linkValue.trim()} className="bg-[#344e78] px-3 disabled:opacity-50">新增連結</PixelButton></div></div>{record.evidence.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{record.evidence.map(evidence => <article key={evidence.id} className="overflow-hidden border-2 border-[#48628d] bg-[#172a47]"><div className="aspect-video bg-[#0d1830]">{evidence.kind === "image" && evidence.storageKey ? <img src={`/api/private-media/${evidence.id}`} alt={evidence.name} className="h-full w-full object-cover" /> : evidence.kind === "video" && evidence.storageKey ? <video controls className="h-full w-full" src={`/api/private-media/${evidence.id}`} /> : <div className="grid h-full place-items-center p-4 text-center"><a href={evidence.externalUrl} target="_blank" rel="noreferrer" className="font-bold text-[#a8cdfd] underline">開啟：{evidence.name}</a></div>}</div><div className="flex items-center justify-between gap-2 p-2"><span className="truncate text-xs font-bold text-[#d8e5fb]">{evidence.name}</span><button onClick={() => removeEvidence(evidence.id)} className="shrink-0 text-xs text-[#b9c9e2] hover:text-[#f28682]">移除</button></div></article>)}</div>}</div></div></Panel>;
}

function ProjectsView({ projects, projectForm, editingProjectId, setProjectForm, onOpen, onSave, onCancel, onDelete }: { projects: ProjectRecord[]; projectForm: Omit<ProjectRecord, "id"> | null; editingProjectId: string | null; setProjectForm: React.Dispatch<React.SetStateAction<Omit<ProjectRecord, "id"> | null>>; onOpen: (project?: ProjectRecord) => void; onSave: () => void; onCancel: () => void; onDelete: (id: string) => void }) {
  return <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px] animate-pop-in"><Panel className="overflow-hidden"><PanelTitle eyebrow="PROJECT WORKSHOP" title="專題工坊" action={<PixelButton onClick={() => onOpen()} className="bg-[#f4c659] text-[#152544]"><Plus size={17} /> 新增專題</PixelButton>} /><div className="p-5">{projects.length === 0 ? <EmptyState icon={<FolderKanban />} title="工坊尚未開張" detail="新增第一個專題，將構想與成果變成冒險紀錄。" action={() => onOpen()} /> : <div className="grid gap-4 md:grid-cols-2">{[...projects].sort((a,b) => b.startDate.localeCompare(a.startDate)).map(project => <article key={project.id} className="border-3 border-[#536994] bg-[#172640] shadow-[3px_3px_0_#080d1f]"><div className="flex items-start justify-between gap-3 border-b-2 border-[#435a82] p-4"><div><span className={`inline-flex px-2 py-1 text-xs font-black text-white ${statusTone[project.status]}`}>{statusLabel[project.status]}</span><h3 className="mt-3 text-lg font-black text-[#fff8df]">{project.name}</h3></div><div className="flex gap-1"><button onClick={() => onOpen(project)} className="p-1.5 text-[#b9c9e6] hover:text-[#f4c659]" aria-label={`編輯 ${project.name}`}><Pencil size={16} /></button><button onClick={() => window.confirm(`確定刪除「${project.name}」嗎？`) && onDelete(project.id)} className="p-1.5 text-[#b9c9e6] hover:text-[#f28682]" aria-label={`刪除 ${project.name}`}><Trash2 size={16} /></button></div></div><div className="p-4"><p className="min-h-14 text-sm leading-7 text-[#c0d0e9]">{project.description || "尚未填寫專題描述。"}</p><div className="mt-4 flex flex-wrap gap-2">{project.tags.length ? project.tags.map(tag => <span key={tag} className="border border-[#63799f] bg-[#263a5d] px-2 py-1 text-xs font-bold text-[#cde0ff]">#{tag}</span>) : <span className="text-xs text-[#91a5c7]">尚未設定技術標籤</span>}</div><p className="mt-4 border-t-2 border-[#3e557d] pt-3 text-xs font-bold text-[#a9bad8]">{project.startDate || "未設定"} <span className="mx-1 text-[#f4c659]">→</span> {project.endDate || "未設定"}</p></div></article>)}</div>}</div></Panel><ProjectEditor form={projectForm} editing={Boolean(editingProjectId)} setForm={setProjectForm} onSave={onSave} onCancel={onCancel} /></div>;
}

function NotionProjectWorkspace({ workspaces, onUpdate }: { workspaces: WorkspaceProject[]; onUpdate: (projectId: string, update: (project: WorkspaceProject) => WorkspaceProject) => void }) {
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  if (!workspaces.length) return null;

  function updateDailyLog(project: WorkspaceProject, patch: (current: { id: string; date: string; completedTaskIds: string[]; minutes?: number; note?: string }) => { id: string; date: string; completedTaskIds: string[]; minutes?: number; note?: string }, taskPatch?: { id: string; checked: boolean }) {
    onUpdate(project.id, current => {
      const existing = current.dailyLogs ?? [];
      const currentLog = existing.find(log => log.date === activeDate) ?? { id: crypto.randomUUID(), date: activeDate, completedTaskIds: [] };
      const nextLog = patch(currentLog);
      const dailyLogs = [...existing.filter(log => log.date !== activeDate), nextLog].sort((a, b) => b.date.localeCompare(a.date));
      const tasks = taskPatch ? current.tasks.map(task => task.id !== taskPatch.id ? task : { ...task, status: (taskPatch.checked ? "done" : task.status === "done" ? "not-started" : task.status) as WorkspaceTaskStatus }) : current.tasks;
      return { ...current, members: [], dailyLogs, tasks };
    });
  }

  return <Panel className="mt-4 overflow-hidden" gold>
    <PanelTitle eyebrow="SOLO PROJECT QUEST" title="個人專案日誌" action={<button onClick={() => window.open(workspaces[0].source.url, "_blank", "noopener,noreferrer")} className="border-2 border-[#647aa2] bg-[#263b5d] px-3 py-2 text-xs font-black text-[#dce9ff] hover:border-[#f4c659] hover:text-[#fff0ba]">開啟 Notion 原始計畫</button>} />
    <div className="space-y-5 p-5">
      <p className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-6 text-[#d5f9e6]">這是你的個人開發基地：不需要分配職務或人員。每天選日期、勾選完成工作，再記下投入時間與開發心得；所有調整會自動同步到你的私人資料。</p>
      {workspaces.map(project => {
        const dailyLogs = project.dailyLogs ?? [];
        const todayLog = dailyLogs.find(log => log.date === activeDate) ?? { id: "draft", date: activeDate, completedTaskIds: [] };
        const completedCount = project.tasks.filter(task => task.status === "done").length;
        const progress = project.tasks.length ? Math.round((completedCount / project.tasks.length) * 100) : 0;
        const phaseStats = Array.from(new Map(project.tasks.map(task => [task.phase, project.tasks.filter(item => item.phase === task.phase)])).entries());
        return <section key={project.id} className="border-3 border-[#536994] bg-[#14233e] shadow-[3px_3px_0_#080d1f]">
          <div className="border-b-2 border-[#40567e] p-4"><div className="flex flex-wrap items-start gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[#7891bd] p-2" style={{ background: `conic-gradient(#f4c659 ${progress * 3.6}deg, #263b5e 0deg)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#152645] text-center"><span className="text-xl font-black text-[#fff2be]">{progress}%</span><span className="pixel-font text-[7px] text-[#9eb5da]">COMPLETE</span></div></div><div className="min-w-0 flex-1"><p className="pixel-font text-[8px] text-[#f4c659]">SOLO DEVELOPMENT QUEST</p><h3 className="mt-2 text-xl font-black text-[#fff8df]">{project.name}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#c1d1ea]">{project.description}</p><div className="mt-3 flex flex-wrap gap-2">{project.tags.map(tag => <span key={tag} className="border border-[#6079a4] bg-[#243a5e] px-2 py-1 text-xs font-bold text-[#d9e7ff]">#{tag}</span>)}</div></div><div className="ml-auto grid min-w-24 grid-cols-1 gap-2 text-center"><div className="border-2 border-[#526b97] bg-[#1d3154] px-3 py-2"><p className="pixel-font text-[7px] text-[#9ab0d3]">DONE QUESTS</p><p className="mt-1 text-lg font-black text-[#74e2b1]">{completedCount}<span className="text-xs text-[#b5c6e4]">/{project.tasks.length}</span></p></div><div className="border-2 border-[#526b97] bg-[#1d3154] px-3 py-2"><p className="pixel-font text-[7px] text-[#9ab0d3]">LOG DAYS</p><p className="mt-1 text-lg font-black text-[#f4c659]">{dailyLogs.length}</p></div></div></div></div>
          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-4"><div className="border-2 border-[#48628d] bg-[#172a47] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="pixel-font text-[8px] text-[#93a7cb]">DAILY CHECKLIST</p><h4 className="mt-1 font-black text-[#fff8df]">今日／指定日期的開發紀錄</h4></div><input type="date" value={activeDate} onChange={event => setActiveDate(event.target.value)} className="pixel-input px-3 py-2 text-sm" /></div><div className="mt-4 space-y-2">{project.tasks.map(task => { const checked = todayLog.completedTaskIds.includes(task.id); return <label key={task.id} className={`flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors ${checked ? "border-[#4eaa80] bg-[#1c4a40]" : "border-[#405a83] bg-[#1a2e4d] hover:border-[#718ab5]"}`}><input type="checkbox" checked={checked} onChange={event => updateDailyLog(project, current => ({ ...current, completedTaskIds: event.target.checked ? [...current.completedTaskIds, task.id] : current.completedTaskIds.filter(id => id !== task.id) }), { id: task.id, checked: event.target.checked })} className="mt-1 h-4 w-4 accent-[#74e2b1]" /><span className="min-w-0 flex-1"><span className={`block font-bold ${checked ? "text-[#d9ffe9] line-through" : "text-[#fff8df]"}`}>{task.title}</span><span className="mt-1 block text-xs text-[#aec2e0]">{task.phase} · {task.scheduleLabel || "未排程"}</span></span>{task.status === "done" && <span className="pixel-font mt-1 text-[7px] text-[#74e2b1]">DONE</span>}</label>; })}</div><div className="mt-4 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]"><Field label="投入時間（分）"><input type="number" min="0" value={todayLog.minutes ?? ""} onChange={event => updateDailyLog(project, current => ({ ...current, minutes: event.target.value ? Number(event.target.value) : undefined }))} placeholder="例如 90" className="pixel-input w-full px-3 py-2" /></Field><Field label="今日開發紀錄"><textarea rows={2} value={todayLog.note ?? ""} onChange={event => updateDailyLog(project, current => ({ ...current, note: event.target.value || undefined }))} placeholder="記下完成內容、遇到的問題或下一步…" className="pixel-input w-full resize-y px-3 py-2" /></Field></div></div><div className="border-2 border-[#48628d] bg-[#172a47] p-4"><p className="pixel-font text-[8px] text-[#93a7cb]">QUEST PROGRESS MAP</p><div className="mt-3 space-y-3">{phaseStats.map(([phase, tasks]) => { const done = tasks.filter(task => task.status === "done").length; const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0; return <div key={phase}><div className="mb-1 flex justify-between gap-3 text-xs font-bold text-[#d7e5ff]"><span>{phase}</span><span className="text-[#f4c659]">{done}/{tasks.length}</span></div><div className="h-3 border border-[#526a96] bg-[#0e1b31]"><div className="h-full bg-[#74e2b1] transition-[width] duration-200" style={{ width: `${percent}%` }} /></div></div>; })}</div></div></div><aside className="border-2 border-[#48628d] bg-[#172a47] p-4"><p className="pixel-font text-[8px] text-[#93a7cb]">DEVELOPMENT LOG</p><h4 className="mt-1 font-black text-[#fff8df]">近期開發紀錄</h4>{dailyLogs.length ? <div className="mt-4 space-y-3">{dailyLogs.slice(0, 8).map(log => <article key={log.id} className="border-l-4 border-[#f4c659] bg-[#1d3153] p-3"><div className="flex items-center justify-between gap-2"><span className="font-black text-[#fff4c8]">{log.date}</span>{log.minutes !== undefined && <span className="text-xs font-bold text-[#74e2b1]">{log.minutes} 分</span>}</div><p className="mt-2 text-xs text-[#b9cce8]">完成 {log.completedTaskIds.length} 項工作</p>{log.note && <p className="mt-2 text-xs leading-5 text-[#d7e6fc]">{log.note}</p>}</article>)}</div> : <p className="mt-4 border-l-4 border-[#657ea9] pl-3 text-sm leading-6 text-[#aec2e0]">尚未寫下日誌。選擇日期並勾選今天完成的工作，即會建立第一筆紀錄。</p>}</aside></div>
        </section>;
      })}
    </div>
  </Panel>;
}

function LegacyNotionProjectWorkspace({ workspaces, onUpdate }: { workspaces: WorkspaceProject[]; onUpdate: (projectId: string, update: (project: WorkspaceProject) => WorkspaceProject) => void }) {
  if (!workspaces.length) return null;
  const taskStatusTone: Record<WorkspaceTaskStatus, string> = { "needs-review": "bg-[#5c4c26] text-[#ffe797]", "not-started": "bg-[#40577f] text-[#d7e5ff]", active: "bg-[#5648b8] text-[#eeeaff]", done: "bg-[#23634f] text-[#d8ffe9]", deferred: "bg-[#684c83] text-[#f0dcff]", blocked: "bg-[#7a3740] text-[#ffe0df]" };
  return <Panel className="mt-4 overflow-hidden" gold>
    <PanelTitle eyebrow="NOTION PROJECT IMPORT" title="Notion 專案工作區" action={<button onClick={() => window.open(workspaces[0].source.url, "_blank", "noopener,noreferrer")} className="border-2 border-[#647aa2] bg-[#263b5d] px-3 py-2 text-xs font-black text-[#dce9ff] hover:border-[#f4c659] hover:text-[#fff0ba]">開啟 Notion 原始計畫</button>} />
    <div className="space-y-5 p-5">
      <p className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-6 text-[#d5f9e6]">已匯入 Notion 的中世紀公會排程 App 規劃與每日開發項目。原始資料沒有提供明確完成狀態，因此首次匯入一律標為「待確認」；你在這裡更新的內容會同步到你的私人 Campus Quest 資料。</p>
      {workspaces.map(project => {
        const completed = project.tasks.filter(task => task.status === "done").length;
        return <section key={project.id} className="border-3 border-[#536994] bg-[#14233e] shadow-[3px_3px_0_#080d1f]">
          <div className="border-b-2 border-[#40567e] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="pixel-font text-[8px] text-[#f4c659]">PROJECT COMMAND BOARD</p><h3 className="mt-2 text-xl font-black text-[#fff8df]">{project.name}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#c1d1ea]">{project.description}</p></div><div className="border-2 border-[#6a82ad] bg-[#1c3154] px-3 py-2 text-right"><p className="pixel-font text-[8px] text-[#a9bbdd]">TASK PROGRESS</p><p className="mt-1 text-lg font-black text-[#f4c659]">{completed} <span className="text-xs text-[#b9cae4]">/ {project.tasks.length}</span></p></div></div><div className="mt-4 flex flex-wrap gap-2">{project.tags.map(tag => <span key={tag} className="border border-[#6079a4] bg-[#243a5e] px-2 py-1 text-xs font-bold text-[#d9e7ff]">#{tag}</span>)}</div></div>
          <div className="grid gap-5 p-4 xl:grid-cols-[280px_minmax(0,1fr)]"><aside className="space-y-3"><div><p className="pixel-font text-[8px] text-[#93a7cb]">PROJECT MEMBERS</p><p className="mt-2 text-xs leading-5 text-[#b6c7e4]">可將「待指定」改為實際人員名稱，後續任務會依指派顯示。</p></div>{project.members.map(member => <div key={member.id} className="border-2 border-[#496189] bg-[#1a2c4b] p-3"><input value={member.name} onChange={event => onUpdate(project.id, current => ({ ...current, members: current.members.map(item => item.id === member.id ? { ...item, name: event.target.value } : item) }))} aria-label={`${member.role} 姓名`} className="pixel-input w-full px-2 py-2 text-sm" /><p className="mt-2 text-xs font-bold text-[#f4c659]">{member.role}</p></div>)}</aside><div><div className="flex items-end justify-between gap-3"><div><p className="pixel-font text-[8px] text-[#93a7cb]">SCHEDULE & WORK ITEMS</p><p className="mt-1 text-xs text-[#b7c8e4]">直接更新狀態、時程、工時與調整原因；不會回寫或覆蓋 Notion 的歷史頁面。</p></div></div><div className="mt-3 space-y-3">{project.tasks.map(task => <details key={task.id} className="border-2 border-[#455e89] bg-[#172844]" open={task.status === "active" || task.status === "needs-review"}><summary className="cursor-pointer list-none p-3"><div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-1 text-[11px] font-black ${taskStatusTone[task.status]}`}>{workspaceTaskStatusLabel[task.status]}</span><span className="font-black text-[#fff8df]">{task.title}</span><span className="ml-auto text-xs font-bold text-[#9eb1d2]">{task.scheduleLabel || "未排程"}</span></div><p className="mt-2 text-xs leading-5 text-[#b7c8e4]">{task.description}</p></summary><div className="grid gap-3 border-t-2 border-[#3e5680] p-3 md:grid-cols-2"><Field label="工作狀態"><select value={task.status} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, status: event.target.value as WorkspaceTaskStatus } : item) }))} className="pixel-input w-full px-3 py-2">{Object.entries(workspaceTaskStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="時程／原始日期"><input value={task.scheduleLabel} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, scheduleLabel: event.target.value } : item) }))} placeholder="例如：8/23 或 2026-09-01" className="pixel-input w-full px-3 py-2" /></Field><Field label="負責人"><select multiple value={task.assigneeIds} onChange={event => { const assigneeIds = Array.from(event.currentTarget.selectedOptions, option => option.value); onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, assigneeIds } : item) })); }} className="pixel-input min-h-24 w-full px-3 py-2">{project.members.map(member => <option key={member.id} value={member.id}>{member.name}｜{member.role}</option>)}</select></Field><Field label="階段"><input value={task.phase} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, phase: event.target.value } : item) }))} className="pixel-input w-full px-3 py-2" /></Field><div className="grid grid-cols-3 gap-2 md:col-span-2"><Field label="預估（分）"><input type="number" min="0" value={task.estimatedMinutes ?? ""} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, estimatedMinutes: event.target.value ? Number(event.target.value) : undefined } : item) }))} className="pixel-input w-full px-2 py-2" /></Field><Field label="延長（分）"><input type="number" min="0" value={task.extensionMinutes ?? ""} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, extensionMinutes: event.target.value ? Number(event.target.value) : undefined } : item) }))} className="pixel-input w-full px-2 py-2" /></Field><Field label="實際（分）"><input type="number" min="0" value={task.actualMinutes ?? ""} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, actualMinutes: event.target.value ? Number(event.target.value) : undefined } : item) }))} className="pixel-input w-full px-2 py-2" /></Field></div><Field label="調整說明／阻塞原因"><textarea value={task.note ?? ""} onChange={event => onUpdate(project.id, current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, note: event.target.value || undefined } : item) }))} rows={2} placeholder="記錄延長原因、依賴項目或下一步…" className="pixel-input w-full resize-y px-3 py-2 md:col-span-2" /></Field></div></details>)}</div></div></div>
        </section>;
      })}
    </div>
  </Panel>;
}

function ProjectEditor({ form, editing, setForm, onSave, onCancel }: { form: Omit<ProjectRecord, "id"> | null; editing: boolean; setForm: React.Dispatch<React.SetStateAction<Omit<ProjectRecord, "id"> | null>>; onSave: () => void; onCancel: () => void }) {
  return <Panel className="h-fit overflow-hidden 2xl:sticky 2xl:top-5"><PanelTitle eyebrow="PROJECT EDITOR" title={form ? editing ? "編輯專題" : "新增專題" : "工坊準備中"} action={<FolderKanban className="text-[#f4c659]" />} /><div className="p-5">{!form ? <EmptyState icon={<Plus />} title="建立一個任務" detail="把課堂作品、競賽、研究或社團專案記錄下來。" /> : <div className="space-y-4"><Field label="專題名稱"><input value={form.name} onChange={event => setForm(current => current && { ...current, name: event.target.value })} placeholder="例如：畢業專題名稱" className="pixel-input w-full px-3 py-2.5" /></Field><Field label="專題描述"><textarea value={form.description} onChange={event => setForm(current => current && { ...current, description: event.target.value })} placeholder="說明目標、角色與成果…" rows={3} className="pixel-input w-full resize-y px-3 py-2.5" /></Field><Field label="技術標籤"><input value={form.tags.join(", ")} onChange={event => setForm(current => current && { ...current, tags: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })} placeholder="React, Figma, Python" className="pixel-input w-full px-3 py-2.5" /><p className="mt-1.5 text-[11px] text-[#91a5c8]">以半形逗號分隔。</p></Field><div className="grid grid-cols-2 gap-3"><Field label="開始月份"><input type="month" value={form.startDate} onChange={event => setForm(current => current && { ...current, startDate: event.target.value })} className="pixel-input w-full px-2 py-2.5" /></Field><Field label="結束月份"><input type="month" value={form.endDate} onChange={event => setForm(current => current && { ...current, endDate: event.target.value })} className="pixel-input w-full px-2 py-2.5" /></Field></div><Field label="完成狀態"><select value={form.status} onChange={event => setForm(current => current && { ...current, status: event.target.value as ProjectStatus })} className="pixel-input w-full px-3 py-2.5">{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><div className="flex gap-3 pt-2"><PixelButton onClick={onSave} disabled={!form.name.trim()} className="flex-1 bg-[#f4c659] text-[#162442]"><ShieldCheck size={16} /> 儲存專題</PixelButton><PixelButton onClick={onCancel} className="bg-[#33486c]"><X size={16} /></PixelButton></div></div>}</div></Panel>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c8d6ed]">{label}</span>{children}</label>; }

function ExamCountdownSidebar({ workspaces, onOpen }: { workspaces: ExamWorkspace[]; onOpen: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!workspaces.length) return null;
  return <div className="mt-4 border-t-2 border-[#4b628e] px-3 pt-4"><div className="flex items-center justify-between gap-2"><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">EXAM COUNTDOWN</p><Clock3 size={14} className="text-[#f4c659]" /></div><button onClick={onOpen} className="mt-2 block w-full text-left">{workspaces.map(workspace => { const countdown = getExamCountdown(workspace.examDate, now); return <span key={workspace.id} className="mb-2 block border-2 border-[#526b97] bg-[#1a2e4d] px-2 py-2 transition-colors hover:border-[#f4c659]"><span className="flex items-center justify-between gap-2"><span className="font-black text-[#e7efff]">{workspace.code.toUpperCase()}</span><span className={`pixel-font text-[8px] ${countdown.status === "future" ? "text-[#74e2b1]" : countdown.status === "today" ? "text-[#f4c659]" : "text-[#9eb1d2]"}`}>{countdown.label}</span></span><span className="mt-1 block text-[10px] font-bold text-[#aebfdb]">{workspace.examDate}{workspace.examTime ? ` ${workspace.examTime}` : ""}</span></span>; })}</button></div>;
}

type ExamResourceDraft = { title: string; kind: ExamResourceKind; url: string; note: string };
type ExamTaskDraft = { date: string; title: string; detail: string; plannedMinutes: string };

function ExamWorkspaceView({ workspaces, onUpdate, syncing, syncNotice, canSync, onSync }: { workspaces: ExamWorkspace[]; onUpdate: (workspaceId: string, update: (workspace: ExamWorkspace) => ExamWorkspace) => void; syncing: boolean; syncNotice: string | null; canSync: boolean; onSync: () => void }) {
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function updateDailyLog(workspace: ExamWorkspace, patch: (current: ExamDailyLog) => ExamDailyLog, taskId?: string, checked?: boolean) {
    onUpdate(workspace.id, current => updateExamDailyLog(current, activeDate, patch, taskId, checked));
  }

  if (!workspaces.length) return <Panel gold className="overflow-hidden"><PanelTitle eyebrow="EXAM PREP" title="考試準備工作區" /><div className="p-5"><EmptyState icon={<Clock3 />} title="正在建立考試工作區" detail="完成私人雲端資料讀取後，會顯示已匯入的多益與 CPE 計畫。" /></div></Panel>;
  return <div className="space-y-4 animate-pop-in"><Panel gold className="overflow-hidden"><PanelTitle eyebrow="EXAM PREPARATION QUESTS" title="證照考試準備基地" action={<div className="flex flex-wrap justify-end gap-2"><button onClick={() => window.open(NOTION_EXAM_SYNC_LEDGER_URL, "_blank", "noopener,noreferrer")} className="flex items-center gap-1 border-2 border-[#647aa2] bg-[#263b5d] px-3 py-2 text-xs font-black text-[#dce9ff] hover:border-[#f4c659] hover:text-[#fff0ba]"><ExternalLink size={14} /> 同步紀錄</button><PixelButton onClick={onSync} disabled={syncing || !canSync} className="bg-[#245d58] text-[#e1fff6]"><BookMarked size={16} /> {syncing ? "正在追加至 Notion" : "同步至 Notion"}</PixelButton></div>} /><div className="p-5"><p className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-3 py-2 text-xs leading-6 text-[#d5f9e6]">多益與 CPE 計畫已從 Notion 單向匯入。按下「同步至 Notion」只會把目前網站快照追加到獨立的同步紀錄頁，不會覆寫或改動原始計畫與資料庫。</p>{syncNotice && <p className="mt-3 border-l-4 border-[#f4c659] bg-[#493d24] px-3 py-2 text-xs leading-6 text-[#fff0b9]">{syncNotice}</p>}</div></Panel>{workspaces.map(workspace => <ExamWorkspaceCard key={workspace.id} workspace={workspace} activeDate={activeDate} now={now} onActiveDateChange={setActiveDate} onUpdate={onUpdate} onUpdateDailyLog={updateDailyLog} />)}</div>;
}

function ExamWorkspaceCard({ workspace, activeDate, now, onActiveDateChange, onUpdate, onUpdateDailyLog }: { workspace: ExamWorkspace; activeDate: string; now: Date; onActiveDateChange: (date: string) => void; onUpdate: (workspaceId: string, update: (workspace: ExamWorkspace) => ExamWorkspace) => void; onUpdateDailyLog: (workspace: ExamWorkspace, patch: (current: ExamDailyLog) => ExamDailyLog, taskId?: string, checked?: boolean) => void }) {
  const countdown = getExamCountdown(workspace.examDate, now);
  const activeTasks = getExamTasksForDate(workspace, activeDate);
  const activeLog = workspace.dailyLogs.find(log => log.date === activeDate) ?? { id: "draft", date: activeDate, completedTaskIds: [] };
  const completed = workspace.dailyTasks.filter(task => task.status === "done").length;
  const progress = workspace.dailyTasks.length ? Math.round((completed / workspace.dailyTasks.length) * 100) : 0;
  const phases = Array.from(new Set(workspace.dailyTasks.map(task => task.phase).filter(Boolean))) as string[];
  return <Panel className="overflow-hidden" gold><PanelTitle eyebrow={workspace.code === "toeic" ? "TOEIC SPRINT" : "CPE SPRINT"} title={workspace.name} action={<button onClick={() => window.open(workspace.source.url, "_blank", "noopener,noreferrer")} className="flex items-center gap-1 border-2 border-[#647aa2] bg-[#263b5d] px-3 py-2 text-xs font-black text-[#dce9ff] hover:border-[#f4c659] hover:text-[#fff0ba]"><ExternalLink size={14} /> Notion 原始計畫</button>} /><div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-4"><section className="border-3 border-[#536994] bg-[#14233e] p-4"><div className="flex flex-wrap gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[#7891bd] p-2" style={{ background: `conic-gradient(#f4c659 ${progress * 3.6}deg, #263b5e 0deg)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#152645] text-center"><span className="text-xl font-black text-[#fff2be]">{progress}%</span><span className="pixel-font text-[7px] text-[#9eb5da]">PROGRESS</span></div></div><div className="min-w-0 flex-1"><p className="pixel-font text-[8px] text-[#f4c659]">PRIVATE EXAM QUEST</p><p className="mt-2 text-sm leading-6 text-[#c1d1ea]">{workspace.description}</p><div className="mt-3 flex flex-wrap gap-2"><span className="border border-[#6f82ab] bg-[#243a5e] px-2 py-1 text-xs font-black text-[#dce7ff]">完成 {completed}/{workspace.dailyTasks.length} 項</span>{phases.slice(0, 3).map(phase => <span key={phase} className="border border-[#526f8f] bg-[#1c3152] px-2 py-1 text-xs font-bold text-[#bcd0f0]">{phase}</span>)}</div></div></div></section><ExamDailyChecklist workspace={workspace} activeDate={activeDate} activeTasks={activeTasks} activeLog={activeLog} onActiveDateChange={onActiveDateChange} onUpdateDailyLog={onUpdateDailyLog} onUpdate={onUpdate} /><ExamResourceLibrary workspace={workspace} onUpdate={onUpdate} /></div><aside className="space-y-4"><section className="border-3 border-[#f4c659] bg-[#493d24] p-4 shadow-[3px_3px_0_#080d1f]"><p className="pixel-font text-[8px] text-[#ffe8a3]">EXAM COUNTDOWN</p><p className="mt-2 text-3xl font-black text-[#fff1bb]">{countdown.status === "future" ? countdown.days : countdown.status === "today" ? "TODAY" : "—"}</p><p className="mt-1 text-sm font-bold text-[#ffe8a3]">{countdown.status === "future" ? "天後應試" : countdown.label}</p><div className="mt-4 grid gap-3"><Field label="考試日期"><input type="date" value={workspace.examDate} onChange={event => onUpdate(workspace.id, current => ({ ...current, examDate: event.target.value }))} className="pixel-input w-full px-2 py-2 text-sm" /></Field><Field label="考試時間（可留空）"><input value={workspace.examTime ?? ""} onChange={event => onUpdate(workspace.id, current => ({ ...current, examTime: event.target.value || undefined }))} placeholder="例如：18:40" className="pixel-input w-full px-2 py-2 text-sm" /></Field></div></section><section className="border-2 border-[#526b97] bg-[#172a47] p-4"><p className="pixel-font text-[8px] text-[#93a7cb]">EXAM DAY CHECKLIST</p><h4 className="mt-1 font-black text-[#fff8df]">考試日提醒</h4><ul className="mt-3 space-y-2">{workspace.examDayChecklist.map(item => <li key={item} className="flex gap-2 text-xs leading-5 text-[#c7d6ed]"><span className="mt-1 h-2 w-2 shrink-0 bg-[#f4c659]" />{item}</li>)}</ul></section><section className="border-2 border-[#526b97] bg-[#172a47] p-4"><p className="pixel-font text-[8px] text-[#93a7cb]">RECENT STUDY LOG</p><h4 className="mt-1 font-black text-[#fff8df]">近期準備紀錄</h4>{workspace.dailyLogs.length ? <div className="mt-3 space-y-2">{workspace.dailyLogs.slice(0, 6).map(log => <article key={log.id} className="border-l-4 border-[#74e2b1] bg-[#1d3153] p-2"><div className="flex justify-between gap-2 text-xs font-black text-[#fff4c8]"><span>{log.date}</span>{log.minutes !== undefined && <span className="text-[#74e2b1]">{log.minutes} 分</span>}</div><p className="mt-1 text-[11px] text-[#b9cce8]">勾選 {log.completedTaskIds.length} 項</p>{log.note && <p className="mt-1 text-[11px] leading-5 text-[#d7e6fc]">{log.note}</p>}</article>)}</div> : <p className="mt-3 text-xs leading-5 text-[#aec2e0]">尚未有讀書紀錄。選擇日期、勾選任務或寫下讀書筆記後會顯示在這裡。</p>}</section></aside></div></Panel>;
}

function ExamDailyChecklist({ workspace, activeDate, activeTasks, activeLog, onActiveDateChange, onUpdateDailyLog, onUpdate }: { workspace: ExamWorkspace; activeDate: string; activeTasks: ReturnType<typeof getExamTasksForDate>; activeLog: ExamDailyLog; onActiveDateChange: (date: string) => void; onUpdateDailyLog: (workspace: ExamWorkspace, patch: (current: ExamDailyLog) => ExamDailyLog, taskId?: string, checked?: boolean) => void; onUpdate: (workspaceId: string, update: (workspace: ExamWorkspace) => ExamWorkspace) => void }) {
  const [draft, setDraft] = useState<ExamTaskDraft>({ date: activeDate, title: "", detail: "", plannedMinutes: "" });
  useEffect(() => setDraft(current => ({ ...current, date: activeDate })), [activeDate]);
  return <section className="border-2 border-[#48628d] bg-[#172a47] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="pixel-font text-[8px] text-[#93a7cb]">DAILY CHECKLIST</p><h4 className="mt-1 font-black text-[#fff8df]">指定日期的讀書紀錄</h4></div><input type="date" value={activeDate} onChange={event => onActiveDateChange(event.target.value)} className="pixel-input px-3 py-2 text-sm" /></div><div className="mt-4 space-y-2">{activeTasks.length ? activeTasks.map(task => { const checked = activeLog.completedTaskIds.includes(task.id); return <label key={task.id} className={`flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors ${checked ? "border-[#4eaa80] bg-[#1c4a40]" : "border-[#405a83] bg-[#1a2e4d] hover:border-[#718ab5]"}`}><input type="checkbox" checked={checked} onChange={event => onUpdateDailyLog(workspace, current => ({ ...current, completedTaskIds: event.target.checked ? [...current.completedTaskIds, task.id] : current.completedTaskIds.filter(id => id !== task.id) }), task.id, event.target.checked)} className="mt-1 h-4 w-4 accent-[#74e2b1]" /><span className="min-w-0 flex-1"><span className={`block font-bold ${checked ? "text-[#d9ffe9] line-through" : "text-[#fff8df]"}`}>{task.title}</span>{task.detail && <span className="mt-1 block text-xs leading-5 text-[#aec2e0]">{task.detail}</span>}<span className="mt-1 block text-[11px] font-bold text-[#f4c659]">{task.resourceLabel ?? "一般任務"}{task.plannedMinutes ? ` · ${task.plannedMinutes} 分` : ""}</span></span>{task.sourceUrl && <button type="button" onClick={event => { event.preventDefault(); window.open(task.sourceUrl, "_blank", "noopener,noreferrer"); }} aria-label={`開啟 ${task.title} 的 Notion 來源`} className="p-1 text-[#a9bde0] hover:text-[#f4c659]"><ExternalLink size={15} /></button>}</label>; }) : <p className="border-l-4 border-[#657ea9] pl-3 text-sm leading-6 text-[#aec2e0]">這一天尚未排定任務；可在下方新增自己的讀書項目。</p>}</div><div className="mt-4 grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]"><Field label="投入時間（分）"><input type="number" min="0" value={activeLog.minutes ?? ""} onChange={event => onUpdateDailyLog(workspace, current => ({ ...current, minutes: event.target.value ? Number(event.target.value) : undefined }))} placeholder="例如 90" className="pixel-input w-full px-3 py-2" /></Field><Field label="今日學習紀錄"><textarea rows={2} value={activeLog.note ?? ""} onChange={event => onUpdateDailyLog(workspace, current => ({ ...current, note: event.target.value || undefined }))} placeholder="記下錯題、讀書內容或下一步…" className="pixel-input w-full resize-y px-3 py-2" /></Field></div><details className="mt-4 border-2 border-dashed border-[#59749f] bg-[#142540] p-3"><summary className="cursor-pointer font-black text-[#d8e5ff]">＋ 新增個人讀書任務</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="日期"><input type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} className="pixel-input w-full px-3 py-2" /></Field><Field label="預計時間（分）"><input type="number" min="0" value={draft.plannedMinutes} onChange={event => setDraft(current => ({ ...current, plannedMinutes: event.target.value }))} className="pixel-input w-full px-3 py-2" /></Field><Field label="任務名稱"><input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="例如：完成一回模考" className="pixel-input w-full px-3 py-2" /></Field><Field label="補充說明"><input value={draft.detail} onChange={event => setDraft(current => ({ ...current, detail: event.target.value }))} placeholder="可寫使用的教材或目標" className="pixel-input w-full px-3 py-2" /></Field></div><PixelButton onClick={() => { if (!draft.title.trim() || !draft.date) return; onUpdate(workspace.id, current => ({ ...current, dailyTasks: [...current.dailyTasks, { id: crypto.randomUUID(), date: draft.date, title: draft.title.trim(), detail: draft.detail.trim() || undefined, plannedMinutes: draft.plannedMinutes ? Number(draft.plannedMinutes) : undefined, status: "not-started" }] })); setDraft({ date: activeDate, title: "", detail: "", plannedMinutes: "" }); }} disabled={!draft.title.trim() || !draft.date} className="mt-3 bg-[#245d58] text-[#e1fff6]"><Plus size={15} /> 加入讀書任務</PixelButton></details></section>;
}

function ExamResourceLibrary({ workspace, onUpdate }: { workspace: ExamWorkspace; onUpdate: (workspaceId: string, update: (workspace: ExamWorkspace) => ExamWorkspace) => void }) {
  const [draft, setDraft] = useState<ExamResourceDraft>({ title: "", kind: "link", url: "", note: "" });
  return <section className="border-2 border-[#48628d] bg-[#172a47] p-4"><div className="flex items-center justify-between gap-3"><div><p className="pixel-font text-[8px] text-[#93a7cb]">PREP RESOURCE CACHE</p><h4 className="mt-1 font-black text-[#fff8df]">準備資料庫</h4></div><BookMarked className="text-[#f4c659]" size={19} /></div><p className="mt-2 text-xs leading-5 text-[#b6c8e5]">可保留自己的題庫、講義、單字、筆記與外部連結；修改只存在你的私人工作區。</p><div className="mt-4 space-y-2">{workspace.resources.map(resource => <details key={resource.id} className="border-2 border-[#405a83] bg-[#1a2e4d] p-3"><summary className="flex cursor-pointer list-none items-center gap-2"><span className="border border-[#6a82ab] bg-[#243a5e] px-2 py-1 text-[10px] font-black text-[#dce7ff]">{examResourceKindLabel[resource.kind]}</span><span className="min-w-0 flex-1 truncate font-black text-[#fff8df]">{resource.title}</span>{resource.url && <a href={resource.url} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="text-[#a9bde0] hover:text-[#f4c659]" aria-label={`開啟 ${resource.title}`}><ExternalLink size={15} /></a>}</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="名稱"><input value={resource.title} onChange={event => onUpdate(workspace.id, current => ({ ...current, resources: current.resources.map(item => item.id === resource.id ? { ...item, title: event.target.value } : item) }))} className="pixel-input w-full px-3 py-2" /></Field><Field label="類型"><select value={resource.kind} onChange={event => onUpdate(workspace.id, current => ({ ...current, resources: current.resources.map(item => item.id === resource.id ? { ...item, kind: event.target.value as ExamResourceKind } : item) }))} className="pixel-input w-full px-3 py-2">{Object.entries(examResourceKindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="外部網址（可留空）"><input value={resource.url ?? ""} onChange={event => onUpdate(workspace.id, current => ({ ...current, resources: current.resources.map(item => item.id === resource.id ? { ...item, url: event.target.value || undefined } : item) }))} placeholder="https://…" className="pixel-input w-full px-3 py-2" /></Field><Field label="備註"><input value={resource.note ?? ""} onChange={event => onUpdate(workspace.id, current => ({ ...current, resources: current.resources.map(item => item.id === resource.id ? { ...item, note: event.target.value || undefined } : item) }))} className="pixel-input w-full px-3 py-2" /></Field></div>{resource.sourceRef && <p className="mt-2 text-[10px] leading-5 text-[#91a8cb]">Notion 來源：{resource.sourceRef}</p>}<button onClick={() => window.confirm(`確定刪除「${resource.title}」嗎？`) && onUpdate(workspace.id, current => ({ ...current, resources: current.resources.filter(item => item.id !== resource.id) }))} className="mt-3 text-xs font-black text-[#ffb2a9] hover:text-[#f28682]">刪除這筆資料</button></details>)}</div><details className="mt-4 border-2 border-dashed border-[#59749f] bg-[#142540] p-3"><summary className="cursor-pointer font-black text-[#d8e5ff]">＋ 加入自己的準備資料</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="名稱"><input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="例如：單字書第 3 單元" className="pixel-input w-full px-3 py-2" /></Field><Field label="類型"><select value={draft.kind} onChange={event => setDraft(current => ({ ...current, kind: event.target.value as ExamResourceKind }))} className="pixel-input w-full px-3 py-2">{Object.entries(examResourceKindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="外部網址（可留空）"><input value={draft.url} onChange={event => setDraft(current => ({ ...current, url: event.target.value }))} placeholder="https://…" className="pixel-input w-full px-3 py-2" /></Field><Field label="備註"><input value={draft.note} onChange={event => setDraft(current => ({ ...current, note: event.target.value }))} placeholder="使用方式、章節或目標" className="pixel-input w-full px-3 py-2" /></Field></div><PixelButton onClick={() => { if (!draft.title.trim()) return; onUpdate(workspace.id, current => ({ ...current, resources: [...current.resources, { id: crypto.randomUUID(), title: draft.title.trim(), kind: draft.kind, url: draft.url.trim() || undefined, note: draft.note.trim() || undefined, createdAt: new Date().toISOString() }] })); setDraft({ title: "", kind: "link", url: "", note: "" }); }} disabled={!draft.title.trim()} className="mt-3 bg-[#245d58] text-[#e1fff6]"><Plus size={15} /> 儲存準備資料</PixelButton></details></section>;
}

function BadgesView({ achievements, unlocked }: { achievements: ReturnType<typeof getAchievements>; unlocked: number }) {
  return <div className="space-y-4 animate-pop-in"><Panel gold className="overflow-hidden"><div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="pixel-font text-[9px] leading-6 text-[#f4c659]">ACHIEVEMENT COMPENDIUM</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">成就圖鑑</h2><p className="mt-2 text-sm text-[#c8d5e9]">目前已點亮 <b className="text-[#f4c659]">{unlocked}</b> / {achievements.length} 枚校園徽章。</p></div><div className="flex h-16 w-16 items-center justify-center border-4 border-[#f4c659] bg-[#594b29] shadow-[4px_4px_0_#080d1f]"><Trophy className="h-8 w-8 text-[#ffe797]" /></div></div></Panel><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{achievements.map((achievement, index) => <article key={achievement.id} className={`pixel-panel p-5 ${achievement.unlocked ? "bg-[#243856]" : "bg-[#172238] opacity-70 grayscale"}`}><div className="flex items-start gap-4"><span className={`flex h-14 w-14 shrink-0 items-center justify-center border-3 text-2xl ${achievement.unlocked ? "border-[#f4c659] bg-[#614f27] text-[#ffe99a]" : "border-[#657795] bg-[#2c3d5b] text-[#9bacca]"}`}>{achievement.unlocked ? achievement.icon : "?"}</span><div><p className="pixel-font text-[8px] leading-5 text-[#9db1d2]">BADGE {String(index + 1).padStart(2,"0")}</p><h3 className="mt-1 font-black text-[#fff8df]">{achievement.title}</h3><p className="mt-2 text-sm leading-6 text-[#b9c8df]">{achievement.description}</p></div></div><div className={`mt-5 border-t-2 pt-3 text-xs font-black ${achievement.unlocked ? "border-[#6680aa] text-[#8ef0bd]" : "border-[#4e6080] text-[#91a4c4]"}`}>{achievement.unlocked ? "✓ 已解鎖" : "◌ 尚未解鎖"}</div></article>)}</div></div>;
}

function GpaChart({ points, system }: { points: ReturnType<typeof getTermGpas>; system: GradePointSystem }) {
  const max = system === "4.3" ? 4.3 : 4;
  if (points.length === 0) return <div className="flex h-56 items-center justify-center border-2 border-dashed border-[#5e739b] bg-[#14213a] text-sm text-[#aebfdb]">新增課程後，這裡將顯示 GPA 趨勢。</div>;
  const width = 600; const height = 220; const padX = 38; const padY = 22; const interval = points.length === 1 ? 0 : (width - padX * 2) / (points.length - 1);
  const coords = points.map((point, index) => ({ x: padX + index * interval, y: height - padY - (point.gpa / max) * (height - padY * 2), ...point }));
  return <div className="relative overflow-hidden border-2 border-[#536994] bg-[#13213b] p-2"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="歷年 GPA 趨勢圖" className="h-56 w-full"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f4c659" stopOpacity=".35"/><stop offset="1" stopColor="#f4c659" stopOpacity="0"/></linearGradient></defs>{[1,2,3,4].map(line => { const y = height - padY - (line / max) * (height - padY * 2); return <g key={line}><line x1={padX} x2={width-padX} y1={y} y2={y} stroke="#46608d" strokeDasharray="4 6" /><text x="6" y={y+4} fill="#9ab0d2" fontSize="11">{line.toFixed(1)}</text></g>; })}<path d={`M ${coords.map(point => `${point.x} ${point.y}`).join(" L ")} L ${coords.at(-1)?.x ?? padX} ${height-padY} L ${coords[0]?.x ?? padX} ${height-padY} Z`} fill="url(#area)"/><polyline points={coords.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#f4c659" strokeWidth="5" strokeLinejoin="round"/>{coords.map(point => <g key={point.term}><rect x={point.x-6} y={point.y-6} width="12" height="12" fill="#ffe798" stroke="#172640" strokeWidth="3"/><text x={point.x} y={height-5} textAnchor="middle" fill="#c6d5ef" fontSize="12">{point.term}</text></g>)}</svg><div className="absolute right-3 top-3 border-2 border-[#f4c659] bg-[#523f20] px-2 py-1 text-xs font-black text-[#ffe893]">GPA / {system}</div></div>;
}

function EmptyState({ icon, title, detail, action }: { icon: React.ReactNode; title: string; detail: string; action?: () => void }) { return <div className="flex min-h-52 flex-col items-center justify-center border-2 border-dashed border-[#58709d] bg-[#14213a] p-6 text-center"><span className="flex h-12 w-12 items-center justify-center border-2 border-[#8397bc] text-[#b9cbed]">{icon}</span><h3 className="mt-4 font-black text-[#fff8df]">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#afc0dc]">{detail}</p>{action && <PixelButton onClick={action} className="mt-4"><Plus size={16} /> 開始新增</PixelButton>}</div>; }

function AchievementCelebration({ achievement, onClose }: { achievement: { title: string; description: string; icon: string }; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071024]/85 p-4" role="dialog" aria-modal="true" aria-labelledby="achievement-title"><div className="absolute inset-0 overflow-hidden" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <span key={index} className="animate-twinkle absolute text-xl text-[#ffe797]" style={{ left: `${(index * 37) % 96 + 2}%`, top: `${(index * 23) % 82 + 5}%`, animationDelay: `${(index % 7) * 120}ms` }}>✦</span>)}</div><div className="pixel-panel-gold animate-prize relative w-full max-w-md bg-[#1d2d4c] p-7 text-center"><button onClick={onClose} className="absolute right-3 top-3 p-1 text-[#aebfdb] hover:text-white" aria-label="關閉成就通知"><X size={20} /></button><p className="pixel-font text-[9px] leading-6 text-[#f4c659]">ACHIEVEMENT UNLOCKED!</p><div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center border-4 border-[#f4c659] bg-[#614f27] text-5xl shadow-[5px_5px_0_#080d1f]">{achievement.icon}</div><h2 id="achievement-title" className="mt-5 text-2xl font-black text-[#fff8df]">{achievement.title}</h2><p className="mt-3 text-sm leading-7 text-[#c8d6ea]">{achievement.description}</p><PixelButton onClick={onClose} className="mt-6 bg-[#f4c659] text-[#152544]"><Trophy size={16} /> 收下徽章</PixelButton></div></div>; }
