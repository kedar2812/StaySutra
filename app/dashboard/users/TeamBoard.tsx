"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Select, Switch } from "@/components/admin/ui";
import { Sheet } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { CopyField } from "../calendar/CalendarBoard";
import { inviteUser, resetLink, signOutEverywhere, updateUser } from "./actions";

type Role = "OWNER" | "MANAGER" | "EDITOR";
interface Member { id: string; name: string; email: string; role: Role; isActive: boolean; lastLoginAt: string | null; sessions: number }

const ROLE_NOTE: Record<Role, string> = {
  OWNER: "Everything, including the team.",
  MANAGER: "Everything except the team — properties, calendar, enquiries, website.",
  EDITOR: "Edits properties and writes stories. Cannot publish stays or see enquiries.",
};

export function TeamBoard({ meId, users, activity }: { meId: string; users: Member[]; activity: { id: string; summary: string; entity: string; at: string }[] }) {
  const [invite, setInvite] = useState(false);
  const [open, setOpen] = useState<Member | null>(null);
  const [entity, setEntity] = useState("all");
  const entities = useMemo(() => [...new Set(activity.map((a) => a.entity))], [activity]);

  return (
    <>
      <PageHeader title="Team" description="Who can sign in, and what they can change." actions={<Button variant="primary" icon="plus" onClick={() => setInvite(true)}>Invite someone</Button>} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card padded={false} className="h-fit overflow-hidden">
          <ul className="divide-y divide-white/[0.05]">
            {users.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => setOpen(u)} className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.03] sm:p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink-500 to-ink-600 text-[0.8125rem] font-semibold text-text-hi">{u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[0.9375rem] text-text-hi">{u.name}{u.id === meId && <span className="text-[0.75rem] text-text-dim">You</span>}</span>
                    <span className="block truncate text-[0.8125rem] text-text-low">{u.email} · {u.lastLoginAt ? `last in ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(u.lastLoginAt))}` : "has not signed in"}</span>
                  </span>
                  {!u.isActive ? <Badge tone="err">Off</Badge> : <Badge tone={u.role === "OWNER" ? "gold" : "neutral"}>{u.role.toLowerCase()}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Activity" description="Every change, who made it, and when." />
          <Segmented id="activity-filter" value={entity} onChange={setEntity} options={[{ value: "all", label: "All" }, ...entities.map((e) => ({ value: e, label: e.replace(/([a-z])([A-Z])/g, "$1 $2") }))]} className="mb-4" />
          <ol className="space-y-3">
            {activity.filter((a) => entity === "all" || a.entity === entity).map((a) => (
              <li key={a.id} className="flex gap-3 text-[0.8125rem]">
                <span className="w-16 shrink-0 tabular-nums text-text-dim">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(a.at))}</span>
                <span className="text-text-mid">{a.summary}</span>
              </li>
            ))}
          </ol>
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

function InviteForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", role: "MANAGER" as Role });
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (link)
    return (
      <div className="space-y-4">
        <p className="text-[0.9375rem] text-text-mid">Send {v.name.split(" ")[0]} this link on WhatsApp or email. It works once, for 72 hours.</p>
        <CopyField value={link} />
        <Button variant="primary" className="w-full" onClick={onDone}>Done</Button>
      </div>
    );
  return (
    <div className="space-y-5">
      <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="Role" hint={ROLE_NOTE[v.role]}>
        <Select value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as Role })}>
          <option value="MANAGER">Manager</option>
          <option value="EDITOR">Editor</option>
          <option value="OWNER">Owner</option>
        </Select>
      </Field>
      <Button
        variant="primary"
        className="w-full"
        loading={busy}
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
  const [link, setLink] = useState<string | null>(null);
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, title: string) => {
    const res = await fn();
    if (!res.ok) return toast({ kind: "error", title: res.error ?? "Failed" });
    toast({ title });
    router.refresh();
  };
  return (
    <div className="space-y-6">
      <Field label="Role" hint={ROLE_NOTE[m.role]}>
        <Select defaultValue={m.role} disabled={isMe} onChange={(e) => act(() => updateUser(m.id, { role: e.target.value as Role }), "Role changed")}>
          <option value="OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
          <option value="EDITOR">Editor</option>
        </Select>
      </Field>
      <Switch checked={m.isActive} disabled={isMe} onChange={(v) => act(() => updateUser(m.id, { isActive: v }), v ? "Account switched on" : "Account switched off and signed out")} label="Can sign in" description="Switching off keeps their history but ends every session." />
      <div className="space-y-2 border-t border-white/[0.06] pt-5">
        <Button className="w-full" icon="lock" onClick={async () => { const res = await resetLink(m.id); if (res.ok) setLink(res.data.link); }}>New password link</Button>
        {link && <CopyField value={link} />}
        <Button className="w-full" variant="ghost" icon="logout" onClick={() => act(() => signOutEverywhere(m.id), `Signed out of ${m.sessions} ${m.sessions === 1 ? "device" : "devices"}`)}>Sign out everywhere</Button>
      </div>
    </div>
  );
}
