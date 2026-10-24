import { authorize, Forbidden } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import type { EnquiryStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * CSV of the current filter. UTF-8 with a BOM, CRLF line endings and every
 * field quoted, so it opens cleanly in Excel and Google Sheets with Indian
 * names and ₹ intact. Columns, in order: DPR §10.4.
 */
export async function GET(request: Request) {
  try {
    await authorize("enquiry.manage");
  } catch (e) {
    return new Response(e instanceof Forbidden ? e.message : "Unauthorised", { status: 401 });
  }
  const status = new URL(request.url).searchParams.get("status") as EnquiryStatus | null;
  const rows = await db.enquiry.findMany({
    where: { deletedAt: null, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true } }, destination: { select: { name: true } } },
  });
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const header = ["Reference", "Received", "Status", "Source", "Name", "Phone", "Email", "Property", "Destination", "Check-in", "Check-out", "Guests", "Message", "UTM source", "UTM medium", "UTM campaign", "Page"];
  const lines = rows.map((e) => [
    e.refCode, e.createdAt.toISOString(), e.status, e.source, e.name, e.phone, e.email ?? "", e.property?.name ?? "", e.destination?.name ?? "",
    day(e.checkIn), day(e.checkOut), e.guests ?? "", e.message ?? "", e.utmSource ?? "", e.utmMedium ?? "", e.utmCampaign ?? "", e.pageUrl ?? "",
  ]);
  const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="staysutra-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
