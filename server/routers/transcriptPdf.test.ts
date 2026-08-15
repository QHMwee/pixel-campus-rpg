import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  destroyPdf: vi.fn(),
  getPdfText: vi.fn(),
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    constructor(_options: unknown) {}
    getText = mocks.getPdfText;
    destroy = mocks.destroyPdf;
  },
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: mocks.invokeLLM,
  listLLMModels: mocks.listLLMModels,
}));

import { buildPdfTextFallback, decodePdfBase64, normalizePdfCsv, transcriptPdfRouter } from "./transcriptPdf";

const pdfBase64 = Buffer.from("%PDF-1.4\nroute test").toString("base64");
const caller = () => transcriptPdfRouter.createCaller({} as TrpcContext);

beforeEach(() => {
  mocks.destroyPdf.mockReset().mockResolvedValue(undefined);
  mocks.getPdfText.mockReset();
  mocks.invokeLLM.mockReset();
  mocks.listLLMModels.mockReset().mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
});

describe("transcriptPdf helpers", () => {
  it("accepts a valid PDF base64 payload and rejects non-PDF data", () => {
    const buffer = decodePdfBase64(Buffer.from("%PDF-1.4\nexample").toString("base64"));
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(() => decodePdfBase64(Buffer.from("not a pdf").toString("base64"))).toThrow("有效的 PDF");
  });

  it("normalizes fenced CSV output into a standard transcript string", () => {
    const csv = normalizePdfCsv("```csv\n學期,課程名稱,學分,成績,類別\n115-1,資料庫系統,3,91,選修\n```");
    expect(csv).toContain("學期,課程名稱,學分,成績,類別");
    expect(csv).toContain("115-1,資料庫系統,3,91,選修");
  });

  it("builds a conservative CSV draft only from text lines that contain course, credits and grade", () => {
    const csv = buildPdfTextFallback("115-1    資料庫系統    3    91    選修\n此列不是成績資料");
    expect(csv).toContain("115-1,資料庫系統,3,91,選修");
    expect(csv).not.toContain("此列不是成績資料");
  });
});

describe("transcriptPdf.convert", () => {
  it("returns normalized structured CSV and summary when the AI conversion succeeds", async () => {
    mocks.getPdfText.mockResolvedValue({ text: "115-1    資料庫系統    3    91    選修" });
    mocks.invokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            csv: "```csv\n學期,課程名稱,學分,成績,類別\n115-1,資料庫系統,3,91,選修\n```",
            summary: "已擷取 1 筆課程。",
          }),
        },
      }],
    });

    const result = await caller().convert({ fileName: "grades.pdf", pdfBase64 });

    expect(result).toEqual({
      csv: "學期,課程名稱,學分,成績,類別\n115-1,資料庫系統,3,91,選修",
      summary: "已擷取 1 筆課程。",
      source: "ai",
    });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      response_format: expect.objectContaining({ type: "json_schema" }),
    }));
    expect(mocks.destroyPdf).toHaveBeenCalledOnce();
  });

  it("returns a conservative local CSV draft when AI conversion fails but text rows are recognizable", async () => {
    mocks.getPdfText.mockResolvedValue({ text: "115-1    資料庫系統    3    91    選修\n此列不是成績資料" });
    mocks.invokeLLM.mockRejectedValue(new Error("AI unavailable"));

    const result = await caller().convert({ fileName: "grades.pdf", pdfBase64 });

    expect(result).toMatchObject({
      csv: "學期,課程名稱,學分,成績,類別\n115-1,資料庫系統,3,91,選修",
      source: "local",
    });
    expect(result.summary).toContain("1 筆待確認草稿");
  });

  it("rejects with BAD_REQUEST when AI fails and no safe local course row can be created", async () => {
    mocks.getPdfText.mockResolvedValue({ text: "115-1    這是無法辨識的說明文字" });
    mocks.invokeLLM.mockRejectedValue(new Error("AI unavailable"));

    await expect(caller().convert({ fileName: "grades.pdf", pdfBase64 })).rejects.toSatisfy((error: unknown) => {
      return error instanceof TRPCError && error.code === "BAD_REQUEST";
    });
  });
});
