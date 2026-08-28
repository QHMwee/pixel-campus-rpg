/**
 * 裝置間 QR 同步。
 *
 * 問題：靜態離線版沒有伺服器，手機與電腦的 localStorage 是兩份獨立資料，
 * 目前只能靠下載 JSON 再手動傳檔。
 *
 * 做法：把整份資料 gzip 壓縮後轉成 base64url，切成多段，發送端輪播顯示
 * QR code，接收端持續掃描直到收齊所有分段再組裝回來。全程不經過網路。
 *
 * 為什麼一定要分段：實測一份四年份的資料（56 門課、專題、證照）
 * 壓縮後約 2.9 KB，base64 後約 3.8 KB，超過單一 QR code 的 2,953 bytes 上限。
 *
 * 分段格式（每個 QR 的內容）：
 *   CQS1|<sessionId>|<index>|<total>|<payload>
 *
 * sessionId 用來避免接收端混到上一次同步殘留的分段。
 */

export const SYNC_PROTOCOL = "CQS1";

/**
 * 每段的酬載字元數。
 *
 * QR byte 模式在 L 級糾錯下最多 2,953 bytes，但塞越滿圖형越密、手機越難掃。
 * 900 是密度與段數的折衷：一份典型資料約 5 段，每段在手機螢幕上都好掃。
 */
export const SYNC_CHUNK_SIZE = 900;

export type SyncChunk = {
  sessionId: string;
  index: number;
  total: number;
  payload: string;
};

export type SyncCollectorState = {
  sessionId: string | null;
  total: number;
  received: number;
  missing: number[];
  complete: boolean;
};

/* ------------------------------------------------------------------ */
/* base64url                                                          */
/* ------------------------------------------------------------------ */

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  // 分批處理，避免大量資料時 String.fromCharCode(...args) 造成堆疊溢位。
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    for (let j = 0; j < slice.length; j += 1) binary += String.fromCharCode(slice[j]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const encoded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${encoded}${"=".repeat((4 - (encoded.length % 4)) % 4)}`;
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 壓縮                                                                */
/* ------------------------------------------------------------------ */

/** 瀏覽器沒有 CompressionStream 時退回未壓縮，段數會變多但仍可運作。 */
export async function compressText(text: string): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") return { bytes: raw, compressed: false };
  try {
    const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return { bytes: new Uint8Array(buffer), compressed: true };
  } catch {
    return { bytes: raw, compressed: false };
  }
}

export async function decompressBytes(bytes: Uint8Array, compressed: boolean): Promise<string | null> {
  if (!compressed) return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const buffer = new Uint8Array(bytes).buffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 分段與組裝                                                          */
/* ------------------------------------------------------------------ */

export function splitIntoChunks(payload: string, sessionId: string, chunkSize = SYNC_CHUNK_SIZE): string[] {
  if (chunkSize <= 0) throw new Error("chunkSize 必須大於 0");
  const parts: string[] = [];
  for (let i = 0; i < payload.length; i += chunkSize) {
    parts.push(payload.slice(i, i + chunkSize));
  }
  // 空資料仍需要一段，否則接收端永遠等不到 total。
  if (parts.length === 0) parts.push("");
  return parts.map((part, index) => `${SYNC_PROTOCOL}|${sessionId}|${index}|${parts.length}|${part}`);
}

export function parseChunk(text: string): SyncChunk | null {
  // 只切前 5 段：酬載本身是 base64url，不會含有 "|"，但保險起見不讓它被切碎。
  const parts = text.split("|");
  if (parts.length < 5) return null;
  const [protocol, sessionId, indexText, totalText] = parts;
  if (protocol !== SYNC_PROTOCOL) return null;
  const index = Number(indexText);
  const total = Number(totalText);
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total <= 0 || index < 0 || index >= total) return null;
  if (!sessionId) return null;
  return { sessionId, index, total, payload: parts.slice(4).join("|") };
}

/**
 * 收集分段。掃到不同 sessionId 時會整批重置，
 * 避免把兩次同步的分段混在一起組出壞資料。
 */
export class SyncChunkCollector {
  private sessionId: string | null = null;
  private total = 0;
  private chunks = new Map<number, string>();

  accept(text: string): SyncCollectorState {
    const chunk = parseChunk(text);
    if (chunk) {
      if (chunk.sessionId !== this.sessionId) {
        this.sessionId = chunk.sessionId;
        this.total = chunk.total;
        this.chunks.clear();
      }
      this.chunks.set(chunk.index, chunk.payload);
    }
    return this.state();
  }

  state(): SyncCollectorState {
    const missing: number[] = [];
    for (let i = 0; i < this.total; i += 1) {
      if (!this.chunks.has(i)) missing.push(i);
    }
    return {
      sessionId: this.sessionId,
      total: this.total,
      received: this.chunks.size,
      missing,
      complete: this.total > 0 && missing.length === 0,
    };
  }

  /** 收齊時回傳完整酬載，否則回傳 null。 */
  assemble(): string | null {
    if (!this.state().complete) return null;
    let out = "";
    for (let i = 0; i < this.total; i += 1) out += this.chunks.get(i) ?? "";
    return out;
  }

  reset(): void {
    this.sessionId = null;
    this.total = 0;
    this.chunks.clear();
  }
}

/* ------------------------------------------------------------------ */
/* 對外主流程                                                          */
/* ------------------------------------------------------------------ */

export type SyncEnvelope = {
  v: 1;
  /** 產生時間，接收端用來提示這份資料多舊。 */
  at: string;
  /** 是否經過 gzip 壓縮。 */
  gz: boolean;
  /** 壓縮後再 base64url 的資料本體。 */
  d: string;
};

/** 把整份 QuestData 編碼成一組可顯示的 QR 內容。 */
export async function encodeSyncChunks(
  data: unknown,
  sessionId: string,
  chunkSize = SYNC_CHUNK_SIZE
): Promise<string[]> {
  const { bytes, compressed } = await compressText(JSON.stringify(data));
  const envelope: SyncEnvelope = {
    v: 1,
    at: new Date().toISOString(),
    gz: compressed,
    d: bytesToBase64Url(bytes),
  };
  return splitIntoChunks(bytesToBase64Url(new TextEncoder().encode(JSON.stringify(envelope))), sessionId, chunkSize);
}

/** 把收齊的酬載還原成 QuestData。格式不符時回傳 null，絕不丟出例外。 */
export async function decodeSyncPayload(
  payload: string
): Promise<{ data: Record<string, unknown>; exportedAt: string } | null> {
  const envelopeBytes = base64UrlToBytes(payload);
  if (!envelopeBytes) return null;

  let envelope: Partial<SyncEnvelope>;
  try {
    envelope = JSON.parse(new TextDecoder().decode(envelopeBytes));
  } catch {
    return null;
  }
  if (envelope.v !== 1 || typeof envelope.d !== "string") return null;

  const dataBytes = base64UrlToBytes(envelope.d);
  if (!dataBytes) return null;

  const text = await decompressBytes(dataBytes, Boolean(envelope.gz));
  if (text === null) return null;

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return {
      data: parsed as Record<string, unknown>,
      exportedAt: typeof envelope.at === "string" ? envelope.at : "",
    };
  } catch {
    return null;
  }
}
