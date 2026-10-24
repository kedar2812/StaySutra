"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Select, Switch } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { Sheet, ConfirmDialog } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { CHANNELS, SOURCE_COLOR, type ChannelKey } from "@/lib/calendar/channels";
import { addDays, nightsBetween, shortDay } from "@/lib/calendar/dates";
import { cn } from "@/lib/utils";
import { addBlock, deleteFeed, removeBlock, rotateExportLink, saveFeed, syncNow } from "./actions";

export interface BoardBlock {
  id: string;
  source: "FEED" | "MANUAL" | "ENQUIRY";
  start: string;
  end: string;
  summary: string | null;
  note: string | null;
  channel: string | null;
  channelLabel: string | null;
  enquiry: { id: string; name: string; refCode: string } | null;
}

export interface BoardFeed {
  id: string;
  channel: string;
  label: string;
  importUrl: string | null;
  listingUrl: string | null;
  isActive: boolean;
  exportUrl: string;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastEventCount: number | null;
  lastExportedAt: string | null;
}

const colorOf = (b: BoardBlock) =>
  b.source === "FEED" ? (CHANNELS[(b.channel ?? "OTHER") as ChannelKey]?.color ?? CHANNELS.OTHER.color) : SOURCE_COLOR[b.source];

const labelOf = (b: BoardBlock) =>
  b.source === "FEED" ? (b.channelLabel ?? "Platform") : b.source === "ENQUIRY" ? (b.enquiry?.name ?? "StaySutra") : (b.note || "Blocked");

/**
 * The calendar planner.
 *
 * Every platform's bookings on one strip of months, each in its platform's
 * colour, so a host sees at a glance which nights Airbnb sold, which they held
 * themselves, and which StaySutra confirmed. Tap a free night, tap the last
 * night, and the action bar rises to block them. Tap a booking for detail.
 */
