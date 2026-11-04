import Link from "next/link";
import { AdminIcon } from "@/components/admin/icons";
import { Badge, ButtonLink, Card, CardHeader, EmptyState } from "@/components/admin/ui";
import { ActivityFeed, NightsTimeline, SetupCard, StatTile, type Lane } from "@/components/admin/overview";
import { can, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { CHANNELS, SOURCE_COLOR, type ChannelKey } from "@/lib/calendar/channels";
import { addDays, nightsBetween, shortDay, todayIST } from "@/lib/calendar/dates";

export const metadata = { title: "Overview" };

const CHANNEL_LABEL: Record<string, string> = {
  FEED: "Platform booking",
  MANUAL: "Blocked by hand",
  ENQUIRY: "StaySutra booking",
};

const WEEKS = 12;

/**
 * Overview — what needs doing now, then how the next month looks. Not vanity
 * analytics: every figure links to the list behind it. DPR §10.1
 */
export default async function OverviewPage() {
  const user = await requireUser();
  const today = todayIST();
  const horizon = addDays(today, 30);
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
  const trendStart = new Date(`${addDays(today, -7 * WEEKS + 1)}T00:00:00Z`);
  const canEnquiries = can(user.role, "enquiry.manage");

  const [properties, newCount, thisMonth, lastMonth, blocks, feeds, activity, missingAlt, publishedStories, recentEnquiries] = await Promise.all([
    db.property.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { id: true, name: true, status: true, checkInTime: true },
    }),
    db.enquiry.count({ where: { status: "NEW", deletedAt: null } }),
    db.enquiry.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
    db.enquiry.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart }, deletedAt: null } }),
    db.calendarBlock.findMany({
      where: {
        endDate: { gt: new Date(`${today}T00:00:00Z`) },
        startDate: { lt: new Date(`${horizon}T00:00:00Z`) },
        OR: [{ feedId: null }, { feed: { isActive: true } }],
      },
      orderBy: { startDate: "asc" },
      include: { property: { select: { name: true } }, feed: { select: { label: true, channel: true } }, enquiry: { select: { name: true } } },
    }),
    db.calendarFeed.findMany({ where: { isActive: true }, select: { importUrl: true, lastStatus: true, lastExportedAt: true, label: true } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 7 }),
    db.media.count({ where: { alt: "", isDecorative: false } }),
    db.story.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    db.enquiry.findMany({ where: { createdAt: { gte: trendStart }, deletedAt: null }, select: { createdAt: true } }),
  ]);
  const canAnalytics = can(user.role, "analytics.view");
  const web = canAnalytics
    ? (
        await db.$queryRaw<{ visitors: number; views: number; whatsapp: number }[]>`
          SELECT count(DISTINCT visitor) FILTER (WHERE kind = 'PAGEVIEW')::int AS visitors,
                 count(*) FILTER (WHERE kind = 'PAGEVIEW')::int AS views,
                 count(*) FILTER (WHERE kind = 'WHATSAPP')::int AS whatsapp
          FROM "SiteHit" WHERE "createdAt" >= ${new Date(`${addDays(today, -6)}T00:00:00+05:30`)}`
      )[0]
    : null;

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const published = properties.filter((p) => p.status === "PUBLISHED");
  const live = Math.max(1, published.length);

  // Occupancy over the next 30 nights, across the live properties.
  const strip = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const liveIds = new Set(published.map((p) => p.id));
  const bookedNights = strip.reduce((n, day) => {
    const props = new Set(blocks.filter((b) => liveIds.has(b.propertyId) && iso(b.startDate) <= day && day < iso(b.endDate)).map((b) => b.propertyId));
    return n + props.size;
  }, 0);
  const occupancy = Math.round((bookedNights / (30 * live)) * 100);

  // Enquiries per week for the last twelve weeks, oldest first.
  const weekly = Array.from({ length: WEEKS }, () => 0);
  for (const e of recentEnquiries) {
    const age = Math.floor((Date.parse(`${today}T23:59:59Z`) - e.createdAt.getTime()) / (7 * 86_400_000));
    if (age >= 0 && age < WEEKS) weekly[WEEKS - 1 - age]! += 1;
  }

  const delta = thisMonth - lastMonth;
  const connected = feeds.filter((f) => f.importUrl);
  const broken = connected.filter((f) => f.lastStatus === "ERROR");
  const hour = Number(new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(11, 13));
  const greeting = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // The timeline: one lane per property, live ones first, each stay one bar.
  const colorOf = (b: (typeof blocks)[number]) =>
    b.source === "FEED" ? (CHANNELS[(b.feed?.channel ?? "OTHER") as ChannelKey]?.color ?? CHANNELS.OTHER.color) : SOURCE_COLOR[b.source];
  const labelOf = (b: (typeof blocks)[number]) =>
    b.source === "FEED" ? `${b.feed?.label ?? "Platform"} booking` : b.source === "ENQUIRY" ? `${b.enquiry?.name ?? "Guest"} · StaySutra` : b.note || "Blocked by hand";
  const lanes: Lane[] = properties.slice(0, 8).map((p) => ({
    id: p.id,
    name: p.name,
    live: p.status === "PUBLISHED",
    runs: blocks
      .filter((b) => b.propertyId === p.id)
      .map((b) => {
        const s = Math.max(0, nightsBetween(today, iso(b.startDate)));
        const e = Math.min(30, nightsBetween(today, iso(b.endDate)));
        return {
          start: s,
          end: e,
          color: colorOf(b),
          label: labelOf(b),
          detail: `${shortDay(iso(b.startDate))} → ${shortDay(iso(b.endDate))} · ${nightsBetween(iso(b.startDate), iso(b.endDate))} nights`,
          striped: b.source === "MANUAL",
        };
      })
      .filter((r) => r.end > r.start),
  }));
  const legend = [
    ...[...new Set(blocks.filter((b) => b.source === "FEED").map((b) => b.feed?.channel ?? "OTHER"))].map((c) => ({
      label: CHANNELS[c as ChannelKey]?.label ?? "Platform",
      color: CHANNELS[c as ChannelKey]?.color ?? CHANNELS.OTHER.color,
    })),
    { label: "StaySutra", color: SOURCE_COLOR.ENQUIRY },
    { label: "Blocked by hand", color: SOURCE_COLOR.MANUAL, striped: true },
  ];
  const days = strip.map((d) => {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    return { iso: d, label: shortDay(d).replace(/^\w+,?\s*/, ""), weekend: dow === 5 || dow === 6, dom: Number(d.slice(8)) };
  });

  // Setup — the few things that make the rest work, shown as progress.
  const setup = [
    { done: connected.length > 0, label: "Connect the Airbnb calendar", hint: "Paste Airbnb’s export link so booked nights block here.", href: "/dashboard/calendar" },
    { done: feeds.some((f) => f.lastExportedAt), label: "Give Airbnb the StaySutra calendar", hint: "So nights confirmed here are blocked on Airbnb too.", href: "/dashboard/calendar" },
    { done: properties.every((p) => p.checkInTime), label: "Set check-in and check-out times", hint: "Guests look for these first.", href: "/dashboard/properties" },
    {
      done: missingAlt === 0,
      label: "Describe every photo",
      hint: `${missingAlt} ${missingAlt === 1 ? "photo needs" : "photos need"} a description for search and screen readers.`,
      href: "/dashboard/media?filter=missing-alt",
    },
    { done: publishedStories > 0, label: "Publish a first story", hint: "Drafts are waiting for your edit.", href: "/dashboard/stories" },
  ];

  const upcoming = blocks.filter((b) => iso(b.endDate) > today).slice(0, 6);
  const dateLine = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());

  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-subhead font-semibold text-fg-3">{dateLine}</p>
          <h1 className="mt-0.5 text-[1.875rem] font-bold leading-[1.12] tracking-[-0.026em] text-fg sm:text-large">
            {greeting}, {user.name.split(" ")[0]}
          </h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/dashboard/calendar" variant="plain" icon="calendar">
            Calendar
          </ButtonLink>
          {canEnquiries && newCount > 0 && (
            <ButtonLink href="/dashboard/enquiries?status=NEW" variant="primary" icon="inbox">
              Reply to {newCount}
            </ButtonLink>
          )}
        </div>
      </header>

      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {canEnquiries && (
          <StatTile
            href="/dashboard/enquiries?status=NEW"
            icon="inbox"
            label="New enquiries"
            value={newCount}
            note={newCount ? "Waiting for a reply" : "All answered"}
            emphasis={newCount > 0}
          />
        )}
        <StatTile
          href="/dashboard/enquiries"
          icon="sparkle"
          label="This month"
          value={thisMonth}
          note={lastMonth || thisMonth ? `${delta >= 0 ? "+" : "−"}${Math.abs(delta)} vs last month` : "First month on record"}
          noteTone={delta > 0 ? "up" : delta < 0 ? "down" : "neutral"}
          trend={{ points: weekly, label: `Enquiries per week, last ${WEEKS} weeks: ${weekly.join(", ")}` }}
        />
        <StatTile href="/dashboard/calendar" icon="calendar" label="Booked, next 30 nights" value={occupancy} suffix="%" note={`${bookedNights} of ${30 * live} nights`} meter={occupancy / 100} />
        <StatTile
          href="/dashboard/calendar"
          icon="sync"
          label="Calendar sync"
          value={connected.length ? (broken.length ? "Attention" : "Healthy") : "Not set up"}
          status={broken.length ? "err" : connected.length ? "ok" : "warn"}
          note={
            connected.length
              ? broken.length
                ? `${broken.map((b) => b.label).join(", ")} failed`
                : `${connected.length} ${connected.length === 1 ? "platform" : "platforms"} in step`
              : "Connect Airbnb to start"
          }
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-5">
        <div className="min-w-0 space-y-4 lg:space-y-5">
          <Card>
            <CardHeader
              title="The next 30 nights"
              description={`${published.length} live ${published.length === 1 ? "property" : "properties"} · ${occupancy}% booked`}
              action={
                <ButtonLink href="/dashboard/calendar" size="sm" variant="ghost">
                  Open calendar
                </ButtonLink>
              }
            />
            {properties.length ? (
              <NightsTimeline lanes={lanes} days={days} legend={legend} />
            ) : (
              <EmptyState icon="properties" title="No properties yet" body="Add a property and its next month shows here." className="py-8" />
            )}
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <CardHeader title="Coming up" description="Stays and blocks starting soonest" className="mb-2" />
            </div>
            {upcoming.length ? (
              <ul className="px-2 pb-2 sm:px-3 sm:pb-3">
                {upcoming.map((b) => {
                  const start = iso(b.startDate);
                  const end = iso(b.endDate);
                  const inStay = start <= today;
                  const nights = nightsBetween(start, end);
                  return (
                    <li key={b.id}>
                      <Link href={`/dashboard/calendar?p=${b.propertyId}`} className="flex items-center gap-3.5 rounded-[16px] px-3 py-2.5 transition-colors hover:bg-fill">
                        <div className="w-11 shrink-0 overflow-hidden rounded-[11px] bg-panel text-center shadow-[0_0_0_1px_var(--d-line-2)]">
                          <p className="bg-neg py-[2px] text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-white">
                            {new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(b.startDate)}
                          </p>
                          <p className="py-0.5 text-[1.25rem] font-semibold leading-tight tracking-[-0.02em] text-fg">{Number(start.slice(8))}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-callout font-semibold text-fg">{b.property.name}</p>
                          <p className="truncate text-subhead tabular-nums text-fg-3">
                            {shortDay(start)} → {shortDay(end)} · {nights} {nights === 1 ? "night" : "nights"}
                          </p>
                        </div>
                        <span className="hidden items-center gap-1.5 text-footnote font-medium text-fg-2 sm:flex">
                          <span className="size-2 rounded-full" style={{ background: colorOf(b) }} />
                          {b.feed?.label ?? CHANNEL_LABEL[b.source]}
                        </span>
                        {inStay && (
                          <Badge tone="ok" dot>
                            In house
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Nothing booked in the next 30 nights" body="Connected calendars sync every 15 minutes. Bookings from every platform will show here." />
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4 lg:space-y-5">
          {setup.some((s) => !s.done) && <SetupCard steps={setup} />}

          <Card>
            <CardHeader title="Recent activity" action={can(user.role, "users.manage") ? <ButtonLink href="/dashboard/users" size="sm" variant="ghost">All</ButtonLink> : undefined} />
            <ActivityFeed items={activity.map((a) => ({ id: a.id, summary: a.summary, entity: a.entity, ago: ago(a.createdAt) }))} />
          </Card>

          {web && (
            <Link href="/dashboard/analytics" className="group block rounded-[20px] bg-panel p-5 shadow-tile transition-shadow hover:shadow-pop sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-headline text-fg">Website, last 7 days</h2>
                <AdminIcon name="chevronRight" size={16} className="text-fg-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Visitors", web.visitors],
                  ["Page views", web.views],
                  ["WhatsApp taps", web.whatsapp],
                ].map(([label, n]) => (
                  <div key={label as string}>
                    <dt className="text-footnote text-fg-3">{label}</dt>
                    <dd className="mt-0.5 text-title2 font-bold tabular-nums tracking-[-0.02em] text-fg">{(n as number).toLocaleString("en-IN")}</dd>
                  </div>
                ))}
              </dl>
            </Link>
          )}

          <Card>
            <CardHeader title="Properties" action={<ButtonLink href="/dashboard/properties" size="sm" variant="ghost">All</ButtonLink>} />
            <dl className="grid grid-cols-2 gap-2.5">
              <Stat label="Live on the website" value={published.length} dot="bg-pos" />
              <Stat label="Drafts and offline" value={properties.length - published.length} dot="bg-fg-4" />
            </dl>
            {properties.length - published.length > 0 && (
              <Link href="/dashboard/properties" className="mt-3 flex items-center gap-1.5 px-1 text-subhead font-medium text-accent-text hover:opacity-80">
                <AdminIcon name="sparkle" size={14} />
                Finish a draft and publish it
              </Link>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-[16px] bg-fill p-3.5">
      <dt className="flex items-center gap-1.5 text-footnote font-medium text-fg-3">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className="mt-1.5 text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-fg">{value}</dd>
    </div>
  );
}

function ago(date: Date): string {
  const m = Math.round((Date.now() - date.getTime()) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d} d ago` : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}
