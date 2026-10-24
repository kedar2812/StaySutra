import { readUpload } from "@/lib/server/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/**
 * Streams media-library uploads from UPLOAD_DIR/media — and only from there.
 * Owner-submission photos and documents sit beside it under submissions/ and
 * are never reachable through this route. Keys are random ids, so they never
 * change and can be cached for a year.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  if (key.some((k) => k === ".." || k.includes("\\"))) return new Response("Not found", { status: 404 });
  const path = `media/${key.join("/")}`;
  const type = TYPES[path.split(".").pop()?.toLowerCase() ?? ""];
  if (!type) return new Response("Not found", { status: 404 });
  const file = await readUpload(path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=31536000, immutable",
      "last-modified": file.modified.toUTCString(),
    },
  });
}
