import type { CourseRecord } from "./academic";

export type FragmentTranscriptPayload = {
  version: 1;
  courses: Omit<CourseRecord, "id">[];
};

export function encodeFragmentTranscriptImport(payload: FragmentTranscriptPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeFragmentTranscriptImport(fragment: string): Omit<CourseRecord, "id">[] | null {
  const prefix = "cq-import=";
  if (!fragment.startsWith(prefix)) return null;
  try {
    const encoded = fragment.slice(prefix.length).replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${encoded}${"=".repeat((4 - (encoded.length % 4)) % 4)}`;
    const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Partial<FragmentTranscriptPayload>;
    if (payload.version !== 1 || !Array.isArray(payload.courses)) return null;
    return payload.courses as Omit<CourseRecord, "id">[];
  } catch {
    return null;
  }
}
