"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge, Button, Card, CardHeader, Field, IconButton, Input, PageHeader, Select, StatusDot, Switch } from "@/components/admin/ui";
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
  b.source === "FEED" ? (b.channelLabel ?? "Platform") : b.source === "ENQUIRY" ? (b.enquiry?.name ?? "StaySutra") : b.note || "Blocked";

const mix = (c: string, pct: number) => `color-mix(in oklab, ${c} ${pct}%, transparent)`;

/**
 * The calendar planner.
 *
 * Every platform's bookings on one month, each in its platform's colour, so
 * a host sees at a glance which nights Airbnb sold, which they held
 * themselves (striped), and which StaySutra confirmed. Tap a free night, tap
 * the last night, and the bar rises to block them. Tap a booking for detail.
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
  const [switching, startSwitch] = useTransition();
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
        const a = blocks[i]!,
          b = blocks[j]!;
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
    const owner = nightOwner.get(day);
    if (owner && !sel) return setDetail(owner);
    if (!canEdit || day < today || owner) return;
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

  const months = [
    month,
    (() => {
      const [y, m] = month.split("-").map(Number);
      return new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 7);
    })(),
  ];
  const connected = feeds.filter((f) => f.importUrl);
  const lastSync = connected.map((f) => f.lastSyncedAt).filter(Boolean).sort().at(-1);
  const isThisMonth = month === today.slice(0, 7);
  const monthLabel = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y!, mm! - 1, 1)));
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          connected.length
            ? `In step with ${connected.map((f) => f.label).join(", ")}${lastSync ? `, checked ${ago(lastSync)}` : ""}. Syncs on its own every 15 minutes.`
            : "Connect Airbnb and the other platforms so a night sold anywhere is blocked everywhere."
        }
        actions={
          <>
            {properties.length > 1 && (
              <div className="w-60">
                <Select
                  value={property.id}
                  aria-label="Property"
                  onChange={(e) => {
                    const id = e.target.value;
                    startSwitch(() => router.push(`/dashboard/calendar?p=${id}`));
                  }}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {canEdit && connected.length > 0 && (
              <Button variant="plain" onClick={sync} loading={syncing} icon="sync">
                Sync now
              </Button>
            )}
          </>
        }
      />

      <div className={cn("grid grid-cols-1 gap-4 transition-opacity xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-5", switching && "pointer-events-none opacity-50")}>
        <Card className="min-w-0 overflow-hidden" padded={false}>
          <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
            <div className="min-w-0">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.h2
                  key={month}
                  custom={dir}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: dir * 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: dir * -10 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="text-title2 text-fg"
                >
                  {monthLabel(month)}
                  <span className="hidden text-fg-3 2xl:inline"> — {monthLabel(months[1]!).split(" ")[0]}</span>
                </motion.h2>
              </AnimatePresence>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton icon="chevronLeft" label="Previous month" onClick={() => go(-1)} />
              <button
                type="button"
                disabled={isThisMonth}
                onClick={() => {
                  setDir(month > today.slice(0, 7) ? -1 : 1);
                  setMonth(today.slice(0, 7));
                }}
                className="h-8 rounded-full bg-fill px-3.5 text-subhead font-semibold text-fg transition-[background-color,opacity] hover:bg-fill-2 active:scale-95 disabled:opacity-40"
              >
                Today
              </button>
              <IconButton icon="chevronRight" label="Next month" onClick={() => go(1)} />
            </div>
          </div>

          <div className="overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={dir}>
              <motion.div
                key={month}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: reduced ? 0 : d * 60, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: reduced ? 0 : d * -60, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", bounce: 0, duration: 0.38 }}
                className="grid 2xl:grid-cols-2 2xl:divide-x 2xl:divide-line"
              >
                {months.map((m, i) => (
                  <MonthGrid
                    key={m}
                    month={m}
                    label={i === 1 ? monthLabel(m) : null}
                    today={today}
                    owner={nightOwner}
                    range={range as [string, string] | null}
                    preview={preview as [string, string] | null}
                    onPick={pick}
                    onHover={setHover}
                    selecting={Boolean(sel && !sel.b)}
                    className={i === 1 ? "hidden 2xl:block" : undefined}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <Legend feeds={feeds} />
            {canEdit && <p className="text-footnote text-fg-3">Tap a free night, then the last night, to block them.</p>}
          </div>
        </Card>

        <div className="space-y-4">
          <AnimatePresence>
            {conflicts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-[20px] bg-neg/10 p-5 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--d-neg)_30%,transparent)]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neg text-white">
                      <AdminIcon name="alert" size={16} strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-headline text-fg">Possible double booking{conflicts.length > 1 ? "s" : ""}</h2>
                      <p className="mt-0.5 text-subhead text-fg-2">The same nights are taken on more than one calendar. Check with the guests, then cancel one.</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {conflicts.slice(0, 5).map((c, i) => (
                      <li key={i} className="rounded-[12px] bg-panel/70 px-3.5 py-2.5 text-subhead">
                        <p className="font-semibold tabular-nums text-fg">
                          {shortDay(c.from)} → {shortDay(c.to)}
                        </p>
                        <p className="mt-0.5 text-fg-3">
                          {labelOf(c.a)} and {labelOf(c.b)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader
              title="Connected platforms"
              description="Each sends us its bookings and takes ours back."
              action={
                canEdit ? (
                  <Button size="sm" variant="tinted" icon="plus" onClick={() => setFeedSheet("new")}>
                    Connect
                  </Button>
                ) : undefined
              }
            />
            {feeds.length ? (
              <ul className="-mx-2 space-y-0.5">
                {feeds.map((f) => {
                  const tone = !f.importUrl ? "warn" : f.lastStatus === "ERROR" ? "err" : f.lastStatus === "OK" ? "ok" : "neutral";
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => canEdit && setFeedSheet(f)}
                        className="flex w-full items-center gap-3 rounded-[14px] p-2 text-left transition-colors hover:bg-fill"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] text-callout font-bold text-white" style={{ background: CHANNELS[f.channel as ChannelKey]?.color }}>
                          {f.label.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-callout font-semibold text-fg">
                            {f.label}
                            {!f.isActive && <Badge>Paused</Badge>}
                          </span>
                          <span className={cn("mt-0.5 block truncate text-subhead", tone === "err" ? "text-neg-text" : "text-fg-3")}>
                            {!f.importUrl ? "Needs its calendar link" : f.lastStatus === "ERROR" ? f.lastError : f.lastSyncedAt ? `${f.lastEventCount ?? 0} bookings · ${ago(f.lastSyncedAt)}` : "Waiting for first sync"}
                          </span>
                        </span>
                        <StatusDot tone={tone} pulse={tone === "err"} />
                        {canEdit && <AdminIcon name="chevronRight" size={16} className="text-fg-4" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-[14px] bg-fill p-4 text-subhead text-fg-3">Nothing connected yet. Start with Airbnb — it takes two copied links.</p>
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
            initial={reduced ? { opacity: 0 } : { y: 48, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 48, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            className="d-glass-float fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-50 mx-auto flex max-w-[44rem] flex-col gap-2.5 rounded-[24px] p-3 sm:flex-row sm:items-center lg:bottom-6 lg:left-[calc(var(--sb,256px)+1.5rem)] lg:right-6"
          >
            <div className="flex items-center gap-3 px-1.5 sm:min-w-[12rem]">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg">
                <AdminIcon name="calendar" size={18} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-callout font-semibold text-fg">{sel.b ? `${selNights} ${selNights === 1 ? "night" : "nights"}` : "Now the last night"}</p>
                <p className="text-subhead tabular-nums text-fg-3">{range && sel.b ? `${shortDay(range[0]!)} → out ${shortDay(addDays(range[1]!, 1))}` : `From ${shortDay(sel.a)}`}</p>
              </div>
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note — e.g. owner’s family" maxLength={200} aria-label="Note" />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSel(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={commit} loading={pending} className="flex-1 sm:flex-none">
                Block {sel.b ? selNights : 1}
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
  label,
  today,
  owner,
  range,
  preview,
  onPick,
  onHover,
  selecting,
  className,
}: {
  month: string;
  label: string | null;
  today: string;
  owner: Map<string, BoardBlock>;
  range: [string, string] | null;
  preview: [string, string] | null;
  onPick: (d: string) => void;
  onHover: (d: string | null) => void;
  selecting: boolean;
  className?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y!, m! - 1, 1)).getUTCDay() + 6) % 7; // Monday first — the host's week
  const days = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);

  return (
    <div className={cn("px-2 pb-3 pt-2 sm:px-4 sm:pb-4", className)} onPointerLeave={() => onHover(null)}>
      {label && <p className="px-1 pb-2 text-headline text-fg">{label}</p>}
      <div className="grid grid-cols-7 pb-1.5 text-center text-footnote font-semibold text-fg-3">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className={i >= 5 ? "text-fg-2" : undefined}>
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`p${i}`} />
        ))}
        {days.map((day) => {
          const b = owner.get(day);
          const prev = owner.get(addDays(day, -1));
          const next = owner.get(addDays(day, 1));
          const col = (lead + Number(day.slice(8)) - 1) % 7;
          const startsRun = !prev || prev.id !== b?.id || col === 0;
          const endsRun = !next || next.id !== b?.id || col === 6;
          const past = day < today;
          const inSel = range ? day >= range[0] && day <= range[1] : preview ? day >= preview[0] && day <= preview[1] : false;
          const selEdgeL = inSel && (range ? day === range[0] : preview ? day === preview[0] : false);
          const selEdgeR = inSel && (range ? day === range[1] : preview ? day === preview[1] : false);
          const color = b ? colorOf(b) : undefined;
          const isToday = day === today;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              onPointerEnter={() => onHover(day)}
              aria-label={`${shortDay(day)}${b ? `, ${labelOf(b)}` : ", free"}`}
              aria-pressed={inSel || undefined}
              className={cn("group relative h-[3.25rem] text-left outline-offset-[-2px] sm:h-[4.75rem]", past && !b && "opacity-40", past && b && "opacity-60", selecting && !b && !past && "cursor-cell")}
            >
              {b && (
                <span
                  className={cn("absolute inset-y-[3px] left-0 right-0 transition-[filter] group-hover:brightness-105", startsRun && "left-[3px] rounded-l-[10px]", endsRun && "right-[3px] rounded-r-[10px]")}
                  style={{
                    background: b.source === "MANUAL" ? `repeating-linear-gradient(135deg, ${mix(color!, 26)} 0 6px, ${mix(color!, 12)} 6px 12px)` : mix(color!, 20),
                    boxShadow: [`inset 0 1.5px 0 ${mix(color!, 70)}`, startsRun ? `inset 3px 0 0 ${color}` : null].filter(Boolean).join(", "),
                  }}
                />
              )}
              {inSel && !b && (
                <motion.span
                  layout
                  className={cn("absolute inset-y-[3px] left-0 right-0 bg-accent/25", selEdgeL && "left-[3px] rounded-l-[10px]", selEdgeR && "right-[3px] rounded-r-[10px]", (col === 0) && "rounded-l-[10px]", (col === 6) && "rounded-r-[10px]")}
                  transition={{ duration: 0.12 }}
                />
              )}
              {!b && !inSel && !past && <span className="absolute inset-[3px] rounded-[10px] transition-colors group-hover:bg-fill" />}
              <span
                className={cn(
                  "relative ml-1.5 mt-1.5 inline-grid size-7 place-items-center rounded-full text-subhead tabular-nums sm:ml-2.5 sm:mt-2",
                  isToday ? "bg-neg font-bold text-white" : selEdgeL || selEdgeR ? "bg-accent font-bold text-accent-fg" : b ? "font-semibold text-fg" : col >= 5 ? "text-fg" : "text-fg-2",
                )}
              >
                {Number(day.slice(8))}
              </span>
              {b && startsRun && (
                <span className="relative ml-2.5 mt-0.5 hidden truncate pr-2 text-caption font-semibold text-fg sm:block">{labelOf(b)}</span>
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
    ...feeds.filter((f) => f.importUrl).map((f) => ({ label: f.label, color: CHANNELS[f.channel as ChannelKey]?.color ?? CHANNELS.OTHER.color, striped: false })),
    { label: "StaySutra", color: SOURCE_COLOR.ENQUIRY, striped: false },
    { label: "Blocked by hand", color: SOURCE_COLOR.MANUAL, striped: true },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-footnote font-medium text-fg-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: i.striped ? `repeating-linear-gradient(135deg, ${i.color} 0 2px, ${mix(i.color, 45)} 2px 4px)` : i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
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
  const nights = b ? nightsBetween(b.start, b.end) : 0;

  return (
    <Sheet
      open={Boolean(b)}
      onClose={onClose}
      title={b ? labelOf(b) : ""}
      subtitle={b ? `${nights} ${nights === 1 ? "night" : "nights"}` : ""}
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
        <div className="space-y-4">
          <div className="flex items-stretch gap-2">
            <DateCard label="Check-in" day={b.start} />
            <span className="grid place-items-center text-fg-4">
              <AdminIcon name="arrowRight" size={16} />
            </span>
            <DateCard label="Check-out" day={b.end} />
          </div>
          <dl className="divide-y divide-line rounded-[16px] bg-fill px-4">
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
                <a href={`/dashboard/enquiries?open=${b.enquiry.id}`} className="font-semibold text-accent-text hover:underline">
                  {b.enquiry.name} · {b.enquiry.refCode}
                </a>
              </Row>
            )}
          </dl>
          {b.source === "FEED" && (
            <div className="rounded-[16px] bg-note/10 p-4 text-subhead leading-relaxed text-fg-2">
              This comes from {b.channelLabel}. To change or cancel it, do it there — this calendar updates on the next sync.
              {feed?.listingUrl && (
                <a href={feed.listingUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 font-semibold text-note-text hover:underline">
                  Open the {b.channelLabel} listing <AdminIcon name="arrowUpRight" size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function DateCard({ label, day }: { label: string; day: string }) {
  return (
    <div className="flex-1 rounded-[16px] bg-fill px-4 py-3">
      <p className="text-footnote font-medium text-fg-3">{label}</p>
      <p className="mt-0.5 text-headline tabular-nums text-fg">{shortDay(day)}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 text-callout">
      <dt className="shrink-0 text-fg-3">{label}</dt>
      <dd className="min-w-0 text-right text-fg">{children}</dd>
    </div>
  );
}

/* — Connect / edit a platform —————————————————————————————— */

