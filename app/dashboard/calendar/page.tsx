import { requireUser, can } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { addDays, todayIST } from "@/lib/calendar/dates";
import { SITE_URL } from "@/lib/site";
import { EmptyState, ButtonLink, PageHeader } from "@/components/admin/ui";
import { CalendarBoard, type BoardBlock, type BoardFeed } from "./CalendarBoard";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const user = await requireUser();
  const { p } = await searchParams;
  const properties = await db.property.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icalToken: true, status: true },
  });

  if (!properties.length) {
    return (
      <>
        <PageHeader title="Calendar" />
        <EmptyState icon="calendar" title="No properties yet" body="Add a property first; its calendar lives here." action={<ButtonLink href="/dashboard/properties/new" variant="primary" icon="plus">New property</ButtonLink>} />
      </>
    );
  }

  const property = properties.find((x) => x.id === p) ?? properties[0]!;
  const today = todayIST();
  const [feeds, blocks] = await Promise.all([
    db.calendarFeed.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" } }),
    db.calendarBlock.findMany({
      where: {
        propertyId: property.id,
        endDate: { gte: new Date(`${addDays(today, -45)}T00:00:00Z`) },
        startDate: { lte: new Date(`${addDays(today, 400)}T00:00:00Z`) },
        OR: [{ feedId: null }, { feed: { isActive: true } }],
      },
      include: { enquiry: { select: { id: true, name: true, refCode: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const feedById = new Map(feeds.map((f) => [f.id, f]));

  const boardBlocks: BoardBlock[] = blocks.map((b) => ({
    id: b.id,
    source: b.source,
    start: iso(b.startDate),
    end: iso(b.endDate),
    summary: b.summary,
    note: b.note,
    channel: b.feedId ? (feedById.get(b.feedId)?.channel ?? "OTHER") : null,
    channelLabel: b.feedId ? (feedById.get(b.feedId)?.label ?? "Platform") : null,
    enquiry: b.enquiry ? { id: b.enquiry.id, name: b.enquiry.name, refCode: b.enquiry.refCode } : null,
  }));

  const boardFeeds: BoardFeed[] = feeds.map((f) => ({
    id: f.id,
    channel: f.channel,
    label: f.label,
    importUrl: f.importUrl,
    listingUrl: f.listingUrl,
    isActive: f.isActive,
    exportUrl: `${SITE_URL}/calendar/${f.exportToken}.ics`,
    lastSyncedAt: f.lastSyncedAt?.toISOString() ?? null,
    lastStatus: f.lastStatus,
    lastError: f.lastError,
    lastEventCount: f.lastEventCount,
    lastExportedAt: f.lastExportedAt?.toISOString() ?? null,
  }));

  return (
    <CalendarBoard
      key={property.id}
      properties={properties.map((x) => ({ id: x.id, name: x.name }))}
      property={{ id: property.id, name: property.name, masterUrl: `${SITE_URL}/calendar/${property.icalToken}.ics` }}
      blocks={boardBlocks}
      feeds={boardFeeds}
      today={today}
      canEdit={can(user.role, "calendar.edit")}
    />
  );
}
