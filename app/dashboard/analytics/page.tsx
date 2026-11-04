import { requireUser } from "@/lib/server/auth";
import { Card, CardHeader, PageHeader } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { BarList, DeviceSplit, Funnel, Heatmap, Kpi, LiveNow, RangePicker, SeriesKey, TrafficChart } from "@/components/admin/analytics";
import { loadAnalytics, RANGES, type Range } from "./data";

export const metadata = { title: "Analytics" };

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const duration = (s: number) => (s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`);

/**
 * How the website is doing, in the terms an owner runs a stay business by:
 * how many people came, from where, what they looked at, and how many of
 * them asked to stay. First-party and cookieless — see lib/server/analytics.ts.
 */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireUser("analytics.view");
  const { range: raw } = await searchParams;
  const range: Range = raw && raw in RANGES ? (raw as Range) : "30d";
  const a = await loadAnalytics(range);
  const { now, before, meta } = a;

  const conv = pct(now.enquiries, now.visitors);
  const convBefore = pct(before.enquiries, before.visitors);
  const avg = now.sessions ? now.seconds / now.sessions : 0;
  const avgBefore = before.sessions ? before.seconds / before.sessions : 0;
  const bounce = pct(now.bounced, now.sessions);
  const bounceBefore = pct(before.bounced, before.sessions);
  const hasData = Boolean(a.since);
  const since = a.since ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(a.since)) : null;
  const liveStays = a.stays.filter((s) => s.live || s.visitors);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Who visits the website, where they come from, and how many of them ask to stay."
        actions={
          <RangePicker
            value={range}
            options={(Object.keys(RANGES) as Range[]).map((k) => ({ value: k, label: k === "12m" ? "12 months" : k.replace("d", " days") }))}
          />
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <LiveNow initial={a.live} />
        <p className="flex items-center gap-1.5 text-footnote text-fg-3">
          <AdminIcon name="lock" size={13} />
          {since ? `Counting since ${since}. ` : ""}No cookies, nothing personal stored, your own visits excluded.
        </p>
      </div>

      {!hasData && (
        <div className="mb-5 flex items-start gap-4 rounded-[22px] bg-note/10 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-note text-white">
            <AdminIcon name="chart" size={19} strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-headline text-fg">Waiting for the first visit</p>
            <p className="mt-1 max-w-[62ch] text-callout leading-relaxed text-fg-2">
              Counting starts the moment this version of the website is live. Figures fill in as guests arrive — enquiries below are already real, from the inbox.
            </p>
          </div>
        </div>
      )}

      <p className="mb-2.5 px-1 text-subhead text-fg-3">
        {meta.label}, compared with the {meta.prev}
      </p>
      <section aria-label={meta.label} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Visitors" value={now.visitors} previous={before.visitors} prevLabel={meta.prev} hint="Unique visitors each day, added up. Without cookies, someone who returns on another day counts again." />
        <Kpi label="Page views" value={now.views} previous={before.views} prevLabel={meta.prev} />
        <Kpi label="Enquiries" value={now.enquiries} previous={before.enquiries} prevLabel={meta.prev} />
        <Kpi label="Enquiry rate" value={conv} display={`${conv}`} unit="%" previous={convBefore} prevLabel={meta.prev} hint="Enquiries ÷ visitors. The single number that says whether the website works." />
        <Kpi label="WhatsApp taps" value={now.whatsapp} previous={before.whatsapp} prevLabel={meta.prev} />
        <Kpi label="Time on site" value={avg} display={duration(avg)} previous={avgBefore} prevLabel={meta.prev} hint="Average time a visitor had the website open and in view, per day." />
      </section>

      <Card className="mt-4 lg:mt-5">
        <CardHeader
          title="Traffic"
          description={`${meta.label}, ${meta.bucket === "week" ? "week by week" : "day by day"}. Hover for detail.`}
          action={
            <SeriesKey
              items={[
                { color: "var(--viz-1)", label: "Visitors" },
                { color: "var(--viz-2)", label: "Page views" },
                { color: "var(--viz-3)", label: "Enquiries" },
              ]}
            />
          }
          className="flex-col sm:flex-row"
        />
        <TrafficChart points={a.points} week={meta.bucket === "week"} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-2 lg:gap-5">
        <Card>
          <CardHeader title="Where visitors come from" description="Enquiries and WhatsApp taps are credited to the source that brought the visitor that day." />
          <BarList
            valueLabel="Visitors"
            rows={a.sources.map((s) => ({
              key: s.source,
              label: s.source,
              value: s.visitors,
              extra: (
                <span className="text-footnote text-fg-3" title={`${s.enquiries} enquiries, ${s.whatsapp} WhatsApp taps`}>
                  {s.enquiries ? `${s.enquiries} enq.` : ""}
                  {s.enquiries && s.whatsapp ? " · " : ""}
                  {s.whatsapp ? `${s.whatsapp} WA` : ""}
                </span>
              ),
            }))}
          />
        </Card>

        <Card>
          <CardHeader title="From visit to enquiry" description="How far visitors get. Each step’s percentage is of the step before." />
          <Funnel
            steps={[
              { label: "Visited the website", value: a.funnel.visitors, note: "Everyone, on any page." },
              { label: "Looked at a stay", value: a.funnel.stay, note: "Opened at least one property page." },
              { label: "Enquired or tapped WhatsApp", value: a.funnel.acted, note: "Reached out — the moment that becomes a booking." },
            ]}
          />
          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-line pt-4">
            <Mini label="Left after one page" value={`${bounce}%`} sub={bounceBefore ? `${bounceBefore}% before` : "—"} />
            <Mini label="Enquiries confirmed" value={`${pct(now.confirmed, now.enquiries)}%`} sub={`${fmt(now.confirmed)} of ${fmt(now.enquiries)}`} />
          </div>
        </Card>
      </div>

      <Card className="mt-4 lg:mt-5" padded={false}>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardHeader title="Stays" description="Which properties people look at — and which ones turn that attention into enquiries." className="mb-3" />
        </div>
        {liveStays.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-callout">
              <thead>
                <tr className="border-y border-line text-left text-footnote font-semibold text-fg-3">
                  <th className="px-5 py-2.5 font-semibold sm:px-6">Property</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Visitors</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Views</th>
                  <th className="px-3 py-2.5 text-right font-semibold">WhatsApp</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Enquiries</th>
                  <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Converts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {liveStays.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-fill">
                    <td className="px-5 py-3 sm:px-6">
                      <a href={`/dashboard/properties/${s.id}`} className="flex items-center gap-2 font-medium text-fg hover:underline">
                        <span className={`size-1.5 shrink-0 rounded-full ${s.live ? "bg-pos" : "bg-fg-4"}`} />
                        {s.name}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg">{fmt(s.visitors)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg-2">{fmt(s.views)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-fg-2">{fmt(s.whatsapp)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-fg">{fmt(s.enquiries)}</td>
                    <td className="px-5 py-3 text-right tabular-nums sm:px-6">
                      {s.visitors ? <span className="font-semibold text-fg">{pct(s.enquiries, s.visitors)}%</span> : <span className="text-fg-4">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 pb-8 pt-2 text-center text-subhead text-fg-3">No live properties yet.</p>
        )}
        <div className="h-3" />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <Card>
          <CardHeader title="Most viewed pages" />
          <BarList
            valueLabel="Views"
            rows={a.pages.map((p) => ({
              key: p.path,
              label: <span className="font-mono text-subhead">{p.path}</span>,
              value: p.views,
              extra: p.secs ? <span className="text-footnote text-fg-3">{duration(p.secs)} avg</span> : undefined,
            }))}
          />
        </Card>
        <div className="space-y-4 lg:space-y-5">
          <Card>
            <CardHeader title="Devices" description="Phones, mostly — which is why the site is built for them first." />
            <DeviceSplit devices={a.devices} />
          </Card>
          <Card>
            <CardHeader title="Destinations people explore" />
            <BarList valueLabel="Visitors" rows={a.destinations.map((d) => ({ key: d.label, label: d.label, value: d.visitors }))} empty="No destination pages visited yet." />
          </Card>
        </div>
      </div>

      <Card className="mt-4 lg:mt-5">
        <CardHeader title="When guests browse" description="Page views by day and hour, India time. Darker is busier." />
        <Heatmap cells={a.heat} />
      </Card>
    </>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[16px] bg-fill p-3.5">
      <p className="text-footnote font-medium text-fg-3">{label}</p>
      <p className="mt-1 text-title2 font-bold tracking-[-0.02em] text-fg">{value}</p>
      <p className="mt-0.5 text-footnote tabular-nums text-fg-3">{sub}</p>
    </div>
  );
}
