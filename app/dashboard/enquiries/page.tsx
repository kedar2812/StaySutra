import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { EnquiryInbox, type InboxEnquiry } from "./EnquiryInbox";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; open?: string }> }) {
  await requireUser("enquiry.manage");
  const { status, open } = await searchParams;
  const rows = await db.enquiry.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      property: { select: { name: true, slug: true } },
      destination: { select: { name: true } },
      calendarBlock: { select: { id: true } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });

  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  const enquiries: InboxEnquiry[] = rows.map((e) => ({
    id: e.id,
    refCode: e.refCode,
    status: e.status,
    source: e.source,
    name: e.name,
    phone: e.phone,
    email: e.email,
    checkIn: iso(e.checkIn),
    checkOut: iso(e.checkOut),
    guests: e.guests,
    message: e.message,
    property: e.property ? { name: e.property.name, slug: e.property.slug } : null,
    destination: e.destination?.name ?? null,
    pageUrl: e.pageUrl,
    utm: [e.utmSource, e.utmMedium, e.utmCampaign].filter(Boolean).join(" / ") || null,
    createdAt: e.createdAt.toISOString(),
    held: Boolean(e.calendarBlock),
    notes: e.notes.map((n) => ({ id: n.id, body: n.body, author: n.author.name, createdAt: n.createdAt.toISOString() })),
  }));

  return <EnquiryInbox enquiries={enquiries} initialStatus={(status as InboxEnquiry["status"]) ?? "ALL"} initialOpen={open ?? null} />;
}
