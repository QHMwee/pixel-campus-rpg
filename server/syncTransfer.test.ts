import { describe, expect, it } from "vitest";
import {
  SYNC_PROTOCOL,
  SyncChunkCollector,
  base64UrlToBytes,
  bytesToBase64Url,
  decodeSyncPayload,
  encodeSyncChunks,
  parseChunk,
  splitIntoChunks,
} from "../shared/syncTransfer";

const sampleData = {
  courses: Array.from({ length: 56 }, (_, i) => ({
    id: `course-${i}`,
    term: `11${3 + (i % 3)}-${(i % 2) + 1}`,
    name: `課程名稱${i}`,
    credits: 3,
    grade: "A",
    category: "required",
  })),
  goals: { total: 128, required: 60, elective: 42, general: 26, semestersLeft: 2 },
  careerTrackId: "iot",
  achievementRecords: [{ id: "a1", kind: "certificate", title: "多益", status: "earned" }],
};

describe("base64url round trip", () => {
  it("survives arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 62, 63, 127, 128, 255, 254]);
    expect(Array.from(base64UrlToBytes(bytesToBase64Url(bytes))!)).toEqual(Array.from(bytes));
  });

  it("produces url-safe output only", () => {
    const bytes = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
    expect(bytesToBase64Url(bytes)).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it("handles large input without stack overflow", () => {
    const bytes = new Uint8Array(300_000).fill(65);
    expect(() => bytesToBase64Url(bytes)).not.toThrow();
  });

  it("returns null for malformed input", () => {
    expect(base64UrlToBytes("!!!not base64!!!")).toBeNull();
  });
});

describe("chunk framing", () => {
  it("splits and labels every chunk", () => {
    const chunks = splitIntoChunks("abcdefghij", "sess", 4);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBe(`${SYNC_PROTOCOL}|sess|0|3|abcd`);
    expect(chunks[2]).toBe(`${SYNC_PROTOCOL}|sess|2|3|ij`);
  });

  it("always emits at least one chunk", () => {
    expect(splitIntoChunks("", "sess", 100)).toHaveLength(1);
  });

  it("parses its own framing", () => {
    const [first] = splitIntoChunks("payload", "sess", 100);
    expect(parseChunk(first)).toEqual({ sessionId: "sess", index: 0, total: 1, payload: "payload" });
  });

  it("rejects foreign or malformed codes", () => {
    expect(parseChunk("https://example.com")).toBeNull();
    expect(parseChunk("OTHER|sess|0|1|x")).toBeNull();
    expect(parseChunk(`${SYNC_PROTOCOL}|sess|5|3|x`)).toBeNull();
    expect(parseChunk(`${SYNC_PROTOCOL}|sess|a|3|x`)).toBeNull();
    expect(parseChunk(`${SYNC_PROTOCOL}||0|1|x`)).toBeNull();
  });
});

describe("collector", () => {
  it("reports progress and completion", () => {
    const chunks = splitIntoChunks("abcdefghij", "sess", 4);
    const collector = new SyncChunkCollector();

    let state = collector.accept(chunks[0]);
    expect(state).toMatchObject({ total: 3, received: 1, complete: false });
    expect(state.missing).toEqual([1, 2]);

    collector.accept(chunks[2]);
    state = collector.accept(chunks[1]);
    expect(state.complete).toBe(true);
    expect(collector.assemble()).toBe("abcdefghij");
  });

  it("tolerates chunks arriving out of order and repeated", () => {
    const chunks = splitIntoChunks("abcdefghij", "sess", 4);
    const collector = new SyncChunkCollector();
    for (const chunk of [chunks[2], chunks[2], chunks[1], chunks[0], chunks[1]]) collector.accept(chunk);
    expect(collector.assemble()).toBe("abcdefghij");
  });

  it("ignores unrelated codes without losing progress", () => {
    const chunks = splitIntoChunks("abcdefghij", "sess", 4);
    const collector = new SyncChunkCollector();
    collector.accept(chunks[0]);
    collector.accept("https://some.other/qr");
    expect(collector.state().received).toBe(1);
  });

  it("resets when a different session appears", () => {
    const first = splitIntoChunks("abcdefghij", "one", 4);
    const second = splitIntoChunks("XYZ", "two", 4);
    const collector = new SyncChunkCollector();
    collector.accept(first[0]);
    collector.accept(first[1]);
    const state = collector.accept(second[0]);
    expect(state.sessionId).toBe("two");
    expect(state.received).toBe(1);
    expect(collector.assemble()).toBe("XYZ");
  });

  it("returns null before every chunk has arrived", () => {
    const chunks = splitIntoChunks("abcdefghij", "sess", 4);
    const collector = new SyncChunkCollector();
    collector.accept(chunks[0]);
    expect(collector.assemble()).toBeNull();
  });
});

describe("end to end", () => {
  it("round trips a realistic dataset through chunking", async () => {
    const chunks = await encodeSyncChunks(sampleData, "sess");
    const collector = new SyncChunkCollector();
    // 打亂順序，模擬輪播時掃描到的先後不定
    for (const chunk of [...chunks].reverse()) collector.accept(chunk);

    const payload = collector.assemble();
    expect(payload).not.toBeNull();

    const decoded = await decodeSyncPayload(payload!);
    expect(decoded).not.toBeNull();
    expect(decoded!.data).toEqual(sampleData);
    expect(Date.parse(decoded!.exportedAt)).not.toBeNaN();
  });

  it("keeps every chunk inside the QR byte limit", async () => {
    const chunks = await encodeSyncChunks(sampleData, "sess");
    for (const chunk of chunks) {
      expect(new TextEncoder().encode(chunk).length).toBeLessThan(2953);
    }
  });

  it("needs more than one chunk for a full four-year dataset", async () => {
    const chunks = await encodeSyncChunks(sampleData, "sess");
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("round trips an empty dataset", async () => {
    const chunks = await encodeSyncChunks({}, "sess");
    const collector = new SyncChunkCollector();
    chunks.forEach(chunk => collector.accept(chunk));
    const decoded = await decodeSyncPayload(collector.assemble()!);
    expect(decoded!.data).toEqual({});
  });

  it("returns null rather than throwing on corrupted payloads", async () => {
    expect(await decodeSyncPayload("not-a-valid-payload")).toBeNull();
    expect(await decodeSyncPayload(bytesToBase64Url(new TextEncoder().encode("{}")))).toBeNull();
    expect(
      await decodeSyncPayload(bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ v: 2, d: "x" }))))
    ).toBeNull();
  });
});
