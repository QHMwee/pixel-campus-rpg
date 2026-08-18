import {
  Award,
  BarChart3,
  BookOpen,
  CalendarPlus,
  ChevronRight,
  CircleHelp,
  Compass,
  Crown,
  Download,
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
import { trpc } from "@/lib/trpc";
import { decodeFragmentTranscriptImport, mergeFragmentTranscriptImport } from "@shared/fragmentImport";
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
  ccee114GraduationGoals,
  createBlankAcademicStart,
  defaultGraduationGoals,
  defaultRecommendationPreferences,
  calculateGpa,
  getAchievements,
  getAcademicSkills,
  getGradePoint,
  getLevel,
  getCreditPlanStatus,
  getCcee114CommonEducationProgress,
  getCalendarReadyPlanCourses,
  getExportablePlanCourses,
  getTermGpas,
  getXp,
  gradeOptions,
  buildNkustTimetableTemplate,
  prepareNkustTimetableDraftImport,
  prepareNkustTimetableImport,
  prepareTranscriptImport,
  prepareTranscriptDraftImport,
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
} from "@shared/academic";

type View = "plan" | "dashboard" | "grades" | "credits" | "quest" | "projects" | "badges";

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
  system: GradePointSystem;
  careerPath: CareerPath;
  preferences: RecommendationPreferences;
  plannedCourses: PlannedCourse[];
  hasCompletedPlanIntro: boolean;
};

type AiPlanningSection = Exclude<View, "plan">;
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
  preferences: defaultRecommendationPreferences,
  goals: initialGoals,
  plannedCourses: [],
  hasCompletedPlanIntro: false,
};

const categoryLabel: Record<CourseCategory, string> = { required: "必修", elective: "選修", general: "通識" };
const recognitionLabel: Record<CreditRecognition, string> = { standard: "一般／系內", "approved-external": "外系已認列", pending: "待確認認列", "gpa-only": "僅計 GPA" };
const recognitionTone: Record<CreditRecognition, string> = { standard: "border-[#58709d] bg-[#1e3458] text-[#d3e2ff]", "approved-external": "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]", pending: "border-[#f4c659] bg-[#4c4024] text-[#ffe797]", "gpa-only": "border-[#aa97ff] bg-[#40376f] text-[#ded6ff]" };
const statusLabel: Record<ProjectStatus, string> = { planning: "籌備中", active: "進行中", done: "已完成" };
const categoryTone: Record<CourseCategory, string> = { required: "bg-[#f4c659] text-[#18203b]", elective: "bg-[#8ec6ff] text-[#13223d]", general: "bg-[#a9e6ba] text-[#132b29]" };
const statusTone: Record<ProjectStatus, string> = { planning: "bg-[#687b9e]", active: "bg-[#6c55d9]", done: "bg-[#3b9a74]" };

const navItems: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "plan", label: "課程規劃", icon: BookOpen },
  { id: "dashboard", label: "冒險總覽", icon: Compass },
  { id: "grades", label: "成績卷軸", icon: ScrollText },
  { id: "credits", label: "學分地圖", icon: Target },
  { id: "quest", label: "智慧任務", icon: WandSparkles },
  { id: "projects", label: "專題工坊", icon: FolderKanban },
  { id: "badges", label: "成就圖鑑", icon: Award },
];

const emptyCourse = (): Omit<CourseRecord, "id"> => ({ term: "114-2", name: "", credits: 3, grade: "A", category: "required", recognition: "standard" });
const emptyProject = (): Omit<ProjectRecord, "id"> => ({ name: "", description: "", tags: [], startDate: "2026-02", endDate: "2026-06", status: "planning" });
const emptyPlannedCourse = (): PlannedCourse => ({ id: crypto.randomUUID(), term: "", name: "", credits: 3, category: "required", priority: "must" });

function loadData(): QuestData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyQuestData;
    const parsed = JSON.parse(saved) as Partial<QuestData>;
    const restoredGoals = { ...initialGoals, ...(parsed.goals ?? {}) };
    const usesLegacyGenericGoals = restoredGoals.total === 128 && restoredGoals.required === 60 && restoredGoals.elective === 42 && restoredGoals.general === 26;
    return {
      courses: Array.isArray(parsed.courses) ? parsed.courses.filter(course => !legacyDemoCourseIds.has(course.id)) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.filter(project => !legacyDemoProjectIds.has(project.id)) : [],
      goals: usesLegacyGenericGoals ? { ...ccee114GraduationGoals, semestersLeft: restoredGoals.semestersLeft } : restoredGoals,
      system: "4.3",
      careerPath: careerProfiles.some(profile => profile.id === parsed.careerPath) ? parsed.careerPath as CareerPath : "frontend",
      preferences: {
        workload: parsed.preferences?.workload === "light" || parsed.preferences?.workload === "ambitious" ? parsed.preferences.workload : defaultRecommendationPreferences.workload,
        category: parsed.preferences?.category === "required" || parsed.preferences?.category === "elective" || parsed.preferences?.category === "general" ? parsed.preferences.category : defaultRecommendationPreferences.category,
        projectStyle: parsed.preferences?.projectStyle === "team" || parsed.preferences?.projectStyle === "research" ? parsed.preferences.projectStyle : defaultRecommendationPreferences.projectStyle,
      },
      plannedCourses: Array.isArray(parsed.plannedCourses) ? parsed.plannedCourses.filter((course): course is PlannedCourse => Boolean(course && typeof course.name === "string" && typeof course.term === "string" && Number.isFinite(course.credits) && (course.category === "required" || course.category === "elective" || course.category === "general") && (course.priority === "must" || course.priority === "important" || course.priority === "explore"))) : [],
      hasCompletedPlanIntro: Boolean(parsed.hasCompletedPlanIntro),
    };
  } catch {
    return emptyQuestData;
  }
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