export function CalendarBoard({
  properties,
  property,
  blocks,
  feeds,
  today,
  canEdit,
}: {
  properties: { id: string; name: string }[];
  property: { id: string; name: string; masterUrl: string };
  blocks: BoardBlock[];
  feeds: BoardFeed[];
  today: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dir, setDir] = useState(0);
  const [sel, setSel] = useState<{ a: string; b: string | null } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState<BoardBlock | null>(null);
  const [feedSheet, setFeedSheet] = useState<BoardFeed | "new" | null>(null);
  const [syncing, setSyncing] = useState(false);

  // One owner per night for drawing; overlaps are surfaced separately as conflicts.
  const nightOwner = useMemo(() => {
    const rank = { ENQUIRY: 0, MANUAL: 1, FEED: 2 } as const;
    const map = new Map<string, BoardBlock>();
    for (const b of [...blocks].sort((x, y) => rank[y.source] - rank[x.source])) {
      for (let d = b.start; d < b.end; d = addDays(d, 1)) map.set(d, b);
    }
    return map;
  }, [blocks]);

  const conflicts = useMemo(() => {
    const out: { a: BoardBlock; b: BoardBlock; from: string; to: string }[] = [];
    for (let i = 0; i < blocks.length; i++)
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i]!, b = blocks[j]!;
        const sameOrigin = a.source === b.source && a.channel === b.channel && a.source !== "ENQUIRY";
        if (sameOrigin) continue;
        const from = a.start > b.start ? a.start : b.start;
        const to = a.end < b.end ? a.end : b.end;
        if (from < to && to > today) out.push({ a, b, from, to });
      }
    return out;
  }, [blocks, today]);

  const range = sel ? (sel.b ? [sel.a, sel.b].sort() : [sel.a, sel.a]) : null;
  const preview = sel && !sel.b && hover ? [sel.a, hover].sort() : null;
  const selNights = range ? nightsBetween(range[0]!, range[1]!) + 1 : 0;

  const pick = (day: string) => {
    if (!canEdit || day < today) return;
    const owner = nightOwner.get(day);
    if (owner && !sel) return setDetail(owner);
    if (owner) return;
    if (!sel || sel.b) setSel({ a: day, b: null });
    else setSel({ a: sel.a, b: day });
  };

  const commit = () => {
    if (!range) return;
    const [start, last] = range as [string, string];
    startTransition(async () => {
      const res = await addBlock({ propertyId: property.id, start, end: addDays(last, 1), note });
      if (!res.ok) return toast({ kind: "error", title: res.error });
      setSel(null);
      setNote("");
      toast({
        title: `Blocked ${selNights} ${selNights === 1 ? "night" : "nights"}`,
        body: res.data.overlaps ? "Some of those nights were already booked elsewhere." : "Every connected platform picks this up on its next check.",
        undo: async () => {
          await removeBlock(res.data.id);
          router.refresh();
        },
      });
      router.refresh();
    });
  };

  const sync = async () => {
    setSyncing(true);
    const res = await syncNow(property.id);
    setSyncing(false);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    const failed = res.data.filter((r) => !r.ok);
    toast(
      failed.length
        ? { kind: "error", title: "Some calendars could not be read", body: failed.map((f) => (f.ok ? "" : f.error)).join(" · ") }
        : { title: "Calendars are up to date", body: `${res.data.reduce((n, r) => n + (r.ok ? r.events : 0), 0)} bookings checked` },
    );
    router.refresh();
  };

  const go = (step: number) => {
    setDir(step);
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y!, m! - 1 + step, 1)).toISOString().slice(0, 7));
  };

  const months = [month, (() => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 7); })()];
  const connected = feeds.filter((f) => f.importUrl);
  const lastSync = connected.map((f) => f.lastSyncedAt).filter(Boolean).sort().at(-1);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          connected.length
            ? `In step with ${connected.map((f) => f.label).join(", ")}${lastSync ? ` · checked ${ago(lastSync)}` : ""}. Syncs on its own every 15 minutes.`
            : "Connect Airbnb and the other platforms so a night sold anywhere is blocked everywhere."
        }
        actions={
          <>
            {properties.length > 1 && (
              <Select value={property.id} onChange={(e) => router.push(`/dashboard/calendar?p=${e.target.value}`)} className="w-56">
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            )}
            {canEdit && connected.length > 0 && (
              <Button onClick={sync} loading={syncing} icon="sync">Sync now</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <Card className="min-w-0 overflow-hidden" padded={false}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3 sm:px-5">
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={() => go(-1)} className="grid size-9 place-items-center rounded-[10px] text-text-mid hover:bg-white/[0.06] active:scale-90">
                <AdminIcon name="chevronLeft" size={18} />
              </button>
              <button type="button" aria-label="Next month" onClick={() => go(1)} className="grid size-9 place-items-center rounded-[10px] text-text-mid hover:bg-white/[0.06] active:scale-90">
                <AdminIcon name="chevronRight" size={18} />
              </button>
              <button type="button" onClick={() => { setDir(month > today.slice(0, 7) ? -1 : 1); setMonth(today.slice(0, 7)); }} className="ml-1 h-8 rounded-[9px] px-3 text-[0.8125rem] font-medium text-text-mid ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.05]">
                Today
              </button>
            </div>
            <Legend feeds={feeds} />
          </div>

          <div className="overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={dir}>
              <motion.div
                key={month}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: reduced ? 0 : d * 48, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: reduced ? 0 : d * -48, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                className="grid 2xl:grid-cols-2 2xl:divide-x 2xl:divide-white/[0.05]"
              >
                {months.map((m, i) => (
                  <MonthGrid
                    key={m}
                    month={m}
                    today={today}
                    owner={nightOwner}
                    range={range as [string, string] | null}
                    preview={preview as [string, string] | null}
                    onPick={pick}
                    onHover={setHover}
                    className={i === 1 ? "hidden 2xl:block" : undefined}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>

        <div className="space-y-4">
          {conflicts.length > 0 && (
            <Card className="ring-err/30 bg-err/[0.06]">
              <CardHeader title={`Possible double booking${conflicts.length > 1 ? "s" : ""}`} description="The same nights are taken on more than one calendar. Check with the guests, then cancel one." />
              <ul className="space-y-2">
                {conflicts.slice(0, 5).map((c, i) => (
                  <li key={i} className="rounded-[12px] bg-black/20 p-3 text-[0.8125rem]">
                    <p className="font-medium text-text-hi">{shortDay(c.from)} → {shortDay(c.to)}</p>
                    <p className="mt-0.5 text-text-low">{labelOf(c.a)} and {labelOf(c.b)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Connected platforms"
              description="Each one sends us its bookings and takes ours back."
              action={canEdit ? <Button size="sm" variant="primary" icon="plus" onClick={() => setFeedSheet("new")}>Connect</Button> : undefined}
            />
            {feeds.length ? (
              <ul className="-mx-2 space-y-1">
                {feeds.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => canEdit && setFeedSheet(f)}
                      className="flex w-full items-center gap-3 rounded-[12px] p-2 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-[11px] text-[0.8125rem] font-bold text-ink-900" style={{ background: CHANNELS[f.channel as ChannelKey]?.color }}>
                        {f.label.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[0.9375rem] text-text-hi">
                          {f.label}
                          {!f.isActive && <Badge>Paused</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.8125rem] text-text-low">
                          {!f.importUrl
                            ? "Needs its calendar link"
                            : f.lastStatus === "ERROR"
                              ? f.lastError
                              : f.lastSyncedAt
                                ? `${f.lastEventCount ?? 0} bookings · ${ago(f.lastSyncedAt)}`
                                : "Waiting for first sync"}
                        </span>
                      </span>
                      <StatusDot feed={f} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.875rem] text-text-low">Nothing connected yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="StaySutra calendar link" description="Everything blocked on this property, for any platform not listed above." />
            <CopyField value={property.masterUrl} />
          </Card>
        </div>
      </div>

      {/* Selection bar — rises from the bottom while nights are selected. */}
      <AnimatePresence>
        {sel && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="admin-glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto flex max-w-[640px] flex-col gap-3 rounded-[20px] p-3 sm:flex-row sm:items-center lg:bottom-6 lg:left-[calc(var(--sidebar,248px)+1rem)]"
          >
            <div className="px-2 sm:min-w-[11rem]">
              <p className="text-[0.9375rem] font-semibold text-text-hi">
                {sel.b ? `${selNights} ${selNights === 1 ? "night" : "nights"}` : "Pick the last night"}
              </p>
              <p className="text-[0.8125rem] text-text-low">
                {range && sel.b ? `${shortDay(range[0]!)} → out ${shortDay(addDays(range[1]!, 1))}` : shortDay(sel.a)}
              </p>
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. owner’s family" className="h-10" maxLength={200} />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSel(null)}>Cancel</Button>
              <Button variant="primary" onClick={commit} loading={pending} disabled={!sel.b && !sel.a}>
                Block
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BlockSheet block={detail} onClose={() => setDetail(null)} feeds={feeds} canEdit={canEdit} onRemoved={() => router.refresh()} />
      <FeedSheet value={feedSheet} propertyId={property.id} onClose={() => setFeedSheet(null)} onSaved={() => router.refresh()} />
    </>
  );
}

/* — Month ———————————————————————————————————————————————————— */

function MonthGrid({
  month,
  today,
  owner,
  range,
  preview,
  onPick,
  onHover,
  className,
}: {
  month: string;
  today: string;
  owner: Map<string, BoardBlock>;
  range: [string, string] | null;
  preview: [string, string] | null;
  onPick: (d: string) => void;
  onHover: (d: string | null) => void;
  className?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y!, m! - 1, 1)).getUTCDay() + 6) % 7; // Monday first — the host's week
  const days = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, 1)));

  return (
    <div className={cn("p-3 sm:p-5", className)} onPointerLeave={() => onHover(null)}>
      <p className="mb-3 px-1 text-[1rem] font-semibold tracking-[-0.01em] text-text-hi">{label}</p>
      <div className="grid grid-cols-7 pb-2 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-text-dim">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {Array.from({ length: lead }, (_, i) => <span key={`p${i}`} />)}
        {days.map((day) => {
          const b = owner.get(day);
          const prev = owner.get(addDays(day, -1));
          const next = owner.get(addDays(day, 1));
          const col = (lead + Number(day.slice(8)) - 1) % 7;
          const startsRun = !prev || prev.id !== b?.id || col === 0;
          const endsRun = !next || next.id !== b?.id || col === 6;
          const past = day < today;
          const inSel = range ? day >= range[0] && day <= range[1] : preview ? day >= preview[0] && day <= preview[1] : false;
          const color = b ? colorOf(b) : undefined;
          const weekend = col >= 4 && col <= 5;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              onPointerEnter={() => onHover(day)}
              aria-label={`${shortDay(day)}${b ? `, ${labelOf(b)}` : ", free"}`}
              className={cn(
                "group relative h-14 text-left transition-transform duration-100 active:scale-[0.96] sm:h-[4.5rem]",
                past && "opacity-45",
              )}
            >
              {b && (
                <span
                  className={cn("absolute inset-y-1 left-0 right-0 sm:inset-y-1.5", startsRun && "left-1 rounded-l-[10px]", endsRun && "right-1 rounded-r-[10px]")}
                  style={{
                    background: b.source === "MANUAL"
                      ? `repeating-linear-gradient(135deg, ${color}33 0 6px, ${color}1f 6px 12px)`
                      : `${color}2e`,
                    // Edges only where the run starts and ends, so a stay reads as one bar.
                    boxShadow: [
                      `inset 0 1px 0 ${color}55`,
                      `inset 0 -1px 0 ${color}55`,
                      startsRun ? `inset 1px 0 0 ${color}55` : null,
                      endsRun ? `inset -1px 0 0 ${color}55` : null,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  }}
                />
              )}
              {inSel && !b && <span className="absolute inset-1 rounded-[10px] bg-gold-500/25 ring-1 ring-inset ring-gold-500/70" />}
              {!b && !inSel && !past && <span className="absolute inset-1 rounded-[10px] transition-colors group-hover:bg-white/[0.05]" />}
              <span
                className={cn(
                  "relative ml-2 mt-1.5 inline-grid size-6 place-items-center rounded-full text-[0.8125rem] tabular-nums sm:ml-2.5 sm:mt-2",
                  day === today ? "bg-gold-500 font-semibold text-gold-ink" : b ? "text-text-hi" : weekend ? "text-text-mid" : "text-text-low",
                )}
              >
                {Number(day.slice(8))}
              </span>
              {b && startsRun && (
                <span className="relative ml-2.5 mt-0.5 hidden truncate pr-2 text-[0.6875rem] font-medium sm:block" style={{ color }}>
                  {labelOf(b)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ feeds }: { feeds: BoardFeed[] }) {
  const items = [
    ...feeds.filter((f) => f.importUrl).map((f) => ({ label: f.label, color: CHANNELS[f.channel as ChannelKey]?.color ?? CHANNELS.OTHER.color })),
    { label: "StaySutra", color: SOURCE_COLOR.ENQUIRY },
    { label: "Blocked", color: SOURCE_COLOR.MANUAL },
  ];
  return (
    <ul className="no-scrollbar flex min-w-0 items-center gap-3 overflow-x-auto text-[0.75rem] text-text-low">
      {items.map((i) => (
        <li key={i.label} className="flex shrink-0 items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function StatusDot({ feed }: { feed: BoardFeed }) {
  const tone = !feed.importUrl ? "bg-warn" : feed.lastStatus === "ERROR" ? "bg-err" : feed.lastStatus === "OK" ? "bg-ok" : "bg-white/30";
  return <span className={cn("size-2 shrink-0 rounded-full", tone)} />;
}

/* — Block detail ——————————————————————————————————————————— */

function BlockSheet({
  block,
  onClose,
  feeds,
  canEdit,
  onRemoved,
}: {
  block: BoardBlock | null;
  onClose: () => void;
  feeds: BoardFeed[];
  canEdit: boolean;
  onRemoved: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const b = block;
  const feed = b?.channel ? feeds.find((f) => f.label === b.channelLabel) : null;

  return (
    <Sheet
      open={Boolean(b)}
      onClose={onClose}
      title={b ? labelOf(b) : ""}
      subtitle={b ? `${shortDay(b.start)} → ${shortDay(b.end)} · ${nightsBetween(b.start, b.end)} nights` : ""}
      width={440}
      footer={
        b && canEdit && b.source !== "FEED" ? (
          <Button
            variant="danger"
            icon="trash"
            loading={busy}
            className="w-full"
            onClick={async () => {
              setBusy(true);
              const res = await removeBlock(b.id);
              setBusy(false);
              if (!res.ok) return toast({ kind: "error", title: res.error });
              onClose();
              onRemoved();
              toast({
                title: "Nights reopened",
                undo: async () => {
                  await addBlock(res.data);
                  router.refresh();
                },
              });
            }}
          >
            Reopen these nights
          </Button>
        ) : undefined
      }
    >
      {b && (
        <dl className="space-y-4 text-[0.9375rem]">
          <Row label="Source">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-[3px]" style={{ background: colorOf(b) }} />
              {b.source === "FEED" ? `${b.channelLabel} booking` : b.source === "ENQUIRY" ? "Confirmed through StaySutra" : "Blocked in the dashboard"}
            </span>
          </Row>
          {b.summary && <Row label="Platform says">{b.summary}</Row>}
          {b.note && <Row label="Note">{b.note}</Row>}
          {b.enquiry && (
            <Row label="Guest">
              <a href={`/dashboard/enquiries?open=${b.enquiry.id}`} className="text-gold-400 hover:underline">
                {b.enquiry.name} · {b.enquiry.refCode}
              </a>
            </Row>
          )}
          {b.source === "FEED" && (
            <p className="rounded-[12px] bg-white/[0.04] p-3.5 text-[0.8125rem] leading-relaxed text-text-low">
              This comes from {b.channelLabel}. To change or cancel it, do it there — this calendar updates on the next sync.
              {feed?.listingUrl && (
                <a href={feed.listingUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 font-medium text-text-hi hover:underline">
                  Open the {b.channelLabel} listing <AdminIcon name="external" size={14} />
                </a>
              )}
            </p>
          )}
        </dl>
      )}
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3">
      <dt className="text-text-low">{label}</dt>
      <dd className="min-w-0 text-text-hi">{children}</dd>
    </div>
  );
}

/* — Connect / edit a platform —————————————————————————————— */

function FeedSheet({
  value,
  propertyId,
  onClose,
  onSaved,
}: {
  value: BoardFeed | "new" | null;
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = value && value !== "new" ? value : null;
  return (
    <Sheet open={Boolean(value)} onClose={onClose} title={editing ? editing.label : "Connect a platform"} subtitle={editing ? "Calendar sync" : "Two links, one in each direction"}>
      {value && <FeedForm key={editing?.id ?? "new"} feed={editing} propertyId={propertyId} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function FeedForm({ feed, propertyId, onClose, onSaved }: { feed: BoardFeed | null; propertyId: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [channel, setChannel] = useState<ChannelKey>((feed?.channel as ChannelKey) ?? "AIRBNB");
  const [label, setLabel] = useState(feed?.label ?? CHANNELS.AIRBNB.label);
  const [importUrl, setImportUrl] = useState(feed?.importUrl ?? "");
  const [listingUrl, setListingUrl] = useState(feed?.listingUrl ?? "");
  const [active, setActive] = useState(feed?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedExport, setSavedExport] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState(feed?.exportUrl ?? "");
  const [confirm, setConfirm] = useState(false);
  const info = CHANNELS[channel];

  const save = async () => {
    setBusy(true);
    const res = await saveFeed({ id: feed?.id, propertyId, channel, label, importUrl, listingUrl, isActive: active });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      return toast({ kind: "error", title: res.error });
    }
    setErrors({});
    onSaved();
    const s = res.data.sync;
    if (s && !s.ok) toast({ kind: "error", title: `Saved, but ${label} could not be read`, body: s.error });
    else toast({ title: `${label} ${feed ? "updated" : "connected"}`, body: s?.ok ? `${s.events} bookings found` : undefined });
    if (!feed) setSavedExport(res.data.exportUrl);
    else onClose();
  };

  if (savedExport) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-[14px] bg-ok/10 p-4 ring-1 ring-inset ring-ok/25">
          <AdminIcon name="check" size={18} className="mt-0.5 text-[#6fe0ac]" />
          <div>
            <p className="font-medium text-text-hi">{label} is connected</p>
            <p className="mt-1 text-[0.875rem] text-text-low">Its bookings now block nights here. One step left, so it works the other way too.</p>
          </div>
        </div>
        <Step n={2} title={`StaySutra → ${info.label}`} body={info.importHelp}>
          <CopyField value={savedExport} />
        </Step>
        <Button variant="primary" className="w-full" onClick={onClose}>Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!feed && (
        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-text-mid">Platform</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CHANNELS) as ChannelKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setChannel(k);
                  setLabel(CHANNELS[k].label);
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium ring-1 ring-inset transition-colors active:scale-95",
                  channel === k ? "bg-white/[0.1] text-text-hi ring-white/25" : "text-text-low ring-white/[0.08] hover:text-text-mid",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: CHANNELS[k].color }} />
                {CHANNELS[k].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Step n={1} title={`${info.label} → StaySutra`} body={info.exportHelp}>
        <Field label={`${info.label}’s calendar link (.ics)`} error={errors.importUrl}>
          <Input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/….ics" inputMode="url" />
        </Field>
      </Step>

      {feed && (
        <Step n={2} title={`StaySutra → ${info.label}`} body={info.importHelp}>
          <CopyField value={exportUrl} />
          <div className="mt-2 flex items-center justify-between text-[0.8125rem]">
            <span className={feed.lastExportedAt ? "text-[#6fe0ac]" : "text-text-low"}>
              {feed.lastExportedAt ? `${info.label} last read it ${ago(feed.lastExportedAt)}` : `${info.label} has not read it yet`}
            </span>
            <button
              type="button"
              className="text-text-low underline-offset-4 hover:text-text-hi hover:underline"
              onClick={async () => {
                const res = await rotateExportLink(feed.id);
                if (!res.ok) return toast({ kind: "error", title: res.error });
                setExportUrl(exportUrl.replace(/[^/]+\.ics$/, `${res.data}.ics`));
                toast({ title: "New link issued", body: `Paste it into ${info.label} — the old one has stopped working.` });
                onSaved();
              }}
            >
              Issue a new link
            </button>
          </div>
        </Step>
      )}

      <div className="space-y-4 border-t border-white/[0.06] pt-5">
        <Field label="Name" error={errors.label}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Listing page (optional)" hint="Shown to guests as “Also listed on…” — real proof the stay exists." error={errors.listingUrl}>
          <Input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://www.airbnb.co.uk/rooms/…" inputMode="url" />
        </Field>
        {feed && <Switch checked={active} onChange={setActive} label="Syncing" description="Pause to ignore this platform without losing its links." />}
      </div>

      <div className="flex gap-2 pt-1">
        {feed && <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>Disconnect</Button>}
        <Button variant="primary" className="flex-1" onClick={save} loading={busy}>{feed ? "Save" : "Connect"}</Button>
      </div>

      {feed && (
        <ConfirmDialog
          open={confirm}
          title={`Disconnect ${feed.label}?`}
          body={`Its bookings disappear from this calendar, and ${feed.label} stops receiving StaySutra’s. You can connect it again any time.`}
          confirmLabel="Disconnect"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            const res = await deleteFeed(feed.id);
            setConfirm(false);
            if (!res.ok) return toast({ kind: "error", title: res.error });
            toast({ title: `${feed.label} disconnected` });
            onClose();
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[0.75rem] font-semibold text-text-hi">{n}</span>
        <div>
          <p className="text-[0.9375rem] font-medium text-text-hi">{title}</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-text-low">{body}</p>
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-[11px] bg-[#060c17] p-1 pl-3.5 ring-1 ring-inset ring-white/[0.09]">
      <span className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-text-mid">{value}</span>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-3 text-[0.8125rem] font-medium transition-colors active:scale-95",
          copied ? "bg-ok/20 text-[#6fe0ac]" : "bg-white/[0.08] text-text-hi hover:bg-white/[0.12]",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? "y" : "n"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}>
            <AdminIcon name={copied ? "check" : "copy"} size={14} />
          </motion.span>
        </AnimatePresence>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
