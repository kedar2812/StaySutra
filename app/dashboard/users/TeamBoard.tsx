"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Switch } from "@/components/admin/ui";
import { AdminIcon, type AdminIconName } from "@/components/admin/icons";
import { Sheet } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { CopyField } from "../calendar/CalendarBoard";
import { cn } from "@/lib/utils";
import { inviteUser, resetLink, signOutEverywhere, updateUser } from "./actions";

type Role = "OWNER" | "MANAGER" | "EDITOR";
interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  sessions: number;
}

const ROLES: { value: Role; label: string; note: string; icon: AdminIconName }[] = [
  { value: "OWNER", label: "Owner", note: "Everything, including the team.", icon: "star" },
  { value: "MANAGER", label: "Manager", note: "Everything except the team — properties, calendar, enquiries, website, analytics.", icon: "settings" },
  { value: "EDITOR", label: "Editor", note: "Edits properties and writes stories. Cannot publish stays or see enquiries.", icon: "edit" },
];

const ENTITY_ICON: Record<string, AdminIconName> = {
  Property: "properties",
  Enquiry: "inbox",
  Media: "image",
  CalendarFeed: "sync",
  CalendarBlock: "calendar",
  Story: "stories",
  Destination: "map",
  SiteSection: "content",
  SiteSetting: "settings",
  User: "user",
};

