import type { CourseRecord } from "./academic";

export type FragmentTranscriptPayload = {
  version: 1;
  courses: Omit<CourseRecord, "id">[];
};

const plainPrefix = "cq-import=";
const gzipPrefix = "cq-import-gz=";

export function encodeFragmentTranscriptImport(payload: FragmentTranscriptPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const encoded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${encoded}${"=".repeat((4 - (encoded.length % 4)) % 4)}`;
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function parsePayload(text: string): Omit<CourseRecord, "id">[] | null {
  try {
    const payload = JSON.parse(text) as Partial<FragmentTranscriptPayload>;
    return payload.version === 1 && Array.isArray(payload.courses) ? payload.courses as Omit<CourseRecord, "id">[] : null;
  } catch {
    return null;
  }
}

async function gunzip(bytes: Uint8Array): Promise<string | null> {
  try {
    if (typeof DecompressionStream === "undefined") return null;
    const buffer = new Uint8Array(bytes).buffer;
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch {
    return null;
  }
}

export async function decodeFragmentTranscriptImport(fragment: string): Promise<Omit<CourseRecord, "id">[] | null> {
  if (fragment.startsWith(plainPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(plainPrefix.length));
    return bytes ? parsePayload(new TextDecoder().decode(bytes)) : null;
  }
  if (fragment.startsWith(gzipPrefix)) {
    const bytes = decodeBase64Url(fragment.slice(gzipPrefix.length));
    const text = bytes ? await gunzip(bytes) : null;
    return text ? parsePayload(text) : null;
  }
  return null;
}
