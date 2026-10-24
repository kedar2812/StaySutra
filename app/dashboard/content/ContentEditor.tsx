"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Switch, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/toast";
import { MediaPicker } from "@/components/admin/media-picker";
import { getAt, setAt, type FieldDef, type SectionDef } from "@/lib/cms/sections";
import { cn } from "@/lib/utils";
import { resetSection, saveSection, saveSettings, saveSlot } from "./actions";

type Slot = { key: string; label: string; page: string; ratio: string; media: { id: string; src: string; alt: string } | null };
type Settings = {
  whatsappNumber: string;
  phone: string;
  email: string;
  instagram: string;
  instagramHandle: string;
  officeLocality: string;
  responseTime: string;
  announcement: { enabled: boolean; text: string; href: string };
  cancellation: string;
};

/**
 * The website, edited in place: the words on each page, the photograph in
 * every slot, and the contact details everything links to. Each section
 * saves on its own, so a typo fix never waits on a half-finished rewrite.
 */
export function ContentEditor({
  sections,
  slots,
  settings,
}: {
  sections: { def: SectionDef; values: Record<string, unknown>; editedAt: string | null }[];
  slots: Slot[];
  settings: Settings;
}) {
  const [tab, setTab] = useState<"words" | "photos" | "settings">("words");
  return (
    <>
      <PageHeader title="Website" description="Changes go live the moment you save — no developer, no waiting." actions={<a href="/" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[0.875rem] font-medium text-text-mid ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.05]"><AdminIcon name="external" size={16} />Open website</a>} />
      <Segmented
        id="content-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "words", label: "Words" },
          { value: "photos", label: "Page photos" },
          { value: "settings", label: "Contact & announcement" },
        ]}
        className="mb-6"
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="max-w-[56rem]">
          {tab === "words" && (
            <div className="space-y-4">
              {sections.map((s) => <SectionCard key={s.def.key} def={s.def} initial={s.values} editedAt={s.editedAt} />)}
            </div>
          )}
          {tab === "photos" && <PhotoSlots slots={slots} />}
          {tab === "settings" && <SettingsForm initial={settings} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function SectionCard({ def, initial, editedAt }: { def: SectionDef; initial: Record<string, unknown>; editedAt: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const save = async () => {
    setBusy(true);
    const res = await saveSection(def.key, values);
    setBusy(false);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    if (res.data.errors) {
      setErrors(res.data.errors);
      return toast({ kind: "error", title: "Some lines are too long or empty" });
    }
    setErrors({});
    toast({ title: `${def.title} updated`, body: "Live on the website now." });
    router.refresh();
  };

  return (
    <Card padded={false} className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-5 text-left sm:p-6" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-dim">{def.page}</p>
          <p className="mt-1 text-[1rem] font-semibold text-text-hi">{def.title}</p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-text-low">{def.description}</p>
        </div>
        {editedAt && <Badge tone="gold">Edited</Badge>}
        {dirty && <Badge tone="warn" dot>Unsaved</Badge>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="text-text-low">
          <AdminIcon name="chevronDown" size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-white/[0.05] p-5 sm:p-6">
              {def.fields.map((f) => (
                <FieldEditor key={f.path} field={f} values={values} errors={errors} onChange={(path, v) => setValues((cur) => setAt(cur, path, v))} />
              ))}
              <div className="flex items-center justify-between gap-2 pt-1">
                {editedAt ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    onClick={async () => {
                      const res = await resetSection(def.key);
                      if (!res.ok) return toast({ kind: "error", title: res.error });
                      toast({ title: "Original words restored" });
                      router.refresh();
                    }}
                  >
                    Restore original
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  {dirty && <Button variant="ghost" onClick={() => { setValues(initial); setErrors({}); }}>Discard</Button>}
                  <Button variant="primary" onClick={save} loading={busy} disabled={!dirty}>Save</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function FieldEditor({ field: f, values, errors, onChange }: { field: FieldDef; values: Record<string, unknown>; errors: Record<string, string>; onChange: (path: string, v: unknown) => void }) {
  if (f.kind === "text") {
    const v = String(getAt(values, f.path) ?? "");
    const Control = f.multiline ? Textarea : Input;
    return (
      <Field label={f.label} hint={f.hint} count={v.length} max={f.max} error={errors[f.path]}>
        <Control value={v} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(f.path, e.target.value)} className={f.multiline ? "min-h-[5.5rem]" : undefined} />
      </Field>
    );
  }
  if (f.kind === "lines") {
    const lines = (getAt(values, f.path) as string[]) ?? [];
    return (
      <Field label={f.label} hint={f.hint}>
        <div className="space-y-2">
          {Array.from({ length: f.count }, (_, i) => (
            <div key={i} className="relative">
              <Input value={lines[i] ?? ""} onChange={(e) => onChange(f.path, Object.assign([...lines], { [i]: e.target.value }))} invalid={Boolean(errors[`${f.path}.${i}`])} className="pr-14" />
              <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] tabular-nums", (lines[i]?.length ?? 0) > f.max ? "text-err" : "text-text-dim")}>{lines[i]?.length ?? 0}/{f.max}</span>
            </div>
          ))}
        </div>
      </Field>
    );
  }
  const rows = (getAt(values, f.path) as Record<string, string>[]) ?? [];
  return (
    <div>
      <p className="mb-2 text-[0.8125rem] font-medium text-text-mid">{f.label}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="rounded-[14px] bg-white/[0.03] p-3.5 ring-1 ring-inset ring-white/[0.05]">
            <p className="mb-2.5 text-[0.75rem] font-medium text-text-dim">{f.itemLabel} {i + 1}</p>
            <div className="space-y-3">
              {f.fields.map((sub) => {
                const v = row[sub.key] ?? "";
                const Control = sub.multiline ? Textarea : Input;
                return (
                  <Field key={sub.key} label={sub.label} count={v.length} max={sub.max} error={errors[`${f.path}.${i}.${sub.key}`]}>
                    <Control
                      value={v}
                      onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(f.path, rows.map((r, j) => (j === i ? { ...r, [sub.key]: e.target.value } : r)))}
                      className={sub.multiline ? "min-h-[4.5rem]" : undefined}
                    />
                  </Field>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoSlots({ slots }: { slots: Slot[] }) {
  const toast = useToast();
  const router = useRouter();
  const [picking, setPicking] = useState<Slot | null>(null);
  const pages = [...new Set(slots.map((s) => s.page))];

  const change = async (slot: Slot, mediaId: string | null) => {
    const res = await saveSlot(slot.key, mediaId);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    router.refresh();
    toast({
      title: `${slot.label} updated`,
      undo: async () => {
        await saveSlot(slot.key, res.data.previous);
        router.refresh();
      },
    });
  };

  return (
    <div className="space-y-6">
      {pages.map((page) => (
        <section key={page}>
          <p className="mb-3 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-dim">{page}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.filter((s) => s.page === page).map((s) => (
              <Card key={s.key} padded={false} className="overflow-hidden">
                <button type="button" onClick={() => setPicking(s)} className="group relative block aspect-[16/9] w-full bg-ink-700">
                  {s.media ? (
                    <Image src={s.media.src} alt={s.media.alt} fill sizes="(min-width:1024px) 20vw, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <span className="grid size-full place-items-center text-[0.8125rem] text-text-dim">Brand pattern</span>
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 text-[0.8125rem] font-medium text-ink-900"><AdminIcon name="media" size={15} />Change</span>
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <p className="truncate text-[0.875rem] text-text-hi">{s.label}</p>
                  {s.media && (
                    <button type="button" onClick={() => change(s, null)} className="shrink-0 text-[0.75rem] text-text-low hover:text-text-hi">Use pattern</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <MediaPicker open={Boolean(picking)} onClose={() => setPicking(null)} onPick={([m]) => m && picking && change(picking, m.id)} title={picking ? `Photo for: ${picking.label}` : ""} folder="Website" />
    </div>
  );
}

function SettingsForm({ initial }: { initial: Settings }) {
  const toast = useToast();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((cur) => ({ ...cur, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Announcement bar" description="A gold strip across the top of every page. Off unless you need it." />
        <Switch checked={s.announcement.enabled} onChange={(v) => set("announcement", { ...s.announcement, enabled: v })} label="Show the announcement" />
        <AnimatePresence initial={false}>
          {s.announcement.enabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid gap-4 pt-5 sm:grid-cols-[1fr_14rem]">
                <Field label="Text" count={s.announcement.text.length} max={120} error={errors["announcement.text"]}>
                  <Input value={s.announcement.text} onChange={(e) => set("announcement", { ...s.announcement, text: e.target.value })} placeholder="Diwali weekends are filling — ask about dates now" />
                </Field>
                <Field label="Links to" error={errors["announcement.href"]}>
                  <Input value={s.announcement.href} onChange={(e) => set("announcement", { ...s.announcement, href: e.target.value })} placeholder="/stays" />
                </Field>
              </div>
              {s.announcement.text && (
                <div className="mt-4 overflow-hidden rounded-[10px] bg-gold-500 py-2 text-center text-[0.8125rem] font-medium text-gold-ink">{s.announcement.text}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <Card>
        <CardHeader title="How guests reach you" description="Every WhatsApp button on the site uses this number from the moment you save." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp number" hint="Country code, then the number — digits only." error={errors.whatsappNumber}><Input value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))} inputMode="numeric" /></Field>
          <Field label="Phone, as shown" error={errors.phone}><Input value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email" error={errors.email}><Input value={s.email} onChange={(e) => set("email", e.target.value)} type="email" /></Field>
          <Field label="Based in" error={errors.officeLocality}><Input value={s.officeLocality} onChange={(e) => set("officeLocality", e.target.value)} /></Field>
          <Field label="Instagram link" error={errors.instagram}><Input value={s.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="Instagram handle"><Input value={s.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} /></Field>
          <Field label="Reply promise" className="sm:col-span-2" count={s.responseTime.length} max={120}><Input value={s.responseTime} onChange={(e) => set("responseTime", e.target.value)} /></Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Cancellation policy" description="Shown on every stay that has no terms of its own." />
        <Field count={s.cancellation.length} max={800} error={errors.cancellation}>
          <Textarea value={s.cancellation} onChange={(e) => set("cancellation", e.target.value)} className="min-h-[8rem]" />
        </Field>
      </Card>
      <div className="sticky bottom-24 z-10 flex justify-end lg:bottom-6">
        <Button
          variant="primary"
          disabled={!dirty}
          loading={busy}
          className="shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]"
          onClick={async () => {
            setBusy(true);
            const res = await saveSettings(s);
            setBusy(false);
            if (!res.ok) {
              setErrors(res.fields ?? {});
              return toast({ kind: "error", title: res.error });
            }
            setErrors({});
            toast({ title: "Settings saved", body: "Live everywhere on the website." });
            router.refresh();
          }}
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}
