"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Segmented, Textarea, ButtonLink } from "@/components/admin/ui";
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

const STATUS: Record<Status, { label: string; tone: "info" | "warn" | "ok" | "neutral" }> = {
  NEW: { label: "New", tone: "info" },
  CONTACTED: { label: "Contacted", tone: "warn" },
  CONVERTED: { label: "Confirmed", tone: "ok" },
  CLOSED_LOST: { label: "Closed", tone: "neutral" },
};

/**
 * The inbox. Newest first, new ones unmistakable, and every enquiry one tap
 * from a WhatsApp message that already greets the guest by name and names the
 * stay. Confirming an enquiry holds its nights on the calendar. DPR §10.4
 */
export function EnquiryInbox({ enquiries, initialStatus, initialOpen }: { enquiries: InboxEnquiry[]; initialStatus: Status | "ALL"; initialOpen: string | null }) {
  const [filter, setFilter] = useState<Status | "ALL">(initialStatus);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpen);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: enquiries.length };
    for (const e of enquiries) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [enquiries]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return enquiries.filter(
      (e) =>
        (filter === "ALL" || e.status === filter) &&
        (!n || `${e.name} ${e.phone} ${e.email ?? ""} ${e.refCode} ${e.property?.name ?? ""}`.toLowerCase().includes(n)),
    );
  }, [enquiries, filter, q]);

  const open = enquiries.find((e) => e.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every question from the website, in one place."
        actions={<ButtonLink href={`/api/admin/enquiries.csv${filter !== "ALL" ? `?status=${filter}` : ""}`} icon="download">Export CSV</ButtonLink>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
        <div className="lg:w-80">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, reference…" leading={<AdminIcon name="search" size={15} />} />
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        {shown.length ? (
          <ul className="divide-y divide-white/[0.05]">
            <AnimatePresence initial={false}>
              {shown.map((e) => (
                <motion.li key={e.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                  <button type="button" onClick={() => setOpenId(e.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] sm:px-5">
                    <span className={cn("size-2 shrink-0 rounded-full", e.status === "NEW" ? "bg-info shadow-[0_0_0_4px_rgba(91,155,213,0.18)]" : "bg-transparent")} aria-hidden />
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink-500 to-ink-600 text-[0.8125rem] font-semibold text-text-hi">
                      {initials(e.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("truncate text-[0.9375rem]", e.status === "NEW" ? "font-semibold text-text-hi" : "text-text-hi")}>{e.name}</span>
                        <span className="hidden text-[0.75rem] tabular-nums text-text-dim sm:inline">{e.refCode}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.8125rem] text-text-low">
                        {[e.property?.name ?? e.destination ?? sourceLabel(e.source), e.checkIn && e.checkOut ? `${shortDay(e.checkIn)} → ${shortDay(e.checkOut)}` : null, e.guests ? `${e.guests} guests` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="hidden shrink-0 sm:block"><Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></span>
                    <span className="w-14 shrink-0 text-right text-[0.75rem] tabular-nums text-text-dim">{age(e.createdAt)}</span>
                  </button>
                </motion.li>
              ))}
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

      <EnquirySheet enquiry={open} onClose={() => setOpenId(null)} />
    </>
  );
}

function EnquirySheet({ enquiry: e, onClose }: { enquiry: InboxEnquiry | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const move = async (status: Status) => {
    if (!e) return;
    setBusy(status);
    const res = await setEnquiryStatus(e.id, status);
    setBusy(null);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    if (res.data.held === "held") toast({ title: "Confirmed — nights held", body: "Blocked here now, and on every connected platform at its next check." });
    else if (res.data.held === "clash") toast({ kind: "error", title: "Confirmed, but the nights were not held", body: "Some of those nights are already booked elsewhere. Check the calendar." });
    else toast({ title: `Marked ${STATUS[status].label.toLowerCase()}`, undo: status === "CLOSED_LOST" ? async () => { await setEnquiryStatus(e.id, "CONTACTED"); router.refresh(); } : undefined });
    router.refresh();
  };

  const greeting = e
    ? `Hi ${e.name.split(" ")[0]}, this is StaySutra about your enquiry${e.property ? ` for ${e.property.name}` : ""}${e.checkIn && e.checkOut ? ` (${shortDay(e.checkIn)} – ${shortDay(e.checkOut)})` : ""}. Ref ${e.refCode}.`
    : "";

  return (
    <Sheet
      open={Boolean(e)}
      onClose={onClose}
      title={e?.name}
      subtitle={e ? <span className="flex items-center gap-2">{e.refCode} · {age(e.createdAt)} ago <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge></span> : null}
      footer={
        e ? (
          <div className="flex flex-wrap gap-2">
            {e.status === "NEW" && <Button onClick={() => move("CONTACTED")} loading={busy === "CONTACTED"}>Mark contacted</Button>}
            {(e.status === "NEW" || e.status === "CONTACTED") && (
              <>
                <Button variant="primary" icon="check" onClick={() => move("CONVERTED")} loading={busy === "CONVERTED"}>
                  {e.checkIn && e.property ? "Confirm & hold dates" : "Confirm"}
                </Button>
                <Button variant="ghost" onClick={() => move("CLOSED_LOST")} loading={busy === "CLOSED_LOST"}>Close</Button>
              </>
            )}
            {(e.status === "CONVERTED" || e.status === "CLOSED_LOST") && (
              <Button variant="ghost" icon="refresh" onClick={() => move("CONTACTED")} loading={busy === "CONTACTED"}>
                Reopen{e.held ? " & release dates" : ""}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {e && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            <ContactButton href={`https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(greeting)}`} icon="whatsapp" label="WhatsApp" primary />
            <ContactButton href={`tel:${e.phone.replace(/\s/g, "")}`} icon="phone" label="Call" />
            <ContactButton href={e.email ? `mailto:${e.email}?subject=${encodeURIComponent(`Your StaySutra enquiry ${e.refCode}`)}` : undefined} icon="mail" label="Email" />
          </div>

          <dl className="space-y-3 rounded-[16px] bg-white/[0.03] p-4 text-[0.875rem] ring-1 ring-inset ring-white/[0.05]">
            <Row label="Phone"><a href={`tel:${e.phone}`} className="tabular-nums hover:underline">{e.phone}</a></Row>
            {e.email && <Row label="Email">{e.email}</Row>}
            {e.property && <Row label="Stay"><a href={`/stays/${e.property.slug}`} target="_blank" rel="noreferrer" className="hover:underline">{e.property.name}</a></Row>}
            {e.checkIn && e.checkOut && (
              <Row label="Dates">
                {shortDay(e.checkIn)} → {shortDay(e.checkOut)} · {nightsBetween(e.checkIn, e.checkOut)} nights
                {e.held && <Badge tone="gold" className="ml-2">Held</Badge>}
              </Row>
            )}
            {e.guests && <Row label="Guests">{e.guests}</Row>}
            <Row label="From">{sourceLabel(e.source)}{e.utm ? ` · ${e.utm}` : ""}</Row>
          </dl>

          {e.message && (
            <div>
              <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-dim">Message</p>
              <p className="whitespace-pre-wrap rounded-[16px] bg-white/[0.03] p-4 text-[0.9375rem] leading-relaxed text-text-mid ring-1 ring-inset ring-white/[0.05]">{e.message}</p>
            </div>
          )}

          <div>
            <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-dim">Notes</p>
            {e.notes.length > 0 && (
              <ol className="mb-3 space-y-2">
                {e.notes.map((n) => (
                  <li key={n.id} className="rounded-[14px] bg-white/[0.04] px-3.5 py-3">
                    <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-text-mid">{n.body}</p>
                    <p className="mt-1.5 text-[0.75rem] text-text-dim">{n.author} · {age(n.createdAt)} ago</p>
                  </li>
                ))}
              </ol>
            )}
            <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Called — they want the pool heated. Sending a quote tonight." className="min-h-[5rem]" />
            <div className="mt-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={async () => {
                  const res = await archiveEnquiry(e.id);
                  if (!res.ok) return toast({ kind: "error", title: res.error });
                  onClose();
                  router.refresh();
                  toast({ title: "Enquiry archived", undo: async () => { await archiveEnquiry(e.id, true); router.refresh(); } });
                }}
              >
                Archive
              </Button>
              <Button
                size="sm"
                disabled={!note.trim()}
                loading={busy === "note"}
                onClick={async () => {
                  setBusy("note");
                  const res = await addNote(e.id, note);
                  setBusy(null);
                  if (!res.ok) return toast({ kind: "error", title: res.error });
                  setNote("");
                  router.refresh();
                }}
              >
                Add note
              </Button>
            </div>
          </div>

          {e.pageUrl && <p className="truncate text-[0.75rem] text-text-dim">Sent from {e.pageUrl}</p>}
        </div>
      )}
    </Sheet>
  );
}

function ContactButton({ href, icon, label, primary }: { href?: string; icon: "whatsapp" | "phone" | "mail"; label: string; primary?: boolean }) {
  if (!href)
    return (
      <span className="flex flex-col items-center gap-1.5 rounded-[16px] bg-white/[0.02] py-3.5 text-[0.75rem] text-text-dim opacity-50">
        <AdminIcon name={icon} size={20} />
        {label}
      </span>
    );
  return (
    <a
      href={href}
      target={icon === "whatsapp" ? "_blank" : undefined}
      rel="noreferrer"
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-[16px] py-3.5 text-[0.75rem] font-medium transition-[background-color,transform] active:scale-95",
        primary ? "bg-ok/15 text-[#6fe0ac] ring-1 ring-inset ring-ok/25 hover:bg-ok/20" : "bg-white/[0.05] text-text-mid hover:bg-white/[0.08]",
      )}
    >
      <AdminIcon name={icon} size={20} />
      {label}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="text-text-low">{label}</dt>
      <dd className="min-w-0 text-text-hi">{children}</dd>
    </div>
  );
}

/** wa.me wants the full international number; a bare 10-digit Indian mobile gets +91. */
function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, "");
}

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

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