/** Who can sign in, what they can change, and every change anyone has made. DPR §10.9 */
export function TeamBoard({ meId, users, activity }: { meId: string; users: Member[]; activity: { id: string; summary: string; entity: string; at: string }[] }) {
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState<Member | null>(null);
  const [entity, setEntity] = useState("all");
  const entities = useMemo(() => [...new Set(activity.map((a) => a.entity))], [activity]);
  const shown = activity.filter((a) => entity === "all" || a.entity === entity);
  const byDay = useMemo(() => {
    const out: { day: string; items: typeof shown }[] = [];
    for (const a of shown) {
      const day = dayLabel(a.at);
      const last = out.at(-1);
      if (last?.day === day) last.items.push(a);
      else out.push({ day, items: [a] });
    }
    return out;
  }, [shown]);

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in, and what they can change."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setInvite(true)}>
            Invite someone
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div>
          <h2 className="mb-2.5 px-1 text-headline text-fg">
            {users.filter((u) => u.isActive).length} {users.filter((u) => u.isActive).length === 1 ? "person" : "people"} can sign in
          </h2>
          <Card padded={false} className="h-fit overflow-hidden">
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setOpen(u)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-fill sm:px-5">
                    <span className={cn("relative", !u.isActive && "opacity-40")}>
                      <Avatar name={u.name} size={42} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-callout font-semibold text-fg">
                        {u.name}
                        {u.id === meId && <span className="rounded-full bg-fill-2 px-1.5 py-px text-caption font-semibold text-fg-3">You</span>}
                      </span>
                      <span className="block truncate text-subhead text-fg-3">
                        {u.email} · {u.lastLoginAt ? `last in ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(u.lastLoginAt))}` : "has not signed in"}
                      </span>
                    </span>
                    {!u.isActive ? <Badge tone="err">Off</Badge> : <Badge tone={u.role === "OWNER" ? "gold" : "neutral"}>{ROLES.find((r) => r.value === u.role)?.label}</Badge>}
                    <AdminIcon name="chevronRight" size={16} className="text-fg-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card>
          <CardHeader title="Activity" description="Every change, who made it, and when." />
          <Segmented
            id="activity-filter"
            size="sm"
            value={entity}
            onChange={setEntity}
            options={[{ value: "all", label: "All" }, ...entities.map((e) => ({ value: e, label: e.replace(/([a-z])([A-Z])/g, "$1 $2") }))]}
            className="mb-4"
          />
          {byDay.length ? (
            <div className="d-scroll max-h-[38rem] space-y-5 overflow-y-auto pr-1">
              {byDay.map((g) => (
                <section key={g.day}>
                  <p className="mb-2 text-footnote font-semibold text-fg-3">{g.day}</p>
                  <ol className="space-y-3">
                    {g.items.map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fill-2 text-fg-3">
                          <AdminIcon name={ENTITY_ICON[a.entity] ?? "edit"} size={14} />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-subhead leading-snug text-fg">{a.summary}</p>
                          <p className="mt-0.5 text-footnote tabular-nums text-fg-3">{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(a.at))}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-subhead text-fg-3">Nothing yet.</p>
          )}
        </Card>
      </div>
      <Sheet open={invite} onClose={() => setInvite(false)} title="Invite someone" subtitle="They get a link to set their own password.">
        {invite && <InviteForm onDone={() => setInvite(false)} />}
      </Sheet>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name} subtitle={open?.email}>
        {open && <MemberForm key={open.id} member={open} isMe={open.id === meId} />}
      </Sheet>
    </>
  );
}

function RolePicker({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Role" className="space-y-2">
      {ROLES.map((r) => {
        const on = r.value === value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(r.value)}
            className={cn(
              "flex w-full items-start gap-3 rounded-[16px] p-3.5 text-left transition-[background-color,box-shadow] disabled:opacity-50",
              on ? "bg-accent/12 shadow-[inset_0_0_0_1.5px_var(--d-accent)]" : "bg-fill hover:bg-fill-2",
            )}
          >
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", on ? "bg-accent text-accent-fg" : "bg-panel text-fg-3")}>
              <AdminIcon name={r.icon} size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-callout font-semibold text-fg">{r.label}</span>
              <span className="mt-0.5 block text-subhead leading-snug text-fg-3">{r.note}</span>
            </span>
            <span className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-full", on ? "bg-accent text-accent-fg" : "shadow-[inset_0_0_0_1.5px_var(--d-fill-3)]")}>
              {on && <AdminIcon name="check" size={11} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", role: "MANAGER" as Role });
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (link)
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex flex-col items-center pt-2 text-center">
          <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.5 }} className="grid size-14 place-items-center rounded-full bg-pos text-white">
            <AdminIcon name="link" size={24} />
          </motion.span>
          <p className="mt-3 text-title2 text-fg">Invite ready</p>
          <p className="mt-1 text-subhead text-fg-3">Send {v.name.split(" ")[0]} this link on WhatsApp or email. It works once, for 72 hours.</p>
        </div>
        <CopyField value={link} />
        <Button variant="primary" size="lg" className="w-full" onClick={onDone}>
          Done
        </Button>
      </motion.div>
    );
  return (
    <div className="space-y-5">
      <Field label="Name">
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Email">
        <Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <div>
        <p className="mb-2 px-0.5 text-subhead font-medium text-fg-2">Role</p>
        <RolePicker value={v.role} onChange={(role) => setV({ ...v, role })} />
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={busy}
        disabled={!v.name.trim() || !v.email.trim()}
        onClick={async () => {
          setBusy(true);
          const res = await inviteUser(v);
          setBusy(false);
          if (!res.ok) return toast({ kind: "error", title: res.error, body: Object.values(res.fields ?? {})[0] });
          setLink(res.data.link);
          router.refresh();
        }}
      >
        Create invite link
      </Button>
    </div>
  );
}

function MemberForm({ member: m, isMe }: { member: Member; isMe: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState(m.role);
  const [link, setLink] = useState<string | null>(null);
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, title: string) => {
    const res = await fn();
    if (!res.ok) return toast({ kind: "error", title: res.error ?? "Failed" });
    toast({ title });
    router.refresh();
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 px-0.5 text-subhead font-medium text-fg-2">Role{isMe && " — you cannot change your own"}</p>
        <RolePicker
          value={role}
          disabled={isMe}
          onChange={(r) => {
            setRole(r);
            act(() => updateUser(m.id, { role: r }), "Role changed");
          }}
        />
      </div>
      <div className="rounded-[16px] bg-fill p-4">
        <Switch checked={m.isActive} disabled={isMe} onChange={(v) => act(() => updateUser(m.id, { isActive: v }), v ? "Account switched on" : "Account switched off and signed out")} label="Can sign in" description="Switching off keeps their history but ends every session." />
      </div>
      <div className="space-y-2 border-t border-line pt-5">
        <Button
          className="w-full"
          variant="secondary"
          icon="lock"
          onClick={async () => {
            const res = await resetLink(m.id);
            if (res.ok) setLink(res.data.link);
          }}
        >
          New password link
        </Button>
        <AnimatePresence>
          {link && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
              <CopyField value={link} />
            </motion.div>
          )}
        </AnimatePresence>
        <Button className="w-full" variant="ghost" icon="logout" onClick={() => act(() => signOutEverywhere(m.id), `Signed out of ${m.sessions} ${m.sessions === 1 ? "device" : "devices"}`)}>
          Sign out everywhere
        </Button>
      </div>
    </div>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(d);
}
