import { useMemo, useState } from "react";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";
import type { CourseRecord, GradePointSystem, LetterGrade } from "@shared/academic";
import { gradeOptions } from "@shared/academic";
import {
  creditsNeededAtGrade,
  simulateGradeChanges,
  solveTargetGpa,
  summarizeGpa,
} from "@shared/gpaSimulator";

type GpaSimulatorPanelProps = {
  courses: CourseRecord[];
  system: GradePointSystem;
};

const outcomeTone: Record<string, string> = {
  reachable: "border-[#74e2b1] bg-[#173c3a] text-[#d6f7e6]",
  "already-met": "border-[#f4c659] bg-[#3d3218] text-[#ffe9b0]",
  impossible: "border-[#ff9d9d] bg-[#43222a] text-[#ffd4d4]",
  "no-credits": "border-[#8ec6ff] bg-[#1e3458] text-[#d3e2ff]",
};

export function GpaSimulatorPanel({ courses, system }: GpaSimulatorPanelProps) {
  const [targetInput, setTargetInput] = useState("3.5");
  const [creditsInput, setCreditsInput] = useState("18");
  const [whatIfId, setWhatIfId] = useState<string>("");
  const [whatIfGrade, setWhatIfGrade] = useState<LetterGrade>("A");

  const snapshot = useMemo(() => summarizeGpa(courses, system), [courses, system]);

  const target = Number(targetInput);
  const plannedCredits = Number(creditsInput);
  const inputsValid = Number.isFinite(target) && target > 0 && Number.isFinite(plannedCredits) && plannedCredits >= 0;

  const result = useMemo(
    () => (inputsValid ? solveTargetGpa(snapshot, plannedCredits, target, system) : null),
    [snapshot, plannedCredits, target, system, inputsValid]
  );

  const creditsAtA = useMemo(
    () => (inputsValid ? creditsNeededAtGrade(snapshot, "A", target, system) : null),
    [snapshot, target, system, inputsValid]
  );

  const whatIf = useMemo(
    () => (whatIfId ? simulateGradeChanges(courses, [{ courseId: whatIfId, grade: whatIfGrade }], system) : null),
    [courses, whatIfId, whatIfGrade, system]
  );

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => b.term.localeCompare(a.term, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant")),
    [courses]
  );

  return (
    <section className="pixel-panel-gold animate-pop-in overflow-hidden bg-[#1a2642]">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#5d719b] px-5 py-4">
        <div>
          <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">GPA TARGET SOLVER</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-wide text-[#fff8df]">GPA 目標模擬器</h2>
        </div>
        <Calculator className="text-[#f4c659]" />
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="目前累計 GPA" value={snapshot.gpa.toFixed(2)} tone="gold" />
          <Stat label="已採計學分" value={`${snapshot.credits}`} tone="blue" />
          <Stat label="加權總積分" value={snapshot.points.toFixed(1)} tone="purple" />
        </div>

        {courses.length === 0 && (
          <p className="border-l-4 border-[#8ec6ff] bg-[#1e3458] px-4 py-3 text-sm leading-6 text-[#d3e2ff]">
            還沒有成績資料。到「成績卷軸」新增課程，或匯入備份後再回來試算。
          </p>
        )}

        {/* 反推 */}
        <div className="border-2 border-[#526995] bg-[#172640] p-4">
          <p className="pixel-font text-[8px] leading-5 text-[#8ec6ff]">還要考多好</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Field label="目標累計 GPA" value={targetInput} onChange={setTargetInput} step="0.05" />
            <Field label="未來學分數" value={creditsInput} onChange={setCreditsInput} step="1" />
          </div>

          {!inputsValid && <p className="mt-3 text-sm text-[#ffb4b4]">請輸入有效的目標與學分數。</p>}

          {result && (
            <div className={`mt-4 border-l-4 px-4 py-3 text-sm leading-6 ${outcomeTone[result.outcome]}`}>
              {result.outcome === "reachable" && (
                <>
                  接下來 {plannedCredits} 學分平均要達到 <strong>{result.requiredAveragePoint.toFixed(2)}</strong> 積分
                  {result.suggestedGrade && <>，也就是整體維持在 <strong>{result.suggestedGrade}</strong> 以上。</>}
                </>
              )}
              {result.outcome === "already-met" && <>就算接下來全部拿最低分，累計 GPA 仍會維持在 {target.toFixed(2)} 以上。</>}
              {result.outcome === "impossible" && (
                <>
                  以 {plannedCredits} 學分無法達到 {target.toFixed(2)}。全部拿最高等第也只到{" "}
                  <strong>{result.bestPossibleGpa.toFixed(2)}</strong>，需要更多學分或調低目標。
                </>
              )}
              {result.outcome === "no-credits" && <>未來學分為 0，累計 GPA 不會改變。請填入預計修習的學分數。</>}
            </div>
          )}

          {result && result.outcome !== "no-credits" && plannedCredits > 0 && (
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <Range label="全部拿最高等第" value={result.bestPossibleGpa} icon="up" />
              <Range label="全部拿最低等第" value={result.worstPossibleGpa} icon="down" />
            </div>
          )}

          {creditsAtA !== null && creditsAtA > 0 && (
            <p className="mt-3 text-xs leading-5 text-[#a9b8d2]">
              換個角度：若後續課程全部拿 A，還需要約 <strong className="text-[#f4c659]">{creditsAtA}</strong> 學分才能把累計 GPA 拉到 {target.toFixed(2)}。
            </p>
          )}
        </div>

        {/* 試算 */}
        {courses.length > 0 && (
          <div className="border-2 border-[#526995] bg-[#172640] p-4">
            <p className="pixel-font text-[8px] leading-5 text-[#8ec6ff]">如果這門課成績不一樣</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[200px]">
                <span className="block text-xs font-bold text-[#b8c9ed]">選一門課</span>
                <select
                  value={whatIfId}
                  onChange={event => setWhatIfId(event.target.value)}
                  className="mt-1 w-full border-2 border-[#526995] bg-[#101a30] px-3 py-2 text-sm text-[#fff8df]"
                >
                  <option value="">（不試算）</option>
                  {sortedCourses.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.term}｜{item.name}（{item.grade}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-xs font-bold text-[#b8c9ed]">改成</span>
                <select
                  value={whatIfGrade}
                  onChange={event => setWhatIfGrade(event.target.value as LetterGrade)}
                  className="mt-1 border-2 border-[#526995] bg-[#101a30] px-3 py-2 text-sm text-[#fff8df]"
                >
                  {gradeOptions.map(grade => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {whatIf && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-l-4 border-[#aa97ff] bg-[#2c2554] px-4 py-3">
                <span className="text-sm text-[#ded6ff]">累計 GPA 會變成</span>
                <span className="text-xl font-black text-[#fff0a8]">{whatIf.gpa.toFixed(2)}</span>
                <span className={`text-sm font-black ${whatIf.delta >= 0 ? "text-[#74e2b1]" : "text-[#ff9d9d]"}`}>
                  {whatIf.delta >= 0 ? "+" : ""}
                  {whatIf.delta.toFixed(2)}
                </span>
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-[#8a9ab8]">試算不會修改你的成績紀錄。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "gold" | "blue" | "purple" }) {
  const tones = {
    gold: "border-[#f4c659] bg-[#4f4222] text-[#ffe796]",
    blue: "border-[#8ec6ff] bg-[#1e3458] text-[#d3e2ff]",
    purple: "border-[#aa97ff] bg-[#3a3168] text-[#ded6ff]",
  };
  return (
    <div className={`border-2 px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-bold opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step: string }) {
  return (
    <label>
      <span className="block text-xs font-bold text-[#b8c9ed]">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-32 border-2 border-[#526995] bg-[#101a30] px-3 py-2 text-sm font-black text-[#fff8df]"
      />
    </label>
  );
}

function Range({ label, value, icon }: { label: string; value: number; icon: "up" | "down" }) {
  const Icon = icon === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-2 border-2 border-[#40557c] bg-[#101a30] px-3 py-2">
      <Icon size={14} className={icon === "up" ? "text-[#74e2b1]" : "text-[#ff9d9d]"} />
      <span className="text-[#a9b8d2]">{label}</span>
      <span className="ml-auto font-black text-[#fff8df]">{value.toFixed(2)}</span>
    </div>
  );
}

export default GpaSimulatorPanel;
