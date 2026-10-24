import Link from "next/link";
import { AdminIcon, type AdminIconName } from "@/components/admin/icons";
import { Badge, ButtonLink, Card, CardHeader, EmptyState } from "@/components/admin/ui";
import { can, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { addDays, mergeRanges, nightsBetween, shortDay, todayIST } from "@/lib/calendar/dates";
import { cn } from "@/lib/utils";

export const metadata = { title: "Overview" };

const CHANNEL_LABEL: Record<string, string> = {
  FEED: "Platform booking",
  MANUAL: "Blocked by hand",
  ENQUIRY: "StaySutra booking",
};

/**
 * Overview — an activity snapshot, not vanity analytics. What needs doing now
 * leads; everything links to the list behind it. DPR §10.1
 */
export default async function OverviewPage() {
  const user = await requireUser();
  const today = todayIST();
  const horizon = addDays(today, 30);
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);

  const [properties, newCount, thisMonth, lastMonth, blocks, feeds, activity, missingAlt, publishedStories] =
    await Promise.all([
      db.property.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, checkInTime: true },
      }),
      db.enquiry.count({ where: { status: "NEW", deletedAt: null } }),
      db.enquiry.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
      db.enquiry.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart }, deletedAt: null } }),
      db.calendarBlock.findMany({
        where: { endDate: { gt: new Date(`${today}T00:00:00Z`) }, startDate: { lt: new Date(`${horizon}T00:00:00Z`) } },
        orderBy: { startDate: "asc" },
        include: { property: { select: { name: true } }, feed: { select: { label: true } } },
      }),
      db.calendarFeed.findMany({ where: { isActive: true }, select: { importUrl: true, lastStatus: true, lastExportedAt: true, label: true } }),
      db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
      db.media.count({ where: { alt: "", isDecorative: false } }),
      db.story.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    ]);

  const published = properties.filter((p) => p.status === "PUBLISHED").length;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // Occupancy over the next 30 nights, across every live property.
  const strip = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const byProperty = new Map<string, { start: string; end: string }[]>();
  for (const b of blocks) {
    const list = byProperty.get(b.propertyId) ?? [];
    list.push({ start: iso(b.startDate), end: iso(b.endDate) });
    byProperty.set(b.propertyId, list);
  }
  const merged = [...byProperty.values()].map(mergeRanges);
  const bookedOn = (day: string) => merged.filter((r) => r.some((x) => x.start <= day && day < x.end)).length;
  const live = Math.max(1, published);
  const bookedNights = strip.reduce((n, d) => n + bookedOn(d), 0);
  const occupancy = Math.round((bookedNights / (30 * live)) * 100);

  const delta = thisMonth - lastMonth;
  const connected = feeds.filter((f) => f.importUrl);
  const broken = connected.filter((f) => f.lastStatus === "ERROR");
  const hour = Number(new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(11, 13));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Setup — the few things that make the rest work, shown as progress.
  const setup: { done: boolean; label: string; hint: string; href: string }[] = [
    {
      done: connected.length > 0,
      label: "Connect the Airbnb calendar",
      hint: "Paste Airbnb's export link so booked nights block here.",
      href: "/dashboard/calendar",
    },
    {
      done: feeds.some((f) => f.lastExportedAt),
      label: "Give Airbnb the StaySutra calendar",
      hint: "So nights confirmed here are blocked on Airbnb too.",
      href: "/dashboard/calendar",
    },
    {
      done: properties.every((p) => p.checkInTime),
      label: "Set check-in and check-out times",
      hint: "Guests look for these first.",
      href: "/dashboard/properties",
    },
    {
      done: missingAlt === 0,
      label: "Describe every photo",
      hint: `${missingAlt} ${missingAlt === 1 ? "photo needs" : "photos need"} alt text for search and screen readers.`,
      href: "/dashboard/media?filter=missing-alt",
    },
    { done: publishedStories > 0, label: "Publish a first story", hint: "Five drafts are waiting for your edit.", href: "/dashboard/stories" },
  ];
  const doneCount = setup.filter((s) => s.done).length;

  const upcoming = blocks.filter((b) => iso(b.endDate) > today).slice(0, 6);

  return (
    <>
      <div className="mb-8 sm:mb-10">
        <p className="text-[0.875rem] text-text-low">
          {new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date())}
        </p>
        <h1 className="mt-1 font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-text-hi sm:text-[2.125rem]" style={{ fontWeight: 800 }}>
          {greeting}, {user.name.split(" ")[0]}
        </h1>
      </div>

      {/* KPI row — the first card is the one that asks for action. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {can(user.role, "enquiry.manage") && (
          <Kpi
            href="/dashboard/enquiries?status=NEW"
            icon="inbox"
            label="New enquiries"
            value={newCount}
            note={newCount ? "Waiting for a reply" : "All answered"}
            emphasis={newCount > 0}
          />
        )}
        <Kpi
          href="/dashboard/enquiries"
          icon="sparkle"
          label="Enquiries this month"
          value={thisMonth}
          note={lastMonth || thisMonth ? `${delta >= 0 ? "+" : ""}${delta} vs last month` : "First month on record"}
          trend={delta > 0 ? "up" : delta < 0 ? "down" : undefined}
        />
        <Kpi href="/dashboard/calendar" icon="calendar" label="Booked, next 30 nights" value={`${occupancy}%`} note={`${bookedNights} of ${30 * live} nights`} />
        <Kpi
          href="/dashboard/calendar"
          icon="sync"
          label="Calendar sync"
          value={connected.length ? (broken.length ? "Attention" : "Healthy") : "Not set up"}
          note={
            connected.length
              ? broken.length
                ? `${broken.map((b) => b.label).join(", ")} failed to sync`
                : `${connected.length} ${connected.length === 1 ? "platform" : "platforms"} in step`
              : "Connect Airbnb to start"
          }
          tone={broken.length ? "err" : connected.length ? "ok" : "warn"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          <Card>
            <CardHeader
              title="The next 30 nights"
              description={`${published} live ${published === 1 ? "property" : "properties"}. Each bar is one night.`}
              action={<ButtonLink href="/dashboard/calendar" size="sm" variant="ghost" icon="calendar">Calendar</ButtonLink>}
            />
            <div className="flex h-20 items-end gap-[3px]" role="img" aria-label={`${occupancy}% of the next 30 nights are booked`}>
              {strip.map((day) => {
                const n = bookedOn(day);
                const weekend = [5, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
                return (
                  <div key={day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${shortDay(day)} — ${n ? "booked" : "free"}`}>
                    <div
                      className={cn(
                        "w-full rounded-[3px] transition-[height] duration-500",
                        n ? "bg-gold-500" : weekend ? "bg-white/[0.14]" : "bg-white/[0.07]",
                      )}
                      style={{ height: n ? `${Math.max(35, (n / live) * 100)}%` : weekend ? "28%" : "18%" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex justify-between text-[0.75rem] tabular-nums text-text-dim">
              <span>{shortDay(today)}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-gold-500" />Booked</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-white/[0.14]" />Free weekend</span>
              </span>
              <span>{shortDay(addDays(today, 29))}</span>
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0 sm:p-6 sm:pb-0">
              <CardHeader title="Coming up" description="Stays and blocks starting soonest." />
            </div>
            {upcoming.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {upcoming.map((b) => {
                  const start = iso(b.startDate);
                  const end = iso(b.endDate);
                  const inStay = start <= today;
                  return (
                    <li key={b.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-text-dim">
                          {new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(b.startDate)}
                        </p>
                        <p className="font-display text-[1.375rem] leading-none text-text-hi" style={{ fontWeight: 800 }}>
                          {Number(start.slice(8))}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] text-text-hi">{b.property.name}</p>
                        <p className="truncate text-[0.8125rem] text-text-low">
                          {shortDay(start)} → {shortDay(end)} · {nightsBetween(start, end)} {nightsBetween(start, end) === 1 ? "night" : "nights"}
                        </p>
                      </div>
                      <Badge tone={b.source === "FEED" ? "info" : b.source === "ENQUIRY" ? "gold" : "neutral"}>
                        {b.feed?.label ?? CHANNEL_LABEL[b.source]}
                      </Badge>
                      {inStay && <Badge tone="ok" dot>Now</Badge>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Nothing booked in the next 30 nights" body="Connected calendars sync every 15 minutes. Bookings from every platform will show here." />
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:space-y-5">
          {doneCount < setup.length && (
            <Card>
              <CardHeader title="Finish setting up" description={`${doneCount} of ${setup.length} done`} />
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-[width] duration-700" style={{ width: `${(doneCount / setup.length) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-1">
                {setup.map((s) => (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      className={cn("group flex items-start gap-3 rounded-[12px] p-2.5 -mx-2.5 transition-colors", !s.done && "hover:bg-white/[0.04]")}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                          s.done ? "bg-ok text-ink-900" : "ring-1.5 ring-inset ring-white/20 border border-white/20",
                        )}
                      >
                        {s.done && <AdminIcon name="check" size={12} strokeWidth={2.5} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[0.875rem]", s.done ? "text-text-low line-through decoration-white/20" : "text-text-hi")}>{s.label}</span>
                        {!s.done && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-low">{s.hint}</span>}
                      </span>
                      {!s.done && <AdminIcon name="chevronRight" size={16} className="mt-0.5 shrink-0 text-text-dim transition-transform group-hover:translate-x-0.5" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Recent activity" />
            {activity.length ? (
              <ol className="relative space-y-4 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-white/[0.08]">
                {activity.map((a) => (
                  <li key={a.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 size-[11px] rounded-full bg-ink-800 ring-2 ring-white/15" />
                    <p className="text-[0.875rem] leading-snug text-text-mid">{a.summary}</p>
                    <p className="mt-0.5 text-[0.75rem] text-text-dim">{ago(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[0.875rem] text-text-low">Changes made in the dashboard will appear here.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Properties" action={<ButtonLink href="/dashboard/properties" size="sm" variant="ghost">All</ButtonLink>} />
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="Live" value={published} />
              <Stat label="Drafts" value={properties.length - published} />
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function Kpi({
  href,
  icon,
  label,
  value,
  note,
  emphasis,
  trend,
  tone,
}: {
  href: string;
  icon: AdminIconName;
  label: string;
  value: number | string;
  note: string;
  emphasis?: boolean;
  trend?: "up" | "down";
  tone?: "ok" | "warn" | "err";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-[18px] p-4 ring-1 ring-inset transition-[transform,background-color] duration-200 active:scale-[0.98] sm:p-5",
        emphasis
          ? "bg-gradient-to-br from-gold-500/[0.16] to-gold-500/[0.04] ring-gold-500/30 hover:from-gold-500/[0.2]"
          : "bg-ink-800/80 ring-white/[0.06] hover:bg-ink-700/80",
      )}
    >
      <div className="flex items-center justify-between">
        <AdminIcon name={icon} size={18} className={emphasis ? "text-gold-400" : "text-text-low"} />
        {tone && (
          <span className={cn("size-2 rounded-full", tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-err animate-pulse")} />
        )}
      </div>
      <p className="mt-4 font-display text-[1.75rem] leading-none tracking-[-0.02em] text-text-hi tabular-nums sm:text-[2rem]" style={{ fontWeight: 800 }}>
        {value}
      </p>
      <p className="mt-2 text-[0.8125rem] font-medium text-text-mid">{label}</p>
      <p className={cn("mt-0.5 truncate text-[0.75rem]", trend === "up" ? "text-[#6fe0ac]" : trend === "down" ? "text-[#ff9b93]" : "text-text-low")}>{note}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.05]">
      <dt className="text-[0.75rem] text-text-low">{label}</dt>
      <dd className="mt-1 font-display text-[1.5rem] leading-none text-text-hi tabular-nums" style={{ fontWeight: 800 }}>{value}</dd>
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