export default function Home() {
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
  const mounted = useRef(false);
  const fragmentImportHandled = useRef(false);
  const previousAchievementIds = useRef<string[]>([]);
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

  const gpa = useMemo(() => calculateGpa(data.courses, data.system), [data.courses, data.system]);
  const credits = useMemo(() => calculateCredits(data.courses), [data.courses]);
  const termGpas = useMemo(() => getTermGpas(data.courses, data.system), [data.courses, data.system]);
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

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    if (window.location.hash.startsWith("#cq-import")) return;
    window.history.replaceState(null, "", activeView === "dashboard" ? "/" : `/#${activeView}`);
  }, [activeView]);

  useEffect(() => {
    if (fragmentImportHandled.current) return;
    fragmentImportHandled.current = true;
    void (async () => {
      const fragment = window.location.hash.slice(1);
      if (!fragment.startsWith("cq-import")) return;
      const fragmentCourses = await decodeFragmentTranscriptImport(fragment);
      if (!fragmentCourses) {
        const usesCompressedImport = window.location.hash.startsWith("#cq-import-gz=");
        setFragmentImportError(usesCompressedImport && typeof DecompressionStream === "undefined"
          ? "此瀏覽器不支援壓縮匯入連結。請改用最新版 Chrome、Safari 或 Edge 後重新開啟連結。"
          : "這個一次性匯入連結無法解讀或已不完整，因此沒有寫入任何成績資料。請重新取得完整連結後再試。");
        setActiveView("grades");
        window.history.replaceState(null, "", "/#grades");
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
      window.history.replaceState(null, "", "/#grades");
    })();
  }, []);

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

  function resetQuest() {
    if (window.confirm("確定要清除這台裝置上的課程、成績與專題紀錄，重新開始規劃嗎？")) {
      setData(emptyQuestData);
      setActiveView("plan");
      setCourseForm(null);
      setProjectForm(null);
    }
  }

  function addPlannedCourse() {
    setData(current => ({ ...current, plannedCourses: [...current.plannedCourses, emptyPlannedCourse()] }));
  }

  function updatePlannedCourse(id: string, patch: Partial<PlannedCourse>) {
    setData(current => ({ ...current, plannedCourses: current.plannedCourses.map(course => course.id === id ? { ...course, ...patch } : course) }));
  }

  function removePlannedCourse(id: string) {
    setData(current => ({ ...current, plannedCourses: current.plannedCourses.filter(course => course.id !== id) }));
  }

  function completePlanIntro() {
    setData(current => ({ ...current, hasCompletedPlanIntro: true }));
    setActiveView("dashboard");
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
    const preview = prepareNkustTimetableImport(text, data.plannedCourses);
    setNkustTimetablePreview(preview);
    setNkustTimetableDraft(preview.accepted);
  }

  function openCcee114RequiredPlan() {
    const text = buildCcee114RequiredCoursePlanCsv();
    const preview = prepareNkustTimetableImport(text, data.plannedCourses);
    setNkustImportMode("ccee114");
    setNkustTimetableText(text);
    setNkustTimetablePreview(preview);
    setNkustTimetableDraft(preview.accepted);
    setNkustImportOpen(true);
  }

  function updateNkustTimetableDraft(index: number, patch: Partial<NkustPlannedCourseDraft>) {
    setNkustTimetableDraft(current => {
      const next = current.map((course, rowIndex) => rowIndex === index ? { ...course, ...patch } : course);
      setNkustTimetablePreview(prepareNkustTimetableDraftImport(next, data.plannedCourses, nkustTimetablePreview?.headers));
      return next;
    });
  }

  function removeNkustTimetableDraftRow(index: number) {
    setNkustTimetableDraft(current => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      setNkustTimetablePreview(prepareNkustTimetableDraftImport(next, data.plannedCourses, nkustTimetablePreview?.headers));
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
      const preview = prepareNkustTimetableImport(text, data.plannedCourses);
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

  function openCourseEditor(course?: CourseRecord) {
    setEditingCourseId(course?.id ?? null);
    setCourseForm(course ? { term: course.term, name: course.name, credits: course.credits, grade: course.grade, category: course.category } : emptyCourse());
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
          <button onClick={() => setActiveView(data.hasCompletedPlanIntro ? "dashboard" : "plan")} className="flex items-center gap-3 text-left" aria-label="前往主要頁面">
            <span className="crest flex h-12 w-12 items-center justify-center bg-[#f4c659] text-[#1d3153] shadow-[3px_3px_0_#080d1f]"><GraduationCap size={27} strokeWidth={2.8} /></span>
            <span>
              <span className="pixel-font block text-[10px] leading-6 text-[#f4c659]">CAMPUS QUEST</span>
              <span className="block text-sm font-bold tracking-[.22em] text-[#f7f2d3]">大學生涯冒險誌</span>
            </span>
          </button>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="hidden text-right sm:block">
              <p className="pixel-font text-[8px] text-[#93a7cb]">LOCAL SAVE ACTIVE</p>
              <p className="mt-1 text-xs font-semibold text-[#dce7ff]">資料只儲存在此裝置</p>
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
                return <button key={item.id} onClick={() => setActiveView(item.id)} className={`pixel-corners flex items-center gap-3 px-3 py-3 text-left text-sm font-bold transition-colors ${isActive ? "bg-[#f4c659] text-[#16233f] shadow-[3px_3px_0_#080d1f]" : "text-[#dce7ff] hover:bg-[#293d61]"}`}><Icon size={18} /><span>{item.label}</span>{isActive && <ChevronRight className="ml-auto hidden lg:block" size={16} />}</button>;
              })}
            </nav>
            <div className="mt-4 border-t-2 border-[#4b628e] px-3 pt-4">
              <p className="pixel-font text-[8px] leading-5 text-[#93a7cb]">GAME SYSTEM</p>
              <button onClick={resetQuest} className="mt-2 text-xs font-bold text-[#b8c9ed] underline decoration-[#b8c9ed]/40 underline-offset-4 hover:text-[#f4c659]">清除本機資料，重新開始</button>
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

            {activeView === "plan" && <><CoursePlanView courses={data.plannedCourses} completedCredits={credits.total} plannedCredits={plannedCredits} plannedRequiredCredits={plannedRequiredCredits} goals={data.goals} exportableCount={exportablePlanCourses.length} calendarReadyCount={calendarReadyPlanCourses.length} exportNotice={planExportNotice} onAdd={addPlannedCourse} onUpdate={updatePlannedCourse} onRemove={removePlannedCourse} onExportCsv={exportCoursePlanCsv} onExportNotionCsv={exportNotionCoursePlanCsv} onOpenNotion={openNotionFourYearPlan} onExportCalendar={exportCoursePlanCalendar} onComplete={completePlanIntro} /><Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="NKUST TIMETABLE CSV" title="高科大課表匯入" action={<FileText className="text-[#74e2b1]" />} /><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm leading-7 text-[#d5e0f2]">可匯入你自行從高科大課程資料查詢整理並另存的 CSV／TSV。系統只讀取學期、課程、學分與類別；任何學號、姓名、成績或缺曠欄位都不會對應或保存。</p><p className="mt-3 border-l-4 border-[#74e2b1] pl-3 text-xs leading-5 text-[#c7f7dc]">先預覽並逐列確認，才會加入本機「規劃中」課程；不會改變 GPA、已完成學分、能力或 XP。</p></div><PixelButton onClick={() => setNkustImportOpen(true)} className="bg-[#245d58] text-[#e1fff6]"><FileText size={16} /> 匯入高科大 CSV</PixelButton></div></Panel></>}
            {activeView === "dashboard" && <DashboardView gpa={gpa} data={data} credits={credits} level={level} xp={xp} skills={academicSkills} recommendations={recommendations} termGpas={termGpas} completedProjects={completedProjects} unlockedAchievements={unlockedAchievements.length} onGo={setActiveView} />}
            {activeView === "plan" && <Panel gold className="mt-4 overflow-hidden"><PanelTitle eyebrow="CCEE 114 CURRICULUM" title="電通系 114 課程結構" action={<GraduationCap className="text-[#f4c659]" />} /><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm leading-7 text-[#d5e0f2]">依高科大電腦與通訊工程系四技 114 學年度入學課程結構，畢業目標為總計 128 學分：系必修 51、系專業選修 49、校共同與通識 28。模板只帶入官方明列的 21 門系必修，不會捏造你尚未選定的 49 學分選修。</p><p className="mt-3 border-l-4 border-[#f4c659] pl-3 text-xs leading-5 text-[#ffe9a4]">載入後仍會先顯示逐列草稿；你確認匯入時才更新這台裝置的學分目標與規劃。既有同學期、同課名課程會略過，不會被覆寫。</p></div><PixelButton onClick={openCcee114RequiredPlan} className="bg-[#f4c659] text-[#152544]"><GraduationCap size={16} /> 載入電通 114 必修</PixelButton></div></Panel>}
            {activeView === "grades" && <GradesView courses={data.courses} system={data.system} gpa={gpa} termGpas={termGpas} courseForm={courseForm} editingCourseId={editingCourseId} setCourseForm={setCourseForm} onOpen={openCourseEditor} onImport={() => setTranscriptOpen(true)} importReport={importReport} fragmentImportError={fragmentImportError} onSave={saveCourse} onCancel={() => { setCourseForm(null); setEditingCourseId(null); }} onDelete={id => setData(current => ({ ...current, courses: current.courses.filter(course => course.id !== id) }))} />}
            {activeView === "credits" && <><CreditPlanningSummary status={creditPlanStatus} /><CreditsView credits={credits} goals={data.goals} showEditor={showGoalEditor} setShowEditor={setShowGoalEditor} onGoalChange={updateGoals} onApplyCcee114Goals={applyCcee114Goals} /><CceeCommonEducationMap courses={data.courses} /><CreditRecognitionMap courses={data.courses} /></>}
            {activeView === "quest" && <><PreferenceControls preferences={recommendationPreferences} onChange={preferences => setData(current => ({ ...current, preferences }))} /><CareerQuestView recommendations={recommendations} careerPath={data.careerPath} onCareerPathChange={careerPath => setData(current => ({ ...current, careerPath }))} goals={data.goals} gpa={gpa} credits={credits} completedProjects={completedProjects} /></>}
            {activeView === "projects" && <ProjectsView projects={data.projects} projectForm={projectForm} editingProjectId={editingProjectId} setProjectForm={setProjectForm} onOpen={openProjectEditor} onSave={saveProject} onCancel={() => { setProjectForm(null); setEditingProjectId(null); }} onDelete={id => setData(current => ({ ...current, projects: current.projects.filter(project => project.id !== id) }))} />}
            {activeView === "badges" && <BadgesView achievements={achievements} unlocked={unlockedAchievements.length} />}
            <AiPlannerPanel section={activeView === "plan" ? "dashboard" : activeView} snapshot={aiSnapshot} />
          </div>
        </div>
      </div>

      {celebration && <AchievementCelebration achievement={celebration} onClose={() => setCelebration(null)} />}
      <TranscriptImportDialogV2 open={transcriptOpen} onOpenChange={setTranscriptOpen} text={transcriptText} preview={transcriptPreview} draft={transcriptDraft} onTextChange={text => { setTranscriptText(text); setTranscriptMapping({}); const preview = prepareTranscriptImport(text, data.courses); setTranscriptPreview(preview); setTranscriptDraft(preview.toImport); setPdfConversionNote(null); }} onFileChange={readTranscriptFile} onPdfChange={readTranscriptPdf} isPdfConverting={pdfConverter.isPending} pdfNote={pdfConversionNote} onDraftChange={updateTranscriptDraft} onDraftDelete={removeTranscriptDraftRow} onPreview={() => previewTranscript()} onConfirm={confirmTranscriptImport} />
      <NkustTimetableImportDialog open={nkustImportOpen} onOpenChange={setNkustImportOpen} text={nkustTimetableText} preview={nkustTimetablePreview} draft={nkustTimetableDraft} onTextChange={text => { setNkustTimetableText(text); const preview = prepareNkustTimetableImport(text, data.plannedCourses); setNkustTimetablePreview(preview); setNkustTimetableDraft(preview.accepted); }} onFileChange={readNkustTimetableFile} onDownloadTemplate={() => downloadTextFile(buildNkustTimetableTemplate(), "nkust-timetable-template.csv", "text/csv")} onDraftChange={updateNkustTimetableDraft} onDraftDelete={removeNkustTimetableDraftRow} onPreview={() => previewNkustTimetable()} onConfirm={confirmNkustTimetableImport} />
      {transcriptOpen && transcriptPreview?.needsMapping && <TranscriptMappingWizard open headers={transcriptPreview.headers ?? []} sample={transcriptPreview.sample ?? []} mapping={transcriptMapping} onChange={setTranscriptMapping} onApply={() => previewTranscript(transcriptText, transcriptMapping)} onClose={() => setTranscriptPreview(null)} />}
    </main>
  );
}

function DashboardView({ gpa, data, credits, level, xp, skills, recommendations, termGpas, completedProjects, unlockedAchievements, onGo }: { gpa: number; data: QuestData; credits: ReturnType<typeof calculateCredits>; level: ReturnType<typeof getLevel>; xp: number; skills: ReturnType<typeof getAcademicSkills>; recommendations: ReturnType<typeof buildCareerRecommendations>; termGpas: ReturnType<typeof getTermGpas>; completedProjects: number; unlockedAchievements: number; onGo: (view: View) => void }) {
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
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <StatChip icon={<BarChart3 />} label="累計 GPA" value={gpa.toFixed(2)} tone="gold" />
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

function GradesView({ courses, system, gpa, termGpas, courseForm, editingCourseId, setCourseForm, onOpen, onImport, importReport, fragmentImportError, onSave, onCancel, onDelete }: { courses: CourseRecord[]; system: GradePointSystem; gpa: number; termGpas: ReturnType<typeof getTermGpas>; courseForm: Omit<CourseRecord, "id"> | null; editingCourseId: string | null; setCourseForm: React.Dispatch<React.SetStateAction<Omit<CourseRecord, "id"> | null>>; onOpen: (course?: CourseRecord) => void; onImport: () => void; importReport: { courseCount: number; skillNames: string[]; xpGain: number; leveledUp: boolean } | null; fragmentImportError: string | null; onSave: () => void; onCancel: () => void; onDelete: (id: string) => void }) {
  const grouped = Array.from(new Set(courses.map(course => course.term))).sort((a, b) => b.localeCompare(a, "zh-Hant"));
  return <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px] animate-pop-in">
    <Panel className="overflow-hidden"><PanelTitle eyebrow="GRADE SCROLL" title="成績卷軸" action={<div className="flex flex-wrap gap-2"><PixelButton onClick={onImport} className="bg-[#4a3d95]"><ScrollText size={17} /> 匯入成績單</PixelButton><PixelButton onClick={() => onOpen()} className="bg-[#f4c659] text-[#152544]"><Plus size={17} /> 新增課程</PixelButton></div>} />
      <div className="p-4 sm:p-5">{fragmentImportError && <div className="mb-5 border-2 border-[#e8817a] bg-[#4a2d35] p-4 text-sm font-bold leading-6 text-[#ffd7d2]">{fragmentImportError}</div>}{importReport && <div className="mb-5 border-2 border-[#f4c659] bg-[#4d4024] p-4 shadow-[3px_3px_0_#080d1f]"><p className="pixel-font text-[8px] leading-5 text-[#ffe797]">TRANSCRIPT LOOT ACQUIRED</p><p className="mt-2 font-black text-[#fff8df]">已匯入 {importReport.courseCount} 門課程，獲得 +{importReport.xpGain} XP{importReport.leveledUp ? "，角色已升級！" : "。"}</p><p className="mt-2 text-xs leading-5 text-[#e2d3a4]">新解鎖能力：{importReport.skillNames.length ? importReport.skillNames.join("、") : "已存在的能力標籤已強化"}</p></div>}<div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><SmallMetric label="累計 GPA" value={gpa.toFixed(2)} /><SmallMetric label="計算制度" value={system} /><SmallMetric label="課程總數" value={`${courses.length}`} /><SmallMetric label="學期數" value={`${termGpas.length}`} /></div>
      {grouped.length === 0 ? <EmptyState icon={<ScrollText />} title="卷軸仍是空白" detail="新增第一門課程，開始記錄你的學術冒險。" action={() => onOpen()} /> : <div className="space-y-5">{grouped.map(term => { const entries = courses.filter(course => course.term === term); const termGpa = termGpas.find(item => item.term === term)?.gpa ?? 0; return <div key={term}><div className="mb-2 flex items-center justify-between border-b-2 border-[#4e638c] pb-2"><p className="pixel-font text-[9px] leading-5 text-[#f4c659]">{term} TERM</p><span className="text-xs font-black text-[#d9e5fb]">學期 GPA <b className="ml-1 text-base text-[#f4c659]">{termGpa.toFixed(2)}</b></span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-[#9caed0]"><tr><th className="pb-2 pl-2">課程</th><th className="pb-2">類別</th><th className="pb-2 text-center">學分</th><th className="pb-2 text-center">等第</th><th className="pb-2 text-center">點數</th><th className="pb-2 text-right">操作</th></tr></thead><tbody>{entries.map(course => <tr key={course.id} className="border-t-2 border-[#334b73] hover:bg-[#213554]"><td className="py-3 pl-2 font-bold text-[#fff8df]">{course.name}</td><td><span className={`inline-flex px-2 py-1 text-xs font-black ${categoryTone[course.category]}`}>{categoryLabel[course.category]}</span></td><td className="text-center font-bold text-[#d8e4fc]">{course.credits}</td><td className="text-center"><span className="inline-flex min-w-9 justify-center border-2 border-[#f4c659] bg-[#4e4023] px-2 py-1 font-black text-[#ffe58e]">{course.grade}</span></td><td className="text-center font-bold text-[#bcd1f6]">{getGradePoint(course.grade, system).toFixed(1)}</td><td className="pr-2 text-right"><button onClick={() => onOpen(course)} className="mr-2 p-1.5 text-[#b9c8e6] hover:text-[#f4c659]" aria-label={`編輯 ${course.name}`}><Pencil size={16} /></button><button onClick={() => window.confirm(`確定刪除「${course.name}」嗎？`) && onDelete(course.id)} className="p-1.5 text-[#b9c8e6] hover:text-[#f28682]" aria-label={`刪除 ${course.name}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></div>; })}</div>}</div>
    </Panel>
    <div className="space-y-4"><RecognitionStatusSummary courses={courses} /><CourseEditor form={courseForm} editing={Boolean(editingCourseId)} setForm={setCourseForm} onSave={onSave} onCancel={onCancel} /></div>
  </div>;
}

function CourseEditor({ form, editing, setForm, onSave, onCancel }: { form: Omit<CourseRecord, "id"> | null; editing: boolean; setForm: React.Dispatch<React.SetStateAction<Omit<CourseRecord, "id"> | null>>; onSave: () => void; onCancel: () => void }) {
  return <Panel className="h-fit overflow-hidden 2xl:sticky 2xl:top-5"><PanelTitle eyebrow="COURSE EDITOR" title={form ? editing ? "編輯課程" : "新增課程" : "準備書寫"} action={<BookOpen className="text-[#f4c659]" />} /><div className="p-5">{!form ? <EmptyState icon={<Plus />} title="新增一則紀錄" detail="將每一次修課成果收入卷軸，GPA 與學分進度會自動更新。" /> : <div className="space-y-4"><Field label="課程名稱"><input value={form.name} onChange={event => setForm(current => current && { ...current, name: event.target.value })} placeholder="例如：演算法" className="pixel-input w-full px-3 py-2.5" /></Field><div className="grid grid-cols-2 gap-3"><Field label="學期"><input value={form.term} onChange={event => setForm(current => current && { ...current, term: event.target.value })} placeholder="114-2" className="pixel-input w-full px-3 py-2.5" /></Field><Field label="學分"><input type="number" min="1" max="12" value={form.credits} onChange={event => setForm(current => current && { ...current, credits: Number(event.target.value) })} className="pixel-input w-full px-3 py-2.5" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="成績等第"><select value={form.grade} onChange={event => setForm(current => current && { ...current, grade: event.target.value as LetterGrade })} className="pixel-input w-full px-3 py-2.5">{gradeOptions.map(grade => <option key={grade}>{grade}</option>)}</select></Field><Field label="課程類別"><select value={form.category} onChange={event => setForm(current => current && { ...current, category: event.target.value as CourseCategory })} className="pixel-input w-full px-3 py-2.5">{Object.entries(categoryLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div><Field label="畢業學分認列"><select value={form.recognition ?? "standard"} onChange={event => setForm(current => current && { ...current, recognition: event.target.value as CreditRecognition })} className="pixel-input w-full px-3 py-2.5">{Object.entries(recognitionLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><p className="mt-1.5 text-[11px] leading-5 text-[#91a5c8]">所有狀態都計入 GPA；只有「僅計 GPA」不會增加電通系畢業學分。</p></Field><div className="flex gap-3 pt-2"><PixelButton onClick={onSave} disabled={!form.name.trim() || !form.term.trim()} className="flex-1 bg-[#f4c659] text-[#162442]"><ShieldCheck size={16} /> 儲存紀錄</PixelButton><PixelButton onClick={onCancel} className="bg-[#33486c]"><X size={16} /></PixelButton></div></div>}</div></Panel>;
}

function TranscriptMappingWizard({ open, headers, sample, mapping, onChange, onApply, onClose }: { open: boolean; headers: string[]; sample: string[]; mapping: TranscriptFieldMap; onChange: (mapping: TranscriptFieldMap) => void; onApply: () => void; onClose: () => void }) {
  const fields: TranscriptField[] = ["term", "name", "credits", "grade", "category"];
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

function CreditPlanningSummary({ status }: { status: ReturnType<typeof getCreditPlanStatus> }) {
  const labels: Record<(typeof status)[number]["category"], string> = { total: "畢業總學分", required: "必修", elective: "選修", general: "通識" };
  return <Panel gold className="mb-4 overflow-hidden animate-pop-in"><PanelTitle eyebrow="PLAN VS. PROGRESS" title="規劃與實際進度" action={<BookOpen className="text-[#f4c659]" />} /><div className="p-5"><p className="max-w-3xl text-sm leading-7 text-[#c8d7ec]">這裡會把你已完成的學分與課程規劃表中的預計學分分開看。規劃能幫你估算缺口，但不會被當作已修學分，也不會影響 GPA。</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{status.map(row => <div key={row.category} className="border-2 border-[#4d638d] bg-[#15233f] p-3"><p className="font-black text-[#fff8df]">{labels[row.category]}</p><p className="mt-2 text-xs text-[#9fb2d2]">已完成 <b className="text-[#74e2b1]">{row.completedCredits}</b> · 規劃中 <b className="text-[#f4c659]">{row.plannedCredits}</b></p><p className="mt-2 text-sm font-black text-[#dce8ff]">規劃後尚差 <span className="text-[#f4c659]">{row.remainingAfterPlan}</span> 學分</p></div>)}</div></div></Panel>;
}

function CreditsView({ credits, goals, showEditor, setShowEditor, onGoalChange, onApplyCcee114Goals }: { credits: ReturnType<typeof calculateCredits>; goals: GraduationGoals; showEditor: boolean; setShowEditor: (show: boolean) => void; onGoalChange: (key: keyof GraduationGoals, value: number) => void; onApplyCcee114Goals: () => void }) {
  const rows: { key: "total" | CourseCategory; label: string; done: number; target: number; tone: "gold" | "mint" | "violet" }[] = [ { key: "total", label: "畢業總學分", done: credits.total, target: goals.total, tone: "gold" }, { key: "required", label: "必修主線", done: credits.required, target: goals.required, tone: "mint" }, { key: "elective", label: "選修支線", done: credits.elective, target: goals.elective, tone: "violet" }, { key: "general", label: "通識探索", done: credits.general, target: goals.general, tone: "gold" } ];
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] animate-pop-in"><Panel className="overflow-hidden"><PanelTitle eyebrow="CREDIT MAP" title="學分地圖" action={<PixelButton onClick={() => setShowEditor(!showEditor)}><Pencil size={16} /> 設定目標</PixelButton>} /><div className="p-5 sm:p-7"><div className="relative overflow-hidden border-4 border-[#50668f] bg-[#13213b] p-5 sm:p-8"><div className="absolute right-4 top-4 text-[#273e62]"><Compass size={96} strokeWidth={1} /></div><p className="pixel-font text-[9px] leading-6 text-[#f4c659]">GRADUATION ROUTE</p><h3 className="mt-3 max-w-lg text-2xl font-black text-[#fff8df]">還有 {Math.max(0, goals.total - credits.total)} 學分，抵達畢業城門。</h3><p className="mt-3 max-w-xl text-sm leading-7 text-[#afc0df]">每一格進度都是探索紀錄。完成主線、支線與通識三類任務，即可點亮畢業傳送門。</p></div><div className="mt-6 space-y-5">{rows.map(row => { const remaining = Math.max(0, row.target - row.done); const percent = row.target ? (row.done / row.target) * 100 : 0; return <div key={row.key} className="border-2 border-[#4c628c] bg-[#172640] p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-extrabold text-[#fff8df]">{row.label}</p><p className="mt-1 text-xs text-[#aebfdd]">已修 {row.done} / {row.target} 學分</p></div><p className="text-sm font-black text-[#f4c659]">尚差 {remaining}</p></div><div className="mt-3"><ProgressBar value={percent} tone={row.tone} /></div></div>; })}</div></div></Panel><Panel className="h-fit overflow-hidden"><PanelTitle eyebrow="GOAL SETTINGS" title="畢業任務設定" action={<Target className="text-[#f4c659]" />} /><div className="p-5">{showEditor ? <div className="space-y-4"><p className="text-sm leading-6 text-[#b7c7e2]">變更後會立刻重算每條學分任務的剩餘距離。</p><PixelButton onClick={onApplyCcee114Goals} className="w-full bg-[#245d58] text-[#e1fff6]"><GraduationCap size={16} /> 套用電通系 114 目標（51／49／28／128）</PixelButton><GoalInput label="畢業總學分" value={goals.total} onChange={value => onGoalChange("total", value)} /><GoalInput label="必修學分" value={goals.required} onChange={value => onGoalChange("required", value)} /><GoalInput label="選修學分" value={goals.elective} onChange={value => onGoalChange("elective", value)} /><GoalInput label="通識學分" value={goals.general} onChange={value => onGoalChange("general", value)} /><GoalInput label="剩餘學期" value={goals.semestersLeft} onChange={value => onGoalChange("semestersLeft", value)} /><PixelButton onClick={() => setShowEditor(false)} className="mt-2 w-full bg-[#f4c659] text-[#152544]"><ShieldCheck size={16} /> 套用任務設定</PixelButton></div> : <div className="space-y-4"><div className="border-2 border-[#48608b] bg-[#16243f] p-4"><p className="text-xs font-bold text-[#93a8ce]">目標學分結構</p><div className="mt-3 grid grid-cols-2 gap-3"><SmallMetric label="總學分" value={`${goals.total}`} /><SmallMetric label="剩餘學期" value={`${goals.semestersLeft}`} /><SmallMetric label="必修" value={`${goals.required}`} /><SmallMetric label="選修＋通識" value={`${goals.elective + goals.general}`} /></div></div><p className="text-sm leading-7 text-[#b6c5df]">你的學分地圖可依校系畢業規定調整。設定不會上傳，會保留在這台裝置。</p><PixelButton onClick={() => setShowEditor(true)} className="w-full"><Pencil size={16} /> 調整畢業目標</PixelButton></div>}</div></Panel></div>;
}
function CceeCommonEducationMap({ courses }: { courses: CourseRecord[] }) {
  const rows = getCcee114CommonEducationProgress(courses);
  const completed = rows.reduce((total, row) => total + row.credits, 0);
  const target = rows.reduce((total, row) => total + row.target, 0);
  return <Panel className="mt-4 overflow-hidden"><PanelTitle eyebrow="CCEE 114 COMMON EDUCATION" title="校共同與通識進度" action={<GraduationCap className="text-[#f4c659]" />} /><div className="p-5"><p className="max-w-3xl text-sm leading-7 text-[#c8d7ec]">電通系 114 校共同與通識合計 28 學分：中文 4、英文 8、博雅 14（至少三個不同課群）及校訂 2。只有已計入畢業學分的課程會出現在這裡；僅計 GPA 的不分系課程不會增加進度。</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{rows.map(row => { const percent = row.target ? (row.credits / row.target) * 100 : 0; return <div key={row.id} className="border-2 border-[#4c628c] bg-[#172640] p-4"><div className="flex items-start justify-between gap-3"><p className="font-black text-[#fff8df]">{row.label}</p><span className={`border px-2 py-1 text-[10px] font-black ${row.remaining === 0 ? "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]" : "border-[#f4c659] bg-[#4c4024] text-[#ffe797]"}`}>{row.remaining === 0 ? "已達標" : `尚差 ${row.remaining}`}</span></div><p className="mt-3 text-xl font-black text-[#f4c659]">{row.credits} <span className="text-sm text-[#b7c8e4]">/ {row.target} 學分</span></p><div className="mt-3"><ProgressBar value={percent} tone={row.remaining === 0 ? "mint" : "gold"} /></div><p className="mt-3 text-xs leading-5 text-[#aebfdd]">{row.detail}</p></div>; })}</div><div className="mt-4 border-l-4 border-[#f4c659] bg-[#3e3421] px-4 py-3 text-sm leading-6 text-[#ffe9a4]">目前已在此四項累積 <b>{completed}</b>／{target} 學分；「博雅通識」會顯示已涵蓋的課群，方便檢查至少三個不同課群的規定。</div></div></Panel>;
}
function GoalInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c7d5ec]">{label}</span><input className="pixel-input w-full px-3 py-2.5" type="number" min="0" value={value} onChange={event => onChange(Number(event.target.value))} /></label>; }

function QuestView({ recommendations, goals, gpa, credits, completedProjects }: { recommendations: ReturnType<typeof buildCareerRecommendations>; goals: GraduationGoals; gpa: number; credits: ReturnType<typeof calculateCredits>; completedProjects: number }) {
  const completion = goals.total ? Math.round((credits.total / goals.total) * 100) : 0;
  return <div className="space-y-4 animate-pop-in"><Panel gold className="overflow-hidden"><div className="grid gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:p-8"><span className="crest mx-auto flex h-20 w-20 items-center justify-center bg-[#f4c659] text-[#1d3153] shadow-[5px_5px_0_#080d1f] md:mx-0"><WandSparkles size={38} /></span><div><p className="pixel-font text-[9px] leading-6 text-[#a28cff]">AI-STYLE QUEST GUIDE</p><h2 className="mt-2 text-2xl font-black text-[#fff8df]">下一學期的智慧任務</h2><p className="mt-4 max-w-3xl text-base leading-8 text-[#d6e0f1]">{recommendations.goal}</p><div className="mt-5 flex flex-wrap gap-2"><span className="border-2 border-[#f4c659] bg-[#4f4222] px-3 py-1.5 text-xs font-black text-[#ffe796]">建議修習 {recommendations.suggestedCredits} 學分</span><span className="border-2 border-[#74e2b1] bg-[#1f4d47] px-3 py-1.5 text-xs font-black text-[#c5f8dd]">目前 GPA {gpa.toFixed(2)}</span><span className="border-2 border-[#aa97ff] bg-[#443a78] px-3 py-1.5 text-xs font-black text-[#ded6ff]">已完成專題 {completedProjects}</span></div></div></div></Panel><div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="RECOMMENDED QUESTS" title="選課與成長建議" action={<Compass className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#42557d] px-5">{recommendations.suggestions.map((suggestion, index) => <div className="flex gap-4 py-5" key={suggestion}><span className="pixel-font flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#f4c659] bg-[#5a4923] text-[10px] text-[#fff0a8]">0{index + 1}</span><p className="pt-1 text-sm leading-7 text-[#d5e0f3]">{suggestion}</p></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="CAMPAIGN STATUS" title="冒險節奏" action={<BarChart3 className="text-[#f4c659]" />} /><div className="space-y-5 p-5"><div className="border-2 border-[#526896] bg-[#17243f] p-4"><div className="flex justify-between gap-3"><p className="font-extrabold text-[#fff8df]">畢業主線完成度</p><p className="font-black text-[#f4c659]">{completion}%</p></div><div className="mt-3"><ProgressBar value={completion} /></div><p className="mt-3 text-xs leading-5 text-[#a8bad8]">尚有 {recommendations.remainingCredits} 學分；分配至 {goals.semestersLeft} 個學期可維持穩定節奏。</p></div><div className="border-2 border-[#526896] bg-[#17243f] p-4"><p className="font-extrabold text-[#fff8df]">戰術提醒</p><p className="mt-2 text-sm leading-7 text-[#b7c7e3]">排課時先鎖定必修與有先修門檻的課程，再用通識或選修平衡每週負荷。每學期替作品集留下一個能完成、能展示的任務。</p></div><p className="border-l-4 border-[#aa97ff] pl-3 text-xs leading-6 text-[#c8bfff]">本頁推薦使用目前的 GPA、已修學分、分類缺口與剩餘學期即時計算；它不會替你讀取或傳送外部資料。</p></div></Panel></div></div>;
}

function CareerQuestView({ recommendations, careerPath, onCareerPathChange, goals, gpa, credits, completedProjects }: { recommendations: ReturnType<typeof buildCareerRecommendations>; careerPath: CareerPath; onCareerPathChange: (path: CareerPath) => void; goals: GraduationGoals; gpa: number; credits: ReturnType<typeof calculateCredits>; completedProjects: number }) {
  const completion = goals.total ? Math.round((credits.total / goals.total) * 100) : 0;
  return <div className="space-y-4 animate-pop-in">
    <Panel gold className="overflow-hidden"><div className="p-5 sm:p-7"><p className="pixel-font text-[9px] leading-6 text-[#a28cff]">CAREER COMPASS ENGINE</p><div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-2xl font-black text-[#fff8df]">以職涯目標校正下一步</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-[#d6e0f1]">系統會對照已修課程、先修條件、能力缺口、選修學分進度與專題標籤，分出現在可修與仍待解鎖的任務。</p></div><div className="border-2 border-[#a998ff] bg-[#30285f] px-4 py-3"><p className="text-xs font-bold text-[#cfc4ff]">{recommendations.profile.title} 就緒度</p><p className="mt-1 text-2xl font-black text-[#fff0a8]">{recommendations.readiness}%</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{careerProfiles.map(profile => <button key={profile.id} onClick={() => onCareerPathChange(profile.id)} className={`pixel-corners border-2 px-3 py-3 text-left transition-colors ${careerPath === profile.id ? "border-[#f4c659] bg-[#5b4b26] text-[#fff2b0] shadow-[3px_3px_0_#080d1f]" : "border-[#586e99] bg-[#1d2d4c] text-[#c9d8f2] hover:bg-[#2b4165]"}`}><span className="text-sm font-black">{profile.shortTitle}</span><span className="mt-1 block text-xs leading-5 opacity-80">{profile.description}</span></button>)}</div></div></Panel>
    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="UNLOCKED COURSE QUESTS" title="現在可修的關鍵課程" action={<BookOpen className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#40557c] px-5">{recommendations.recommendedCourses.map((course, index) => <div key={course.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="pixel-font flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#74e2b1] bg-[#1f4d47] text-[10px] text-[#c9ffde]">0{index + 1}</span><div><p className="font-black text-[#fff8df]">{course.name}</p><p className="mt-1 text-xs leading-5 text-[#afc0dd]">{course.description}</p></div></div><span className="border-2 border-[#f4c659] bg-[#514323] px-2 py-1 text-xs font-black text-[#ffe797]">適配 {course.careerFit[careerPath]}%</span></div><div className="mt-3 flex flex-wrap gap-2 pl-12">{course.skills.map(skill => <span key={skill} className="border border-[#5e739c] bg-[#24375a] px-2 py-1 text-xs font-bold text-[#d6e5ff]">{skill}</span>)}<span className="border border-[#6ee1af] bg-[#1e4d46] px-2 py-1 text-xs font-black text-[#bdf8d7]">可立即修習</span></div></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="ABILITY GAP" title="能力缺口與專題任務" action={<WandSparkles className="text-[#f4c659]" />} /><div className="p-5"><div className="border-2 border-[#536994] bg-[#172640] p-4"><p className="text-xs font-bold text-[#aebfdf]">優先補強能力</p><div className="mt-3 flex flex-wrap gap-2">{recommendations.skillGaps.length ? recommendations.skillGaps.map(skill => <span key={skill} className="border-2 border-[#aa97ff] bg-[#40376f] px-2 py-1 text-xs font-black text-[#ded6ff]">{skill}</span>) : <span className="text-sm font-bold text-[#9af0c3]">核心能力已完整，適合挑戰整合型專題。</span>}</div></div><div className="mt-4 border-2 border-[#f4c659] bg-[#3f3521] p-4"><p className="pixel-font text-[8px] leading-5 text-[#f4c659]">PORTFOLIO SIDE QUEST</p><h3 className="mt-2 font-black text-[#fff8df]">{recommendations.projectSuggestion.title}</h3><p className="mt-2 text-sm leading-7 text-[#d3dfef]">{recommendations.projectSuggestion.description}</p><p className="mt-3 border-l-4 border-[#a998ff] pl-3 text-xs leading-6 text-[#d7ccff]">{recommendations.projectSuggestion.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{recommendations.projectSuggestion.skills.map(skill => <span key={skill} className="border border-[#f4c659] px-2 py-1 text-xs font-black text-[#ffe797]">#{skill}</span>)}</div></div></div></Panel></div>
    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]"><Panel className="overflow-hidden"><PanelTitle eyebrow="PREREQUISITE GATES" title="待解鎖的進階課程" action={<Target className="text-[#f4c659]" />} /><div className="divide-y-2 divide-[#40557c] px-5">{recommendations.lockedCourses.map(course => <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-black text-[#d7e2f6]">{course.name}</p><p className="mt-1 text-xs leading-5 text-[#9eb1d0]">尚缺先修：{course.missingPrerequisites.join("、")}</p></div><span className="inline-flex items-center gap-1 border-2 border-[#677996] bg-[#243451] px-2 py-1 text-xs font-black text-[#c4d2e9]"><CircleHelp size={14} /> 先修未完成</span></div>)}</div></Panel><Panel className="overflow-hidden"><PanelTitle eyebrow="CAMPAIGN STATUS" title="本學期戰術摘要" action={<BarChart3 className="text-[#f4c659]" />} /><div className="space-y-4 p-5"><SmallMetric label="目前 GPA" value={gpa.toFixed(2)} /><SmallMetric label="畢業主線" value={`${completion}%`} /><SmallMetric label="建議學分節奏" value={`${recommendations.suggestedCredits} 學分／學期`} /><div className="border-l-4 border-[#74e2b1] bg-[#183d3a] p-3 text-xs leading-6 text-[#c5f5dc]">{recommendations.goal}</div><p className="text-xs leading-6 text-[#aebfdd]">已完成專題 {completedProjects} 項；將上方建議專題加入工坊，可持續追蹤作品集成長。</p></div></Panel></div>
  </div>;
}

function ProjectsView({ projects, projectForm, editingProjectId, setProjectForm, onOpen, onSave, onCancel, onDelete }: { projects: ProjectRecord[]; projectForm: Omit<ProjectRecord, "id"> | null; editingProjectId: string | null; setProjectForm: React.Dispatch<React.SetStateAction<Omit<ProjectRecord, "id"> | null>>; onOpen: (project?: ProjectRecord) => void; onSave: () => void; onCancel: () => void; onDelete: (id: string) => void }) {
  return <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_400px] animate-pop-in"><Panel className="overflow-hidden"><PanelTitle eyebrow="PROJECT WORKSHOP" title="專題工坊" action={<PixelButton onClick={() => onOpen()} className="bg-[#f4c659] text-[#152544]"><Plus size={17} /> 新增專題</PixelButton>} /><div className="p-5">{projects.length === 0 ? <EmptyState icon={<FolderKanban />} title="工坊尚未開張" detail="新增第一個專題，將構想與成果變成冒險紀錄。" action={() => onOpen()} /> : <div className="grid gap-4 md:grid-cols-2">{[...projects].sort((a,b) => b.startDate.localeCompare(a.startDate)).map(project => <article key={project.id} className="border-3 border-[#536994] bg-[#172640] shadow-[3px_3px_0_#080d1f]"><div className="flex items-start justify-between gap-3 border-b-2 border-[#435a82] p-4"><div><span className={`inline-flex px-2 py-1 text-xs font-black text-white ${statusTone[project.status]}`}>{statusLabel[project.status]}</span><h3 className="mt-3 text-lg font-black text-[#fff8df]">{project.name}</h3></div><div className="flex gap-1"><button onClick={() => onOpen(project)} className="p-1.5 text-[#b9c9e6] hover:text-[#f4c659]" aria-label={`編輯 ${project.name}`}><Pencil size={16} /></button><button onClick={() => window.confirm(`確定刪除「${project.name}」嗎？`) && onDelete(project.id)} className="p-1.5 text-[#b9c9e6] hover:text-[#f28682]" aria-label={`刪除 ${project.name}`}><Trash2 size={16} /></button></div></div><div className="p-4"><p className="min-h-14 text-sm leading-7 text-[#c0d0e9]">{project.description || "尚未填寫專題描述。"}</p><div className="mt-4 flex flex-wrap gap-2">{project.tags.length ? project.tags.map(tag => <span key={tag} className="border border-[#63799f] bg-[#263a5d] px-2 py-1 text-xs font-bold text-[#cde0ff]">#{tag}</span>) : <span className="text-xs text-[#91a5c7]">尚未設定技術標籤</span>}</div><p className="mt-4 border-t-2 border-[#3e557d] pt-3 text-xs font-bold text-[#a9bad8]">{project.startDate || "未設定"} <span className="mx-1 text-[#f4c659]">→</span> {project.endDate || "未設定"}</p></div></article>)}</div>}</div></Panel><ProjectEditor form={projectForm} editing={Boolean(editingProjectId)} setForm={setProjectForm} onSave={onSave} onCancel={onCancel} /></div>;
}

function ProjectEditor({ form, editing, setForm, onSave, onCancel }: { form: Omit<ProjectRecord, "id"> | null; editing: boolean; setForm: React.Dispatch<React.SetStateAction<Omit<ProjectRecord, "id"> | null>>; onSave: () => void; onCancel: () => void }) {
  return <Panel className="h-fit overflow-hidden 2xl:sticky 2xl:top-5"><PanelTitle eyebrow="PROJECT EDITOR" title={form ? editing ? "編輯專題" : "新增專題" : "工坊準備中"} action={<FolderKanban className="text-[#f4c659]" />} /><div className="p-5">{!form ? <EmptyState icon={<Plus />} title="建立一個任務" detail="把課堂作品、競賽、研究或社團專案記錄下來。" /> : <div className="space-y-4"><Field label="專題名稱"><input value={form.name} onChange={event => setForm(current => current && { ...current, name: event.target.value })} placeholder="例如：畢業專題名稱" className="pixel-input w-full px-3 py-2.5" /></Field><Field label="專題描述"><textarea value={form.description} onChange={event => setForm(current => current && { ...current, description: event.target.value })} placeholder="說明目標、角色與成果…" rows={3} className="pixel-input w-full resize-y px-3 py-2.5" /></Field><Field label="技術標籤"><input value={form.tags.join(", ")} onChange={event => setForm(current => current && { ...current, tags: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })} placeholder="React, Figma, Python" className="pixel-input w-full px-3 py-2.5" /><p className="mt-1.5 text-[11px] text-[#91a5c8]">以半形逗號分隔。</p></Field><div className="grid grid-cols-2 gap-3"><Field label="開始月份"><input type="month" value={form.startDate} onChange={event => setForm(current => current && { ...current, startDate: event.target.value })} className="pixel-input w-full px-2 py-2.5" /></Field><Field label="結束月份"><input type="month" value={form.endDate} onChange={event => setForm(current => current && { ...current, endDate: event.target.value })} className="pixel-input w-full px-2 py-2.5" /></Field></div><Field label="完成狀態"><select value={form.status} onChange={event => setForm(current => current && { ...current, status: event.target.value as ProjectStatus })} className="pixel-input w-full px-3 py-2.5">{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><div className="flex gap-3 pt-2"><PixelButton onClick={onSave} disabled={!form.name.trim()} className="flex-1 bg-[#f4c659] text-[#162442]"><ShieldCheck size={16} /> 儲存專題</PixelButton><PixelButton onClick={onCancel} className="bg-[#33486c]"><X size={16} /></PixelButton></div></div>}</div></Panel>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c8d6ed]">{label}</span>{children}</label>; }

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
