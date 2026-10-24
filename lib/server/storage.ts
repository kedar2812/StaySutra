import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { createId } from "./id";

/**
 * Uploaded media on the server's disk. On the VPS this is a host bind mount
 * (/var/staysutra/uploads) so files survive a rebuild and are in the nightly
 * backup; locally it is .data/uploads. Keys are relative: "2026/10/abc.jpg".
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR?.trim() || join(process.cwd(), ".data", "uploads");

export function safePath(key: string): string | null {
  const full = normalize(join(UPLOAD_DIR, key));
  return full.startsWith(normalize(UPLOAD_DIR) + sep) ? full : null;
}

export async function saveUpload(bytes: Buffer, ext: string): Promise<string> {
  const now = new Date();
  const key = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${createId()}.${ext}`;
  const path = safePath(key)!;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return key;
}

export async function readUpload(key: string) {
  const path = safePath(key);
  if (!path) return null;
  try {
    const [bytes, info] = await Promise.all([readFile(path), stat(path)]);
    return { bytes, modified: info.mtime };
  } catch {
    return null;
  }
}

export async function removeUpload(key: string) {
  const path = safePath(key);
  if (path) await unlink(path).catch(() => {});
}
