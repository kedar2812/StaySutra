import { NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { authorize, Forbidden, logActivity } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { saveUpload } from "@/lib/server/storage";
import { mediaUrl } from "@/lib/media";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Image upload — one file per request, so the dashboard can show honest
 * per-file progress and a slow phone connection loses one photo, not twelve.
 *
 * Every image is turned the right way up, resized to at most 2400px, re-encoded
 * as a progressive JPEG and stripped of its metadata — including the GPS
 * position a phone writes into every photo. next/image makes the AVIF and WebP
 * variants on demand from this master.
 */
export async function POST(request: Request) {
  let user;
  try {
    user = await authorize("media.edit");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Forbidden ? e.message : "Unauthorised" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const folder = String(form?.get("folder") ?? "").slice(0, 60) || null;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is over 25 MB" }, { status: 413 });

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return NextResponse.json(
      { error: "That file could not be read as a photo. JPEG, PNG or WebP work best." },
      { status: 415 },
    );
  }

  const storageKey = await saveUpload(output.data, "jpg");
  const media = await db.media.create({
    data: {
      storageKey,
      originalName: file.name.slice(0, 200),
      mimeType: "image/jpeg",
      width: output.info.width,
      height: output.info.height,
      sizeBytes: output.info.size,
      alt: "",
      folder,
      uploadedById: user.id,
    },
  });
  await logActivity(user, "media.upload", "Media", media.id, `${user.name} uploaded ${file.name}`);

  return NextResponse.json({
    id: media.id,
    src: mediaUrl(media.storageKey),
    width: media.width,
    height: media.height,
    alt: media.alt,
    originalName: media.originalName,
  });
}
