"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Badge, Button, ButtonLink, Card, CardHeader, FadeImage, Field, Input, PageHeader, SaveButton, Segmented, Switch, Textarea } from "@/components/admin/ui";
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
  const pages = [...new Set(sections.map((s) => s.def.page))];
  return (
    <>
      <PageHeader
        title="Site content"
        description="Changes go live the moment you save — no developer, no waiting."
        actions={
          <ButtonLink href="/" external variant="plain" icon="globe">
            Open website
          </ButtonLink>
        }
      />
      <Segmented
        id="content-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "words", label: "Words", icon: "edit" },
          { value: "photos", label: "Page photos", icon: "image" },
          { value: "settings", label: "Contact & announcement", icon: "phone" },
        ]}
        className="mb-6"
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="max-w-[52rem]">
          {tab === "words" && (
            <div className="space-y-7">
              {pages.map((page) => (
                <section key={page}>
                  <h2 className="mb-2.5 px-1 text-headline text-fg">{page}</h2>
                  <div className="overflow-hidden rounded-[20px] bg-panel shadow-tile">
                    {sections
                      .filter((s) => s.def.page === page)
                      .map((s, i) => (
                        <SectionRow key={s.def.key} def={s.def} initial={s.values} editedAt={s.editedAt} first={i === 0} />
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {tab === "photos" && <PhotoSlots slots={slots} />}
          {tab === "settings" && <SettingsForm initial={settings} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function SectionRow({ def, initial, editedAt, first }: { def: SectionDef; initial: Record<string, unknown>; editedAt: string | null; first: boolean }) {
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
    <div className={cn(!first && "border-t border-line")}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-fill sm:px-6" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="text-callout font-semibold text-fg">{def.title}</p>
          <p className="mt-0.5 truncate text-subhead text-fg-3">{def.description}</p>
        </div>
        {dirty && (
          <Badge tone="warn" dot>
            Unsaved
          </Badge>
        )}
        {editedAt && !dirty && <Badge tone="gold">Edited</Badge>}
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="text-fg-4">
          <AdminIcon name="chevronRight" size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.38 }} className="overflow-hidden">
            <div className="space-y-5 bg-fill/40 px-5 pb-5 pt-4 sm:px-6">
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
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  {dirty && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setValues(initial);
                        setErrors({});
                      }}
                    >
                      Discard
                    </Button>
                  )}
                  <SaveButton saving={busy} dirty={dirty} onClick={save} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldEditor({ field: f, values, errors, onChange }: { field: FieldDef; values: Record<string, unknown>; errors: Record<string, string>; onChange: (path: string, v: unknown) => void }) {
  if (f.kind === "text") {
    const v = String(getAt(values, f.path) ?? "");
    return (
      <Field label={f.label} hint={f.hint} count={v.length} max={f.max} error={errors[f.path]}>
        {f.multiline ? (
          <Textarea value={v} onChange={(e) => onChange(f.path, e.target.value)} className="min-h-[5.5rem]" />
        ) : (
          <Input value={v} onChange={(e) => onChange(f.path, e.target.value)} />
        )}
      </Field>
    );
  }
  if (f.kind === "lines") {
    const lines = (getAt(values, f.path) as string[]) ?? [];
    return (
      <Field label={f.label} hint={f.hint}>
        <div className="space-y-2">
          {Array.from({ length: f.count }, (_, i) => (
            <Input
              key={i}
              value={lines[i] ?? ""}
              onChange={(e) => onChange(f.path, Object.assign([...lines], { [i]: e.target.value }))}
              invalid={Boolean(errors[`${f.path}.${i}`])}
              trailing={<span className={cn("pr-1.5 text-footnote tabular-nums", (lines[i]?.length ?? 0) > f.max ? "font-semibold text-neg-text" : "text-fg-4")}>{lines[i]?.length ?? 0}/{f.max}</span>}
              className="pr-16"
            />
          ))}
        </div>
      </Field>
    );
  }
  const rows = (getAt(values, f.path) as Record<string, string>[]) ?? [];
  return (
    <div>
      <p className="mb-2 px-0.5 text-subhead font-medium text-fg-2">{f.label}</p>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="rounded-[16px] bg-panel p-4 shadow-tile">
            <p className="mb-3 text-footnote font-semibold text-fg-3">
              {f.itemLabel} {i + 1}
            </p>
            <div className="space-y-3">
              {f.fields.map((sub) => {
                const v = row[sub.key] ?? "";
                const set = (val: string) => onChange(f.path, rows.map((r, j) => (j === i ? { ...r, [sub.key]: val } : r)));
                return (
                  <Field key={sub.key} label={sub.label} count={v.length} max={sub.max} error={errors[`${f.path}.${i}.${sub.key}`]}>
                    {sub.multiline ? <Textarea value={v} onChange={(e) => set(e.target.value)} className="min-h-[4.5rem]" /> : <Input value={v} onChange={(e) => set(e.target.value)} />}
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
    <div className="space-y-7">
      {pages.map((page) => (
        <section key={page}>
          <h2 className="mb-2.5 px-1 text-headline text-fg">{page}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots
              .filter((s) => s.page === page)
              .map((s) => (
                <div key={s.key} className="overflow-hidden rounded-[20px] bg-panel shadow-tile">
                  <button type="button" onClick={() => setPicking(s)} className="group relative block aspect-[16/9] w-full overflow-hidden bg-fill-2">
                    {s.media ? (
                      <FadeImage src={s.media.src} alt={s.media.alt} fill sizes="(min-width:1024px) 20vw, 45vw" className="object-cover transition-transform duration-[700ms] ease-[var(--ease-emph)] group-hover:scale-[1.05]" />
                    ) : (
                      <span className="grid size-full place-items-center bg-[repeating-linear-gradient(135deg,var(--d-fill)_0_8px,transparent_8px_16px)] text-subhead font-medium text-fg-3">Brand pattern</span>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-200 group-hover:bg-black/35 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-subhead font-semibold text-black">
                        <AdminIcon name="image" size={15} />
                        Change
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <p className="truncate text-callout font-medium text-fg">{s.label}</p>
                    {s.media && (
                      <button type="button" onClick={() => change(s, null)} className="shrink-0 text-footnote font-semibold text-accent-text hover:opacity-80">
                        Use pattern
                      </button>
                    )}
                  </div>
                </div>
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

  const save = async () => {
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
  };

  return (
    <div className="space-y-4 pb-24">
      <Card>
        <CardHeader title="Announcement bar" description="A gold strip across the top of every page. Off unless you need it." />
        <Switch checked={s.announcement.enabled} onChange={(v) => set("announcement", { ...s.announcement, enabled: v })} label="Show the announcement" />
        <AnimatePresence initial={false}>
          {s.announcement.enabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }} className="overflow-hidden">
              <div className="grid gap-4 pt-5 sm:grid-cols-[1fr_14rem]">
                <Field label="Text" count={s.announcement.text.length} max={120} error={errors["announcement.text"]}>
                  <Input value={s.announcement.text} onChange={(e) => set("announcement", { ...s.announcement, text: e.target.value })} placeholder="Diwali weekends are filling — ask about dates now" />
                </Field>
                <Field label="Links to" error={errors["announcement.href"]}>
                  <Input value={s.announcement.href} onChange={(e) => set("announcement", { ...s.announcement, href: e.target.value })} placeholder="/stays" />
                </Field>
              </div>
              {s.announcement.text && (
                <div className="mt-4">
                  <p className="mb-1.5 px-0.5 text-footnote font-medium text-fg-3">Preview</p>
                  <div className="overflow-hidden rounded-[10px] bg-[#e9b93c] py-2 text-center text-[0.8125rem] font-medium text-[#1a1204]">{s.announcement.text}</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <Card>
        <CardHeader title="How guests reach you" description="Every WhatsApp button on the site uses this number from the moment you save." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp number" hint="Country code, then the number — digits only." error={errors.whatsappNumber}>
            <Input value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))} inputMode="numeric" leading={<AdminIcon name="whatsapp" size={15} />} />
          </Field>
          <Field label="Phone, as shown" error={errors.phone}>
            <Input value={s.phone} onChange={(e) => set("phone", e.target.value)} leading={<AdminIcon name="phone" size={15} />} />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input value={s.email} onChange={(e) => set("email", e.target.value)} type="email" leading={<AdminIcon name="mail" size={15} />} />
          </Field>
          <Field label="Based in" error={errors.officeLocality}>
            <Input value={s.officeLocality} onChange={(e) => set("officeLocality", e.target.value)} leading={<AdminIcon name="pin" size={15} />} />
          </Field>
          <Field label="Instagram link" error={errors.instagram}>
            <Input value={s.instagram} onChange={(e) => set("instagram", e.target.value)} />
          </Field>
          <Field label="Instagram handle">
            <Input value={s.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} />
          </Field>
          <Field label="Reply promise" className="sm:col-span-2" count={s.responseTime.length} max={120}>
            <Input value={s.responseTime} onChange={(e) => set("responseTime", e.target.value)} />
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Cancellation policy" description="Shown on every stay that has no terms of its own." />
        <Field count={s.cancellation.length} max={800} error={errors.cancellation}>
          <Textarea value={s.cancellation} onChange={(e) => set("cancellation", e.target.value)} className="min-h-[8rem]" />
        </Field>
      </Card>

      {/* Appears only when there is something to save. */}
      <AnimatePresence>
        {(dirty || busy) && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
            className="d-glass-float fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-full py-2 pl-5 pr-2 lg:bottom-6"
          >
            <span className="flex flex-1 items-center gap-2 text-callout font-medium text-fg">
              <span className="size-2 rounded-full bg-caution" /> Unsaved changes
            </span>
            <Button variant="ghost" onClick={() => setS(initial)}>
              Discard
            </Button>
            <SaveButton saving={busy} dirty={dirty} onClick={save} label="Save settings" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
