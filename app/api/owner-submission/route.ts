import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { extname, join } from "node:path";
import { ownerSubmissionSchema, refCode } from "@/lib/validation";
import { appendEnquiry } from "@/lib/server/enquiry-log";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const MAX_PHOTOS = 12;
const MAX_DOCS = 5;

/**
 * Owner submission intake.
 *
 * Files land under UPLOAD_DIR with randomised storage keys — outside the web
 * root, so no document is ever reachable by URL. Documents go in their own
 * subtree and will be served in Phase 2 only through an authenticated streaming
 * route with a short-lived signed token.
 *
 * Still to wire in P1-12, alongside the database:
 *   - sharp re-encode of every image, which also strips EXIF and any payload
 *   - Prisma write to OwnerSubmission + SubmissionAsset
 *   - confirmation email to the owner, notification to StaySutra
 * DPR §7.8, §11
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`owner:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const raw = form.get("submission");
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = ownerSubmissionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File);
  const documents = form.getAll("documents").filter((f): f is File => f instanceof File);

  if (photos.length === 0) {
    return NextResponse.json({ error: "photo_required" }, { status: 422 });
  }
  if (photos.length > MAX_PHOTOS || documents.length > MAX_DOCS) {
    return NextResponse.json({ error: "too_many_files" }, { status: 422 });
  }

  // MIME is sniffed from the part's own type and checked against a whitelist —
  // extensions are never trusted, and the stored name never comes from the user.
  for (const f of photos) {
    if (!PHOTO_TYPES.has(f.type) || f.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "bad_photo" }, { status: 422 });
    }
  }
  for (const f of documents) {
    if (!DOC_TYPES.has(f.type) || f.size > MAX_DOC_BYTES) {
      return NextResponse.json({ error: "bad_document" }, { status: 422 });
    }
  }

  const code = refCode("SP");
  const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), ".data", "uploads");

  const stored: { kind: string; key: string; originalName: string; bytes: number }[] = [];

  try {
    for (const [kind, list] of [
      ["photos", photos],
      ["documents", documents],
    ] as const) {
      const dir = join(uploadDir, "submissions", code, kind);
      await mkdir(dir, { recursive: true });

      for (const file of list) {
        const key = `${randomBytes(16).toString("hex")}${safeExt(file.name, file.type)}`;
        await writeFile(join(dir, key), Buffer.from(await file.arrayBuffer()));
        stored.push({
          kind: kind === "photos" ? "PHOTO" : "DOCUMENT",
          key: `submissions/${code}/${kind}/${key}`,
          originalName: file.name,
          bytes: file.size,
        });
      }
    }

    await appendEnquiry({
      type: "OWNER_SUBMISSION",
      refCode: code,
      ...parsed.data,
      assets: stored,
      ip,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("[owner-submission] persist failed", { refCode: code, error });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ refCode: code });
}

/** Extension derived from the sniffed type, not from the uploaded filename. */
function safeExt(name: string, mime: string): string {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };
  return byMime[mime] ?? (/^\.[a-z0-9]{1,5}$/i.test(extname(name)) ? extname(name).toLowerCase() : "");
}
