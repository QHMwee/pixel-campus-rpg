import { FileText, ScrollText, ShieldCheck, Trash2, X } from "lucide-react";
import type { ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gradeOptions, type CourseCategory, type CourseRecord, type LetterGrade, type TranscriptImportPreview } from "@shared/academic";

const categoryLabel: Record<CourseCategory, string> = {
  required: "必修",
  elective: "選修",
  general: "通識",
};

type TranscriptImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  preview: TranscriptImportPreview | null;
  draft: Omit<CourseRecord, "id">[];
  onTextChange: (text: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPdfChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isPdfConverting: boolean;
  pdfNote: string | null;
  onDraftChange: (index: number, patch: Partial<Omit<CourseRecord, "id">>) => void;
  onDraftDelete: (index: number) => void;
  onPreview: () => void;
  onConfirm: () => void;
};

function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`pixel-button pixel-corners inline-flex items-center justify-center gap-2 bg-[#31496f] px-4 py-2 text-sm font-bold text-[#fff8df] ${className}`} {...props}>{children}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#c8d6ed]">{label}</span>{children}</label>;
}

export function TranscriptImportDialogV2(props: TranscriptImportDialogProps) {
  const { open, onOpenChange, text, preview, draft, onTextChange, onFileChange, onPdfChange, isPdfConverting, pdfNote, onDraftChange, onDraftDelete, onPreview, onConfirm } = props;
  const canConfirm = Boolean(preview?.toImport.length);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-4 border-[#f4c659] bg-[#172640] p-0 text-[#e8f0ff] shadow-[7px_7px_0_#080d1f]">
      <DialogHeader className="border-b-2 border-[#5b719c] px-5 pb-4 pt-5 text-left">
        <p className="pixel-font text-[8px] leading-5 text-[#f4c659]">TRANSCRIPT IMPORT TERMINAL</p>
        <DialogTitle className="text-2xl font-black text-[#fff8df]">匯入成績單</DialogTitle>
        <DialogDescription className="mt-1 max-w-3xl text-sm leading-6 text-[#b8c9e6]">貼上或上傳 CSV／TSV，或將文字型 PDF 交由 AI 轉為草稿。系統絕不自動寫入；你可以先逐列校對、修改或移除，再確認匯入。</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 p-5">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <Field label="貼上成績資料">
            <textarea value={text} onChange={event => onTextChange(event.target.value)} rows={9} placeholder={"學期,課程名稱,學分,成績,類別\n115-1,統計學,3,A,必修\n115-1,資料庫系統,3,88,選修"} className="pixel-input min-h-48 w-full resize-y px-3 py-3 font-mono text-xs leading-6" />
          </Field>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-[#637aa4] bg-[#13213b] p-4">
              <p className="font-black text-[#fff8df]">上傳 CSV／TSV 文字檔</p>
              <p className="mt-2 text-xs leading-5 text-[#a9bbda]">支援 .csv、.tsv、.txt，最大 500 KB。</p>
              <label className="pixel-button pixel-corners mt-4 inline-flex cursor-pointer items-center gap-2 bg-[#31496f] px-4 py-2 text-sm font-bold text-[#fff8df]"><ScrollText size={16} /> 選擇文字檔<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" onChange={onFileChange} className="sr-only" /></label>
            </div>
            <div className="border-2 border-dashed border-[#a998ff] bg-[#1b2446] p-4">
              <p className="font-black text-[#fff8df]">AI PDF → CSV 轉換</p>
              <p className="mt-2 text-xs leading-5 text-[#cfc7f5]">支援可選取文字的 PDF，最大 2 MB。轉換後仍須逐列確認，不保留原始檔。</p>
              <label className={`pixel-button pixel-corners mt-4 inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-bold ${isPdfConverting ? "cursor-wait bg-[#4c427b] text-[#ded6ff]" : "bg-[#5a48b9] text-[#fff8df]"}`}><FileText size={16} /> {isPdfConverting ? "AI 轉換中…" : "選擇 PDF 成績單"}<input type="file" accept=".pdf,application/pdf" disabled={isPdfConverting} onChange={onPdfChange} className="sr-only" /></label>
            </div>
            <div className="border-l-4 border-[#a998ff] pl-3 text-xs leading-5 text-[#d7ceff]"><p className="font-black">匯入安全規則</p><p className="mt-1">GPA 以有效嘗試學分加權；畢業學分、能力與 XP 僅計入及格課程。相同學期＋課程名稱會標示為重複，不覆蓋既有紀錄。</p></div>
          </div>
        </div>

        {pdfNote && <div className="border-2 border-[#9c8df1] bg-[#332e65] p-3 text-xs leading-5 text-[#e4dfff]"><b className="text-[#fff2ad]">PDF 轉換結果：</b>{pdfNote}</div>}

        {preview && <div className="border-2 border-[#58709d] bg-[#13213b] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-[#fff8df]">可校對的匯入草稿</p><p className="mt-1 text-xs text-[#aebfdb]">可新增 {preview.toImport.length} 筆 · 略過重複 {preview.duplicates.length} 筆 · 格式問題 {preview.issues.length} 列</p></div><span className={`border-2 px-2 py-1 text-xs font-black ${preview.issues.length ? "border-[#ee817c] bg-[#4c2b35] text-[#ffd1cf]" : "border-[#74e2b1] bg-[#1d4b44] text-[#c7f7dc]"}`}>{preview.issues.length ? "需先修正" : "草稿已驗證"}</span></div>
          {draft.length > 0 && <>
            <p className="mt-4 border-l-4 border-[#f4c659] bg-[#3e3421] px-3 py-2 text-xs leading-5 text-[#ffe9a4]">直接修改欄位會立即重新檢查成績、學分與重複資料；不需要的列可按右側垃圾桶移除。</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="text-[#aebfdb]"><tr><th className="pb-2">學期</th><th className="pb-2">課程</th><th className="pb-2 text-center">學分</th><th className="pb-2">等第</th><th className="pb-2">類別</th><th className="pb-2 text-right">操作</th></tr></thead><tbody>{draft.map((course, index) => <tr key={`draft-row-${index}`} className="border-t-2 border-[#334b73]"><td className="py-2 pr-2"><input aria-label={`第 ${index + 1} 列學期`} value={course.term} onChange={event => onDraftChange(index, { term: event.target.value })} className="pixel-input w-24 px-2 py-1.5 text-xs" /></td><td className="py-2 pr-2"><input aria-label={`第 ${index + 1} 列課程名稱`} value={course.name} onChange={event => onDraftChange(index, { name: event.target.value })} className="pixel-input w-48 px-2 py-1.5 text-xs" /></td><td className="py-2 pr-2"><input aria-label={`第 ${index + 1} 列學分`} type="number" min="1" max="12" step="0.5" value={course.credits} onChange={event => onDraftChange(index, { credits: Number(event.target.value) })} className="pixel-input w-20 px-2 py-1.5 text-center text-xs" /></td><td className="py-2 pr-2"><select aria-label={`第 ${index + 1} 列成績`} value={course.grade} onChange={event => onDraftChange(index, { grade: event.target.value as LetterGrade })} className="pixel-input w-20 px-2 py-1.5 text-xs">{gradeOptions.map(grade => <option key={grade} value={grade}>{grade}</option>)}</select></td><td className="py-2 pr-2"><select aria-label={`第 ${index + 1} 列課程類別`} value={course.category} onChange={event => onDraftChange(index, { category: event.target.value as CourseCategory })} className="pixel-input w-24 px-2 py-1.5 text-xs">{Object.entries(categoryLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-2 text-right"><button type="button" onClick={() => onDraftDelete(index)} className="p-2 text-[#b9c8e6] hover:text-[#f28682]" aria-label={`刪除匯入草稿：${course.name || `第 ${index + 1} 列`}`}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
          </>}
          {preview.duplicates.length > 0 && <p className="mt-3 text-xs leading-5 text-[#e7c984]">已略過重複：{preview.duplicates.map(course => `${course.term} ${course.name}`).join("、")}</p>}
          {preview.issues.length > 0 && <div className="mt-3 border-l-4 border-[#ee817c] bg-[#4c2b35] p-3 text-xs leading-5 text-[#ffd1cf]">{preview.issues.slice(0, 4).map(issue => <p key={`${issue.row}-${issue.raw}`}>第 {issue.row || "—"} 列：{issue.message}</p>)}</div>}
        </div>}
      </div>

      <DialogFooter className="border-t-2 border-[#5b719c] px-5 py-4"><Button onClick={() => onOpenChange(false)} className="bg-[#33486c]"><X size={16} /> 取消</Button>{preview ? <Button onClick={onConfirm} disabled={!canConfirm} className="bg-[#f4c659] text-[#152544]"><ShieldCheck size={16} /> 確認匯入 {preview.toImport.length} 筆</Button> : <Button onClick={onPreview} disabled={!text.trim() || isPdfConverting} className="bg-[#f4c659] text-[#152544]"><ScrollText size={16} /> 解析成績單</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
