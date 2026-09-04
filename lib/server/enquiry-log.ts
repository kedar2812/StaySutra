import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { env } from "@/lib/utils";

/**
 * A write-ahead log for enquiries.
 *
 * Until DATABASE_URL is provisioned (P1-02), every submission is appended here
 * as one JSON line so nothing a visitor sends is ever lost. When the database
 * lands, this file is replayed once into the Enquiry table and the log becomes a
 * belt-and-braces backstop for the case where Postgres is briefly unreachable —
 * the DPR is explicit that a failed side effect must not fail the submission.
 * DPR §6.1 step 6, §12
 */

const LOG_PATH = env(
  process.env.ENQUIRY_LOG_PATH,
  join(process.cwd(), ".data", "enquiries.jsonl"),
);

export async function appendEnquiry(record: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(LOG_PATH), { recursive: true });
  await appendFile(LOG_PATH, `${JSON.stringify({ ...record, at: new Date().toISOString() })}\n`, "utf8");
}
