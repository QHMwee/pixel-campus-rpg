import { z } from "zod";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { adminProcedure, router } from "../_core/trpc";

const sectionSchema = z.enum(["dashboard", "grades", "credits", "quest", "projects", "badges"]);

const snapshotSchema = z.object({
  gpa: z.number().min(0).max(4.3),
  gpaSystem: z.enum(["4.0", "4.3"]),
  totalCredits: z.number().min(0),
  remainingCredits: z.number().min(0),
  semestersLeft: z.number().int().min(0),
  termTrend: z.array(z.object({ term: z.string().max(30), gpa: z.number().min(0).max(4.3) })).max(16),
  skills: z.array(z.string().max(60)).max(20),
  careerPath: z.string().max(50),
  preferences: z.object({ workload: z.string().max(30), category: z.string().max(30), projectStyle: z.string().max(30) }),
  courses: z.array(z.object({ name: z.string().max(100), term: z.string().max(30), credits: z.number().min(0).max(12), grade: z.string().max(8), category: z.string().max(20) })).max(60),
  projects: z.array(z.object({ name: z.string().max(100), status: z.string().max(30), tags: z.array(z.string().max(40)).max(10) })).max(30),
  unlockedAchievements: z.number().int().min(0),
}).strict();

const adviceSchema = z.object({
  title: z.string().min(1).max(70),
  overview: z.string().min(1).max(360),
  focus: z.string().min(1).max(140),
  actions: z.array(z.object({ label: z.string().min(1).max(80), reason: z.string().min(1).max(180), urgency: z.enum(["now", "next", "later"]) }).strict()).min(2).max(3),
  caution: z.string().min(1).max(180),
}).strict();

export type AiPlanningAdvice = z.infer<typeof adviceSchema>;

const sectionLabels: Record<z.infer<typeof sectionSchema>, string> = {
  dashboard: "冒險總覽與整體學業節奏",
  grades: "成績提升與下一次評量準備",
  credits: "畢業學分與課程類別進度",
  quest: "職涯路徑、先修條件與選課優先序",
  projects: "專題規劃、作品集與技能累積",
  badges: "成就里程碑與可執行的解鎖任務",
};

export function buildLocalPlanningFallback(section: z.infer<typeof sectionSchema>, snapshot: z.infer<typeof snapshotSchema>): AiPlanningAdvice {
  const safeSemesterCount = Math.max(1, snapshot.semestersLeft);
  const creditsPerSemester = Math.ceil(snapshot.remainingCredits / safeSemesterCount);
  const activeProjects = snapshot.projects.filter(project => project.status === "active").length;
  const highGpa = snapshot.gpa >= 3.5;
  const sectionAction = {
    dashboard: { label: "安排本週 30 分鐘學業檢視", reason: "把成績、學分與專題狀態集中檢查，可及早調整節奏。" },
    grades: { label: highGpa ? "維持高分課的複習節奏" : "鎖定一門弱項課安排補強", reason: highGpa ? "穩定輸出能維持累計 GPA 優勢。" : "優先處理影響 GPA 最大的課程，改善效率最高。" },
    credits: { label: `將下學期目標定為約 ${creditsPerSemester} 學分`, reason: "依剩餘畢業學分與剩餘學期平均分配，能降低最後學期壓力。" },
    quest: { label: `挑選一門符合「${snapshot.careerPath}」路徑的可修課`, reason: "先修條件與能力標籤同步累積，才能讓職涯方向形成連續成長。" },
    projects: { label: activeProjects ? "為進行中的專題設定本週可交付成果" : "定義下一個可展示的專題題目", reason: activeProjects ? "將專題拆成可驗收成果，能避免進度停滯。" : "可展示的專題能把課程能力轉化成作品集證據。" },
    badges: { label: "挑選一枚最接近的成就作為短期目標", reason: "把里程碑拆小，可讓升級進度更具體且容易追蹤。" },
  }[section];

  return {
    title: "本機策略備案",
    overview: `目前累計 GPA 為 ${snapshot.gpa.toFixed(2)}（${snapshot.gpaSystem} 制），已完成 ${snapshot.totalCredits} 學分，尚餘 ${snapshot.remainingCredits} 學分。AI 顧問暫時不可用時，仍可依現有資料持續推進。`,
    focus: `先以每學期約 ${creditsPerSemester} 學分的節奏規劃，並保留時間強化 ${snapshot.skills[0]?.split(" · ")[0] ?? "核心能力"}。`,
    actions: [
      { ...sectionAction, urgency: "now" },
      { label: "更新下一步任務", reason: "將建議寫入學期規劃或專題待辦，才能在下次檢視時比較進度。", urgency: "next" },
    ],
    caution: "這是依本機摘要產生的規劃提示；實際選課仍應確認系所規定、先修條件與開課資訊。",
  };
}

function extractText(content: string | Array<unknown>): string {
  if (typeof content === "string") return content;
  return content.map(item => typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : "").join("\n");
}

function clip(value: unknown, limit: number): string {
  return String(value ?? "").trim().slice(0, limit);
}

function normalizeAiAdvice(raw: unknown): AiPlanningAdvice {
  const candidate = raw as { title?: unknown; overview?: unknown; focus?: unknown; actions?: unknown; caution?: unknown };
  const actions = Array.isArray(candidate.actions) ? candidate.actions.slice(0, 3).map(action => {
    const entry = action as { label?: unknown; reason?: unknown; urgency?: unknown };
    return {
      label: clip(entry.label, 80),
      reason: clip(entry.reason, 180),
      urgency: entry.urgency === "now" || entry.urgency === "later" ? entry.urgency : "next",
    };
  }) : [];

  return adviceSchema.parse({
    title: clip(candidate.title, 70),
    overview: clip(candidate.overview, 360),
    focus: clip(candidate.focus, 140),
    actions,
    caution: clip(candidate.caution, 180),
  });
}

export const aiPlannerRouter = router({
  generate: adminProcedure.input(z.object({ section: sectionSchema, snapshot: snapshotSchema })).mutation(async ({ input }) => {
    const fallback = buildLocalPlanningFallback(input.section, input.snapshot);
    try {
      const models = await listLLMModels();
      const model = models.data.some(item => item.id === "gpt-5-mini") ? "gpt-5-mini" : undefined;
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "你是 Campus Quest 的學業規劃顧問。只可根據使用者提供的摘要提出可執行、謹慎且不誇大的建議。不得虛構學校規定、課程開設、先修條件或外部事實。使用繁體中文，不要做醫療、法律、財務或保證性承諾。" },
          { role: "user", content: `請針對「${sectionLabels[input.section]}」提出個人化規劃建議。資料摘要如下：\n${JSON.stringify(input.snapshot)}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "campus_quest_planning_advice",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                overview: { type: "string" },
                focus: { type: "string" },
                actions: { type: "array", items: { type: "object", properties: { label: { type: "string" }, reason: { type: "string" }, urgency: { type: "string", enum: ["now", "next", "later"] } }, required: ["label", "reason", "urgency"], additionalProperties: false } },
                caution: { type: "string" },
              },
              required: ["title", "overview", "focus", "actions", "caution"],
              additionalProperties: false,
            },
          },
        },
      });
      return { advice: normalizeAiAdvice(JSON.parse(extractText(response.choices[0]?.message.content ?? ""))), source: "ai" as const };
    } catch (error) {
      console.warn("[AI Planner] Falling back to local guidance:", error instanceof Error ? error.message : error);
      return { advice: fallback, source: "local" as const };
    }
  }),
});
