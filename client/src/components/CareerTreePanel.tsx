import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Lock, Sparkles, Target } from "lucide-react";
import type { CourseRecord } from "@shared/academic";
import type { AchievementRecord } from "@shared/achievementRecords";
import {
  evaluateCareerTree,
  getCareerTracksByDomain,
  rankCareerTracks,
  skillNodeStateLabel,
  type CareerTrackId,
  type EvaluatedSkillNode,
  type SkillNodeState,
} from "@shared/careerTree";

type CareerTreePanelProps = {
  courses: CourseRecord[];
  achievements: AchievementRecord[];
  plannedCourseNames: string[];
  trackId: CareerTrackId;
  onTrackChange: (id: CareerTrackId) => void;
};

const stateTone: Record<SkillNodeState, string> = {
  unlocked: "border-[#f4c659] bg-[#4a3d1e] text-[#ffe797] shadow-[3px_3px_0_#080d1f]",
  "in-progress": "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]",
  available: "border-[#8ec6ff] bg-[#1e3458] text-[#d3e2ff]",
  locked: "border-[#4a5877] bg-[#151d33] text-[#78859f]",
};

const stateIcon: Record<SkillNodeState, typeof Lock> = {
  unlocked: CheckCircle2,
  "in-progress": Sparkles,
  available: CircleDashed,
  locked: Lock,
};

function SkillNodeCard({ node }: { node: EvaluatedSkillNode }) {
  const [open, setOpen] = useState(false);
  const Icon = stateIcon[node.state];
  return (
    <article className={`border-2 p-3 transition-transform ${stateTone[node.state]} ${node.state === "unlocked" ? "animate-pop-in" : ""}`}>
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-start gap-2 text-left">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <span className="flex-1">
          <span className="block text-sm font-black">{node.name}</span>
          <span className="mt-1 block text-[11px] leading-5 opacity-80">{node.summary}</span>
        </span>
        <span className="pixel-font shrink-0 text-[7px] leading-4 opacity-70">{skillNodeStateLabel[node.state]}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-current/30 pt-3 text-[11px] leading-5">
          {node.state === "locked" && (
            <p>需先點亮：{node.missingPrerequisites.join("、")}</p>
          )}
          {node.matchedCourses.length > 0 && (
            <p>已修：{node.matchedCourses.join("、")}</p>
          )}
          {node.plannedCourses.length > 0 && (
            <p>已列入規劃：{node.plannedCourses.join("、")}（修完並及格才會點亮）</p>
          )}
          {node.matchedCertifications.length > 0 && (
            <p>已取得證照：{node.matchedCertifications.join("、")}</p>
          )}
          {node.state !== "unlocked" && (
            <>
              <p>
                可修課程：{node.courses.join("、")}
                {node.requiredCourseCount > 1 ? `（需 ${node.requiredCourseCount} 門，還差 ${node.remainingCourseCount} 門）` : ""}
              </p>
              {node.certifications.length > 0 && (
                <p>或取得證照：{node.certifications.join("、")}</p>
              )}
            </>
          )}
          <p className="opacity-70">點亮可得 {node.xp} XP</p>
        </div>
      )}
    </article>
  );
}