function FeedSheet({ value, propertyId, onClose, onSaved }: { value: BoardFeed | "new" | null; propertyId: string; onClose: () => void; onSaved: () => void }) {
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col items-center px-4 pt-2 text-center">
          <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.55 }} className="grid size-14 place-items-center rounded-full bg-pos text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="d-check-draw" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
          <p className="mt-3 text-title2 text-fg">{label} is connected</p>
          <p className="mt-1 text-subhead text-fg-3">Its bookings now block nights here. One step left, so it works the other way too.</p>
        </div>
        <Step n={2} title={`StaySutra → ${info.label}`} body={info.importHelp}>
          <CopyField value={savedExport} />
        </Step>
        <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
          Done
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {!feed && (
        <div>
          <p className="mb-2 text-subhead font-medium text-fg-2">Platform</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CHANNELS) as ChannelKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={channel === k}
                onClick={() => {
                  setChannel(k);
                  setLabel(CHANNELS[k].label);
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3.5 text-subhead font-semibold transition-[background-color,box-shadow,transform] active:scale-95",
                  channel === k ? "bg-panel text-fg shadow-[inset_0_0_0_1.5px_var(--d-fg)]" : "bg-fill text-fg-2 hover:bg-fill-2",
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: CHANNELS[k].color }} />
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
          <div className="mt-2 flex items-center justify-between gap-3 text-subhead">
            <span className={cn("flex items-center gap-1.5", feed.lastExportedAt ? "text-pos-text" : "text-fg-3")}>
              {feed.lastExportedAt && <AdminIcon name="checkCircle" size={14} />}
              {feed.lastExportedAt ? `${info.label} last read it ${ago(feed.lastExportedAt)}` : `${info.label} has not read it yet`}
            </span>
            <button
              type="button"
              className="shrink-0 font-semibold text-accent-text hover:opacity-80"
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

      <div className="space-y-4 border-t border-line pt-5">
        <Field label="Name" error={errors.label}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Listing page (optional)" hint="Shown to guests as “Also listed on…” — real proof the stay exists." error={errors.listingUrl}>
          <Input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://www.airbnb.co.uk/rooms/…" inputMode="url" />
        </Field>
        {feed && <Switch checked={active} onChange={setActive} label="Syncing" description="Pause to ignore this platform without losing its links." />}
      </div>

      <div className="flex gap-2 pt-1">
        {feed && (
          <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>
            Disconnect
          </Button>
        )}
        <Button variant="primary" className="flex-1" onClick={save} loading={busy}>
          {feed ? "Save" : "Connect"}
        </Button>
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
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-fg text-footnote font-bold text-pane">{n}</span>
        <div>
          <p className="text-callout font-semibold text-fg">{title}</p>
          <p className="mt-0.5 text-subhead leading-relaxed text-fg-3">{body}</p>
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-fill p-1 pl-3.5">
      <span className="min-w-0 flex-1 truncate font-mono text-footnote text-fg-2" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
          } catch {
            return;
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-3 text-subhead font-semibold transition-colors active:scale-95",
          copied ? "bg-pos text-white" : "bg-panel text-fg shadow-tile hover:bg-fill-2",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={copied ? "y" : "n"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}>
            <AdminIcon name={copied ? "check" : "copy"} size={14} strokeWidth={copied ? 2.6 : 1.6} />
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
