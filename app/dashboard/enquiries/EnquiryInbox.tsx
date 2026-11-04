"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Segmented, Textarea, useMediaQuery, type Tone } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { Sheet } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { nightsBetween, shortDay } from "@/lib/calendar/dates";
import { cn } from "@/lib/utils";
import { addNote, archiveEnquiry, setEnquiryStatus } from "./actions";

type Status = "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED_LOST";

export interface InboxEnquiry {
  id: string;
  refCode: string;
  status: Status;
  source: string;
  name: string;
  phone: string;
  email: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number | null;
  message: string | null;
  property: { name: string; slug: string } | null;
  destination: string | null;
  pageUrl: string | null;
  utm: string | null;
  createdAt: string;
  held: boolean;
  notes: { id: string; body: string; author: string; createdAt: string }[];
}

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  NEW: { label: "New", tone: "info" },
  CONTACTED: { label: "Contacted", tone: "warn" },
  CONVERTED: { label: "Confirmed", tone: "ok" },
  CLOSED_LOST: { label: "Closed", tone: "neutral" },
};

/**
 * The inbox. Newest first, new ones unmistakable, and every enquiry one tap
 * from a WhatsApp message that already greets the guest by name and names the
 * stay. On a desktop it reads like Mail — the list on the left, the enquiry
 * on the right, ↑ and ↓ to move. On a phone the enquiry opens as a sheet.
 * Confirming an enquiry holds its nights on the calendar. DPR §10.4
 */
