import type { MediaRef } from "./types";

/**
 * Where a Media row's bytes are served from.
 *
 * Seed photography is committed under /public/media and its storage key is
 * already a public path ("/media/kashele/pool-deck.jpg"). Everything uploaded
 * from the dashboard lives in UPLOAD_DIR/media on the server's disk and is
 * streamed by app/library/[...key]/route.ts; its key is relative
 * ("media/2026/10/abc.jpg"). Owner-submission files share UPLOAD_DIR but live
 * under submissions/, which nothing public ever serves.
 */
export function mediaUrl(storageKey: string): string {
  return storageKey.startsWith("/") ? storageKey : `/library/${storageKey.replace(/^media\//, "")}`;
}

export function toMediaRef(
  m: { storageKey: string; alt: string; width?: number | null; height?: number | null },
  altOverride?: string | null,
): MediaRef {
  return {
    src: mediaUrl(m.storageKey),
    alt: altOverride?.trim() || m.alt,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
  };
}