export function CareerTreePanel({ courses, achievements, plannedCourseNames, trackId, onTrackChange }: CareerTreePanelProps) {
  const input = useMemo(
    () => ({ courses, achievements, plannedCourseNames }),
    [courses, achievements, plannedCourseNames]
  );
  const tree = useMemo(() => evaluateCareerTree(trackId, input), [trackId, input]);
  const ranking = useMemo(() => rankCareerTracks(input).slice(0, 3), [input]);
  const domains = useMemo(() => getCareerTracksByDomain(), []);

  return (
    <section className="pixel-panel-gold animate-pop-in overflow-hidden bg-[#1a2642]">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#5d719b] px-5 py-4">
        <div>
          <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">CAREER SKILL TREE</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-wide text-[#fff8df]">職涯技能樹</h2>
        </div>
        <Target className="text-[#f4c659]" />
      </div>

      <div className="space-y-5 p-5">
        <div className="border-l-4 border-[#74e2b1] bg-[#173c3a] px-4 py-3 text-sm leading-7 text-[#d6f7e6]">
          技能只會被「已修過且及格的課程」或「已取得的證照」點亮；規劃中的課程只顯示為進行中，不會提前算入能力。
          職涯分類參考公開職務資料整理，實際職缺條件仍依公司與地區而異。
        </div>

        {/* 路線選擇 */}
        <div className="space-y-3">
          {domains.map(group => (
            <div key={group.domain}>
              <p className="pixel-font text-[8px] leading-5 text-[#8ec6ff]">{group.domain}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.tracks.map(track => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => onTrackChange(track.id)}
                    className={`border-2 px-3 py-1.5 text-xs font-black transition-colors ${
                      track.id === trackId
                        ? "border-[#f4c659] bg-[#4f4222] text-[#ffe796]"
                        : "border-[#526995] bg-[#172640] text-[#c4d3e8] hover:border-[#8ec6ff]"
                    }`}
                  >
                    {track.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 目前路線摘要 */}
        <div className="border-2 border-[#526995] bg-[#172640] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-black text-[#fff8df]">{tree.track.title}</h3>
            <span className="text-xs font-black text-[#f4c659]">核心完成度 {tree.progress}%</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#c4d3e8]">{tree.track.description}</p>
          <div className="pixel-progress mt-3">
            <span style={{ width: `${tree.progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            <span className="border-2 border-[#f4c659] bg-[#4f4222] px-3 py-1.5 text-[#ffe796]">已點亮 {tree.unlockedCount}/{tree.totalCount}</span>
            <span className="border-2 border-[#aa97ff] bg-[#443a78] px-3 py-1.5 text-[#ded6ff]">技能 XP {tree.earnedXp}/{tree.totalXp}</span>
            <a
              className="border-2 border-[#74e2b1] bg-[#1f4d47] px-3 py-1.5 text-[#c5f8dd] underline underline-offset-4"
              href={tree.track.evidence.url}
              target="_blank"
              rel="noreferrer"
            >
              {tree.track.evidence.label}
            </a>
          </div>
        </div>

        {/* 下一步 */}
        {tree.nextNodes.length > 0 && (
          <div>
            <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">NEXT UNLOCKS</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {tree.nextNodes.map(item => (
                <div key={item.id} className="border-2 border-[#66558f] bg-[#1e2549] p-3">
                  <p className="text-sm font-black text-[#fff8df]">{item.name}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#c9d5ed]">
                    修 {item.courses.slice(0, 2).join(" 或 ")}
                    {item.certifications.length ? `，或考取 ${item.certifications[0]}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 技能樹本體 */}
        <div className="space-y-4">
          {tree.tiers.map(group => (
            <div key={group.tier}>
              <div className="flex items-center gap-3">
                <span className="pixel-font border-2 border-[#5f739c] bg-[#24385b] px-2 py-1 text-[8px] text-[#d8e7ff]">
                  TIER {group.tier}· {group.label}
                </span>
                <span className="h-0.5 flex-1 bg-[#42557d]" />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.nodes.map(item => (
                  <SkillNodeCard key={item.id} node={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 最相符的路線 */}
        <div className="border-2 border-[#526995] bg-[#172640] p-4">
          <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">BEST MATCHING TRACKS</p>
          <p className="mt-1 text-xs leading-5 text-[#a9b8d2]">依你目前的成績與證照，這幾條路線的核心技能點得最滿。</p>
          <div className="mt-3 space-y-2">
            {ranking.map(item => (
              <button
                key={item.track.id}
                type="button"
                onClick={() => onTrackChange(item.track.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="w-28 shrink-0 text-xs font-black text-[#fff8df]">{item.track.title}</span>
                <span className="pixel-progress flex-1">
                  <span style={{ width: `${item.progress}%` }} />
                </span>
                <span className="w-16 shrink-0 text-right text-xs font-black text-[#f4c659]">
                  {item.unlockedCount}/{item.totalCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CareerTreePanel;
