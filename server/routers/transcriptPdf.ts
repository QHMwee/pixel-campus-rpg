import { TRPCError } from "@trpc/server";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { adminProcedure, router } from "../_core/trpc";

const MAX_PDF_BYTES = 2_000_000;
const MAX_PDF_TEXT_LENGTH = 16_000;

const conversionSchema = z.object({
  csv: z.string().min(1).max(24_000),
  summary: z.string().min(1).max(180),
}).strict();

export type PdfTranscriptConversion = z.infer<typeof conversionSchema> & {
  source: "ai" | "local";
};

function csvCell(value: string) {
  const normalized = value.trim().replace(/\r?\n/g, " ");
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

/** 將 data URL 或純 base64 解碼並檢查 PDF 魔術字串。 */
export function decodePdfBase64(value: string) {
  const payload = value.replace(/^data:application\/pdf;base64,/i, "").replace(/\s/g, "");
  if (!payload || !/^[A-Za-z0-9+/=]+$/.test(payload)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "PDF 檔案資料格式無效。" });
  }
  const buffer = Buffer.from(payload, "base64");
  if (!buffer.length || buffer.length > MAX_PDF_BYTES) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "PDF 檔案不可超過 2 MB。" });
  }
  if (buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "請上傳有效的 PDF 檔案。" });
  }
  return buffer;
}

/** 移除 AI 回應的 Markdown 包裝，保留可直接餵給既有 CSV／TSV 解析器的資料。 */
export function normalizePdfCsv(value: string) {
  const withoutFence = value.trim().replace(/^```(?:csv|tsv|text)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const lines = withoutFence.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new TRPCError({ code: "BAD_REQUEST", message: "AI 未能擷取可用的成績資料。" });
  const header = lines[0].replace(/^\uFEFF/, "");
  const headerLooksValid = /^(學期|term|semester)[,\t]/i.test(header) || /^(課程名稱|課名|course|subject)[,\t]/i.test(header);
  return (headerLooksValid ? lines : ["學期,課程名稱,學分,成績,類別", ...lines]).join("\n");
}

/** 在模型暫時不可用時，只從可辨識的文字表格列建立保守草稿，絕不補造課程。 */
export function buildPdfTextFallback(text: string) {
  const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).flatMap(line => {
    const cells = line.split(/\t+|\s{2,}/).map(cell => cell.trim()).filter(Boolean);
    const creditIndex = cells.findIndex(cell => /^(?:[1-9]|1[0-2])(?:\.0)?$/.test(cell));
    if (creditIndex < 1 || creditIndex + 1 >= cells.length) return [];
    const credits = cells[creditIndex];
    const grade = cells[creditIndex + 1];
    if (!/^(?:A[+\-]?|B[+\-]?|C[+\-]?|D[+\-]?|F|\d{1,3})$/i.test(grade)) return [];
    const termCandidate = cells[0];
    const hasTerm = /\d{2,3}\s*[-/]\s*\d|\d{4}\s*[-/]\s*\d/.test(termCandidate);
    const name = cells.slice(hasTerm ? 1 : 0, creditIndex).join(" ");
    if (!name) return [];
    const category = cells[creditIndex + 2] ?? "";
    return [[hasTerm ? termCandidate : "", name, credits, grade, category].map(csvCell).join(",")];
  });
  return ["學期,課程名稱,學分,成績,類別", ...rows].join("\n");
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_PDF_TEXT_LENGTH);
  } finally {
    await parser.destroy();
  }
}

function responseText(content: string | Array<unknown>) {
  if (typeof content === "string") return content;
  return content.map(item => typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : "").join("\n");
}

export const transcriptPdfRouter = router({
  convert: adminProcedure.input(z.object({
    fileName: z.string().min(1).max(180),
    pdfBase64: z.string().min(1).max(2_700_000),
  })).mutation(async ({ input }): Promise<PdfTranscriptConversion> => {
    const buffer = decodePdfBase64(input.pdfBase64);
    const text = await extractPdfText(buffer);
    if (!text || text.length < 8) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "無法從這份 PDF 擷取文字。請使用可選取文字的成績單 PDF，或改用 CSV／TSV 匯入。" });
    }

    const localCsv = buildPdfTextFallback(text);
    try {
      const models = await listLLMModels();
      const model = models.data.some(item => item.id === "gpt-5-mini") ? "gpt-5-mini" : undefined;
      const response = await invokeLLM({
        model,
        messages: [
          { role: "system", content: "你是成績單資料轉換器。只根據提供的 PDF 文字擷取課程列，不可編造、推論或修正資料。輸出繁體中文 CSV，欄位順序固定為：學期,課程名稱,學分,成績,類別。缺少學期或類別時留空；保留原始數字成績或等第成績。" },
          { role: "user", content: `檔名：${input.fileName}\n\nPDF 文字如下：\n${text}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "transcript_pdf_to_csv",
            strict: true,
            schema: {
              type: "object",
              properties: { csv: { type: "string" }, summary: { type: "string" } },
              required: ["csv", "summary"],
              additionalProperties: false,
            },
          },
        },
      });
      const parsed = conversionSchema.parse(JSON.parse(responseText(response.choices[0]?.message.content ?? "")));
      return { csv: normalizePdfCsv(parsed.csv), summary: parsed.summary, source: "ai" };
    } catch (error) {
      const localRows = localCsv.split(/\r?\n/).length - 1;
      if (localRows > 0) {
        return { csv: localCsv, summary: `AI 暫時不可用，已從文字表格建立 ${localRows} 筆待確認草稿。`, source: "local" };
      }
      console.warn("[Transcript PDF] Conversion failed:", error instanceof Error ? error.message : error);
      throw new TRPCError({ code: "BAD_REQUEST", message: "PDF 已讀取，但無法安全辨識課程列。請改用 CSV／TSV，或貼上成績表格文字。" });
    }
  }),
});