export function EnquiryInbox({ enquiries, initialStatus, initialOpen }: { enquiries: InboxEnquiry[]; initialStatus: Status | "ALL"; initialOpen: string | null }) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const [filter, setFilter] = useState<Status | "ALL">(initialStatus);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const list = useRef<HTMLUListElement>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: enquiries.length };
    for (const e of enquiries) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [enquiries]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return enquiries.filter(
      (e) => (filter === "ALL" || e.status === filter) && (!n || `${e.name} ${e.phone} ${e.email ?? ""} ${e.refCode} ${e.property?.name ?? ""}`.toLowerCase().includes(n)),
    );
  }, [enquiries, filter, q]);

  const open = enquiries.find((e) => e.id === openId) ?? null;

  // Desktop: something is always open when there is something to open.
  useEffect(() => {
    if (wide && !open && shown[0]) setOpenId(shown[0].id);
  }, [wide, open, shown]);

  // ↑ / ↓ move through the list; the open row stays in view.
  useEffect(() => {
    if (!wide) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "j" && e.key !== "k") return;
      e.preventDefault();
      const i = shown.findIndex((x) => x.id === openId);
      const next = shown[Math.max(0, Math.min(shown.length - 1, i + (e.key === "ArrowDown" || e.key === "j" ? 1 : -1)))];
      if (next) setOpenId(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide, shown, openId]);
  useEffect(() => {
    list.current?.querySelector(`[data-id="${openId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [openId]);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every question from the website, in one place."
        actions={
          <ButtonLink href={`/api/admin/enquiries.csv${filter !== "ALL" ? `?status=${filter}` : ""}`} variant="plain" icon="download">
            Export CSV
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          id="enquiry-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: counts.ALL ?? 0 },
            { value: "NEW", label: "New", count: counts.NEW ?? 0 },
            { value: "CONTACTED", label: "Contacted", count: counts.CONTACTED ?? 0 },
            { value: "CONVERTED", label: "Confirmed", count: counts.CONVERTED ?? 0 },
            { value: "CLOSED_LOST", label: "Closed", count: counts.CLOSED_LOST ?? 0 },
          ]}
        />
        <div className="md:w-80">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, reference…" leading={<AdminIcon name="search" size={15} />} aria-label="Search enquiries" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-5">
        <Card padded={false} className="overflow-hidden lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100svh-6.5rem)] lg:overflow-y-auto d-scroll">
          {shown.length ? (
            <ul ref={list} className="p-1.5">
              <AnimatePresence initial={false}>
                {shown.map((e) => {
                  const on = wide && e.id === openId;
                  return (
                    <motion.li key={e.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} data-id={e.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(e.id)}
                        aria-current={on || undefined}
                        className={cn("relative flex w-full items-start gap-3 rounded-[14px] px-3 py-3 text-left transition-colors", on ? "bg-accent/15" : "hover:bg-fill active:bg-fill-2")}
                      >
                        <span className="relative mt-0.5">
                          <Avatar name={e.name} size={38} />
                          {e.status === "NEW" && <span className="absolute -left-1 -top-0.5 size-3 rounded-full bg-note ring-2 ring-[var(--d-panel)]" aria-label="New" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={cn("truncate text-callout", e.status === "NEW" ? "font-bold text-fg" : "font-semibold text-fg")}>{e.name}</span>
                            <span className="ml-auto shrink-0 text-footnote tabular-nums text-fg-3">{age(e.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-subhead text-fg-2">{e.property?.name ?? e.destination ?? sourceLabel(e.source)}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <Badge tone={STATUS[e.status].tone} className="h-5 px-2 text-caption">
                              {STATUS[e.status].label}
                            </Badge>
                            {e.checkIn && e.checkOut && <span className="truncate text-footnote tabular-nums text-fg-3">{shortDay(e.checkIn)} → {shortDay(e.checkOut)}</span>}
                          </span>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          ) : (
            <EmptyState
              icon="inbox"
              title={enquiries.length ? "Nothing matches" : "No enquiries yet"}
              body={enquiries.length ? "Try another filter or search." : "When a guest sends the form on the website, it lands here within seconds."}
            />
          )}
        </Card>

        {/* Desktop reading pane */}
        <div className="hidden min-w-0 lg:block">
          {open ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={open.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.28 }}>
                <Card padded={false} className="overflow-hidden">
                  <div className="flex items-start gap-4 border-b border-line px-6 py-5">
                    <Avatar name={open.name} size={52} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-title2 text-fg">{open.name}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-subhead text-fg-3">
                        <span className="tabular-nums">{open.refCode}</span>
                        <span>·</span>
                        <span>{age(open.createdAt)} ago</span>
                        <Badge tone={STATUS[open.status].tone} dot>
                          {STATUS[open.status].label}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    <EnquiryDetail enquiry={open} onArchived={() => setOpenId(null)} />
                  </div>
                  <div className="border-t border-line bg-fill/40 px-6 py-4">
                    <StatusActions enquiry={open} />
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          ) : (
            <Card className="grid min-h-[24rem] place-items-center">
              <EmptyState icon="inbox" title="No enquiry selected" body="Choose one on the left. ↑ and ↓ move through the list." />
            </Card>
          )}
        </div>
      </div>

      {/* Phone and tablet: a sheet */}
      {!wide && (
        <Sheet
          open={Boolean(open)}
          onClose={() => setOpenId(null)}
          title={open?.name}
          subtitle={
            open ? (
              <span className="flex items-center gap-2">
                {open.refCode} · {age(open.createdAt)} ago <Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge>
              </span>
            ) : null
          }
          footer={open ? <StatusActions enquiry={open} /> : undefined}
        >
          {open && <EnquiryDetail enquiry={open} onArchived={() => setOpenId(null)} />}
        </Sheet>
      )}
    </>
  );
}

function StatusActions({ enquiry: e }: { enquiry: InboxEnquiry }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const move = async (status: Status) => {
    setBusy(status);
    const res = await setEnquiryStatus(e.id, status);
    setBusy(null);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    if (res.data.held === "held") toast({ title: "Confirmed — nights held", body: "Blocked here now, and on every connected platform at its next check." });
    else if (res.data.held === "clash") toast({ kind: "error", title: "Confirmed, but the nights were not held", body: "Some of those nights are already booked elsewhere. Check the calendar." });
    else
      toast({
        title: `Marked ${STATUS[status].label.toLowerCase()}`,
        undo:
          status === "CLOSED_LOST"
            ? async () => {
                await setEnquiryStatus(e.id, "CONTACTED");
                router.refresh();
              }
            : undefined,
      });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {e.status === "NEW" && (
        <Button variant="secondary" onClick={() => move("CONTACTED")} loading={busy === "CONTACTED"}>
          Mark contacted
        </Button>
      )}
      {(e.status === "NEW" || e.status === "CONTACTED") && (
        <>
          <Button variant="primary" icon="check" onClick={() => move("CONVERTED")} loading={busy === "CONVERTED"}>
            {e.checkIn && e.property ? "Confirm & hold dates" : "Confirm"}
          </Button>
          <Button variant="ghost" onClick={() => move("CLOSED_LOST")} loading={busy === "CLOSED_LOST"}>
            Close
          </Button>
        </>
      )}
      {(e.status === "CONVERTED" || e.status === "CLOSED_LOST") && (
        <Button variant="secondary" icon="refresh" onClick={() => move("CONTACTED")} loading={busy === "CONTACTED"}>
          Reopen{e.held ? " & release dates" : ""}
        </Button>
      )}
    </div>
  );
}

function EnquiryDetail({ enquiry: e, onArchived }: { enquiry: InboxEnquiry; onArchived: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const greeting = `Hi ${e.name.split(" ")[0]}, this is StaySutra about your enquiry${e.property ? ` for ${e.property.name}` : ""}${e.checkIn && e.checkOut ? ` (${shortDay(e.checkIn)} – ${shortDay(e.checkOut)})` : ""}. Ref ${e.refCode}.`;
  const nights = e.checkIn && e.checkOut ? nightsBetween(e.checkIn, e.checkOut) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        <ContactButton href={`https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(greeting)}`} icon="whatsapp" label="WhatsApp" primary />
        <ContactButton href={`tel:${e.phone.replace(/\s/g, "")}`} icon="phone" label="Call" />
        <ContactButton href={e.email ? `mailto:${e.email}?subject=${encodeURIComponent(`Your StaySutra enquiry ${e.refCode}`)}` : undefined} icon="mail" label="Email" />
      </div>

      {e.checkIn && e.checkOut && (
        <div className="flex items-stretch gap-2">
          <DateBlock label="Check-in" day={e.checkIn} />
          <div className="grid place-items-center px-1 text-center">
            <span className="text-footnote font-semibold text-fg-3">
              {nights} {nights === 1 ? "night" : "nights"}
            </span>
          </div>
          <DateBlock label="Check-out" day={e.checkOut} />
        </div>
      )}

      <dl className="divide-y divide-line rounded-[16px] bg-fill px-4">
        <Row label="Phone">
          <a href={`tel:${e.phone}`} className="tabular-nums hover:underline">
            {e.phone}
          </a>
        </Row>
        {e.email && <Row label="Email">{e.email}</Row>}
        {e.property && (
          <Row label="Stay">
            <a href={`/stays/${e.property.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              {e.property.name}
              <AdminIcon name="arrowUpRight" size={13} className="text-fg-3" />
            </a>
          </Row>
        )}
        {e.guests && <Row label="Guests">{e.guests}</Row>}
        {e.held && (
          <Row label="Calendar">
            <Badge tone="gold">Nights held</Badge>
          </Row>
        )}
        <Row label="From">
          {sourceLabel(e.source)}
          {e.utm ? ` · ${e.utm}` : ""}
        </Row>
      </dl>

      {e.message && (
        <div>
          <p className="mb-2 px-1 text-subhead font-semibold text-fg-2">Message</p>
          <p className="whitespace-pre-wrap rounded-[18px] rounded-tl-[6px] bg-fill p-4 text-body leading-relaxed text-fg">{e.message}</p>
        </div>
      )}

      <div>
        <p className="mb-2 px-1 text-subhead font-semibold text-fg-2">Notes for the team</p>
        {e.notes.length > 0 && (
          <ol className="mb-3 space-y-2">
            {e.notes.map((n) => (
              <li key={n.id} className="flex gap-2.5">
                <Avatar name={n.author} size={26} className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-[14px] bg-accent/10 px-3.5 py-2.5">
                  <p className="whitespace-pre-wrap text-callout leading-relaxed text-fg">{n.body}</p>
                  <p className="mt-1 text-footnote text-fg-3">
                    {n.author} · {age(n.createdAt)} ago
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Called — they want the pool heated. Sending a quote tonight." className="min-h-[5rem]" />
        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            className="text-fg-3"
            onClick={async () => {
              const res = await archiveEnquiry(e.id);
              if (!res.ok) return toast({ kind: "error", title: res.error });
              onArchived();
              router.refresh();
              toast({
                title: "Enquiry archived",
                undo: async () => {
                  await archiveEnquiry(e.id, true);
                  router.refresh();
                },
              });
            }}
          >
            Archive
          </Button>
          <Button
            size="sm"
            variant="tinted"
            disabled={!note.trim()}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              const res = await addNote(e.id, note);
              setSaving(false);
              if (!res.ok) return toast({ kind: "error", title: res.error });
              setNote("");
              router.refresh();
            }}
          >
            Add note
          </Button>
        </div>
      </div>

      {e.pageUrl && <p className="truncate px-1 text-footnote text-fg-4">Sent from {e.pageUrl}</p>}
    </div>
  );
}

function DateBlock({ label, day }: { label: string; day: string }) {
  return (
    <div className="flex-1 rounded-[16px] bg-fill px-4 py-3">
      <p className="text-footnote font-medium text-fg-3">{label}</p>
      <p className="mt-0.5 text-headline tabular-nums text-fg">{shortDay(day)}</p>
    </div>
  );
}

function ContactButton({ href, icon, label, primary }: { href?: string; icon: "whatsapp" | "phone" | "mail"; label: string; primary?: boolean }) {
  if (!href)
    return (
      <span className="flex flex-col items-center gap-1.5 rounded-[18px] bg-fill py-3.5 text-footnote font-semibold text-fg-4">
        <AdminIcon name={icon} size={21} />
        {label}
      </span>
    );
  return (
    <a
      href={href}
      target={icon === "whatsapp" ? "_blank" : undefined}
      rel="noreferrer"
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-[18px] py-3.5 text-footnote font-semibold transition-[background-color,transform] active:scale-95",
        primary ? "bg-pos text-white hover:brightness-105" : "bg-fill text-fg hover:bg-fill-2",
      )}
    >
      <AdminIcon name={icon} size={21} />
      {label}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 text-callout">
      <dt className="shrink-0 text-fg-3">{label}</dt>
      <dd className="min-w-0 truncate text-right text-fg">{children}</dd>
    </div>
  );
}

/** wa.me wants the full international number; a bare 10-digit Indian mobile gets +91. */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, "");
}

function sourceLabel(s: string) {
  return { PROPERTY: "Stay page", DESTINATION: "Destination page", CONTACT: "Contact page", GENERAL: "Website", WHATSAPP_CLICK: "WhatsApp click" }[s] ?? s;
}

function age(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d` : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(iso));
}
