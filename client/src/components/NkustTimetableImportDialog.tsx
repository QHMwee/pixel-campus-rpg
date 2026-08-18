import { Download, FileSpreadsheet, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourseCategory, NkustPlannedCourseDraft, NkustTimetableImportPreview } from "@shared/academic";

const categoryLabel: Record<CourseCategory, string> = { required: "電通系必修", elective: "專業選修", common: "校內共同必修", general: "通識", "undeclared-required": "不分系必修" };
const priorityLabel: Record<NkustPlannedCourseDraft["priority"], string> = { must: "一定要修", important: "很想安排", explore: "還在考慮" };

type NkustTimetableImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  preview: NkustTimetableImportPreview | null;
  draft: NkustPlannedCourseDraft[];
  onTextChange: (text: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onDraftChange: (index: number, patch: Partial<NkustPlannedCourseDraft>) => void;
  onDraftDelete: (index: number) => void;
  onPreview: () => void;
  onConfirm: () => void;
};

function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`pixel-button pixel-corners inline-flex items-center justify-center gap-2 bg-[#31496f] px-4 py-2 text-sm font-bold text-[#fff8df] ${className}`} {...props}>{children}</button>;
}

export function NkustTimetableImportDialog(props: NkustTimetableImportDialogProps) {
  const { open, onOpenChange, text, preview, draft, onTextChange, onFileChange, onDownloadTemplate, onDraftChange, onDraftDelete, onPreview, onConfirm } = props;
  const canConfirm = Boolean(preview?.toImport.length);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-4 border-[#74e2b1] bg-[#172640] p-0 text-[#e8f0ff] shadow-[7px_7px_0_#080d1f]">
      <DialogHeader className="border-b-2 border-[#5b719c] px-5 pb-4 pt-5 text-left">
        <p className="pixel-font text-[8px] leading-5 text-[#74e2b1]">NKUST TIMETABLE IMPORT</p>
        <DialogTitle className="text-2xl font-black text-[#fff8df]">匯入高科大課表 CSV</DialogTitle>
        <DialogDescription className="mt-1 max-w-3xl text-sm leading-6 text-[#b8c9e6]">上傳自行從高科大課程資料查詢整理的 CSV／TSV，或使用本站空白範本。系統只建立「規劃中」課程；你可逐列校對、修改或刪除，按確認前不會寫入本機資料。</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c8d6ed]">貼上高科大課表 CSV／TSV</span><textarea value={text} onChange={event => onTextChange(event.target.value)} rows={9} placeholder="學年學期,課號,科目名稱,學分,課程類別,校區,授課教師,星期,節次,教室" className="pixel-input min-h-48 w-full resize-y px-3 py-3 font-mono text-xs leading-6" /></label>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-[#74aeb0] bg-[#132d38] p-4"><p className="font-black text-[#fff8df]">上傳 CSV／TSV 文字檔</p><p className="mt-2 text-xs leading-5 text-[#b7d9df]">支援 .csv、.tsv、.txt，最大 500 KB。請自行從校務查詢結果整理或另存為 UTF-8 CSV。</p><label className="pixel-button pixel-corners mt-4 inline-flex cursor-pointer items-center gap-2 bg-[#245d58] px-4 py-2 text-sm font-bold text-[#e1fff6]"><Upload size={16} /> 選擇課表檔<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" onChange={onFileChange} className="sr-only" /></label></div>
            <div className="border-2 border-dashed border-[#637aa4] bg-[#13213b] p-4"><p className="font-black text-[#fff8df]">先下載空白範本</p><p className="mt-2 text-xs leading-5 text-[#a9bbda]">範本只有高科大可對應的欄位標題，沒有任何示範課程或個人資料。</p><Button onClick={onDownloadTemplate} className="mt-4 bg-[#31496f]"><Download size={16} /> 下載 NKUST CSV 範本</Button></div>
            <div className="border-l-4 border-[#f4c659] pl-3 text-xs leading-5 text-[#f6e0a3]"><p className="font-black">資料保護規則</p><p className="mt-1">學號、姓名、成績、缺曠與選課流水號不會對應或保存。匯入只影響規劃中課程，不會變更 GPA、已完成學分、能力或 XP。</p></div>
          </div>
        </div>

        {preview && <div className="border-2 border-[#58709d] bg-[#13213b] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-[#fff8df]">可校對的課表草稿</p><p className="mt-1 text-xs text-[#aebfdb]">可新增 {preview.toImport.length} 門 · 略過重複 {preview.duplicates.length} 門 · 需修正 {preview.issues.length} 列</p></div><span className={`border-2 px-2 py-1 text-xs font-black ${preview.issues.length ? "border-[#ee817c] bg-[#4c2b35] text-[#ffd1cf]" : "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]"}`}>{preview.issues.length ? "需先修正" : "草稿已驗證"}</span></div>{draft.length > 0 && <><p className="mt-4 border-l-4 border-[#f4c659] bg-[#3e3421] px-3 py-2 text-xs leading-5 text-[#ffe9a4]">學期會自動整理為「115-1」格式。修改學期、名稱、學分、類別或優先程度後，系統會立即重新檢查有效性與重複課程。</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[840px] text-left text-xs"><thead className="text-[#aebfdb]"><tr><th className="pb-2">學期</th><th className="pb-2">課程</th><th className="pb-2 text-center">學分</th><th className="pb-2">類別</th><th className="pb-2">優先程度</th><th className="pb-2 text-right">操作</th></tr></thead><tbody>{draft.map((course, index) => <tr key={`nkust-draft-${index}`} className="border-t-2 border-[#334b73]"><td className="py-2 pr-2"><input aria-label={`高科大第 ${index + 1} 列學期`} value={course.term} onChange={event => onDraftChange(index, { term: event.target.value })} className="pixel-input w-24 px-2 py-1.5 text-xs" /></td><td className="py-2 pr-2"><input aria-label={`高科大第 ${index + 1} 列課程名稱`} value={course.name} onChange={event => onDraftChange(index, { name: event.target.value })} className="pixel-input w-52 px-2 py-1.5 text-xs" /></td><td className="py-2 pr-2 text-center"><input aria-label={`高科大第 ${index + 1} 列學分`} type="number" min="1" max="12" step="0.5" value={course.credits} onChange={event => onDraftChange(index, { credits: Number(event.target.value) })} className="pixel-input w-20 px-2 py-1.5 text-center text-xs" /></td><td className="py-2 pr-2"><select aria-label={`高科大第 ${index + 1} 列類別`} value={course.category} onChange={event => onDraftChange(index, { category: event.target.value as CourseCategory })} className="pixel-input w-24 px-2 py-1.5 text-xs">{Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-2 pr-2"><select aria-label={`高科大第 ${index + 1} 列優先程度`} value={course.priority} onChange={event => onDraftChange(index, { priority: event.target.value as NkustPlannedCourseDraft["priority"] })} className="pixel-input w-32 px-2 py-1.5 text-xs">{Object.entries(priorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-2 text-right"><button type="button" onClick={() => onDraftDelete(index)} className="p-2 text-[#b9c8e6] hover:text-[#f28682]" aria-label={`刪除高科大課表草稿：${course.name || `第 ${index + 1} 列`} `}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></>}{preview.duplicates.length > 0 && <p className="mt-3 text-xs leading-5 text-[#e7c984]">已略過重複：{preview.duplicates.map(course => `${course.term} ${course.name}`).join("、")}</p>}{preview.issues.length > 0 && <div className="mt-3 border-l-4 border-[#ee817c] bg-[#4c2b35] p-3 text-xs leading-5 text-[#ffd1cf]">{preview.issues.slice(0, 4).map(issue => <p key={`${issue.row}-${issue.message}`}>第 {issue.row || "—"} 列：{issue.message}</p>)}</div>}</div>}
      </div>
      <DialogFooter className="border-t-2 border-[#5b719c] px-5 py-4"><Button onClick={() => onOpenChange(false)} className="bg-[#33486c]"><X size={16} /> 取消</Button>{preview ? <Button onClick={onConfirm} disabled={!canConfirm} className="bg-[#74e2b1] text-[#132d29]"><ShieldCheck size={16} /> 確認匯入 {preview.toImport.length} 門</Button> : <Button onClick={onPreview} disabled={!text.trim()} className="bg-[#74e2b1] text-[#132d29]"><FileSpreadsheet size={16} /> 解析高科大課表</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
