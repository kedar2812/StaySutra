"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, Card, CardHeader, Field, IconButton, Input, Menu, SaveButton, Segmented, Select, Spinner, Switch, Textarea, useLargeTitle, ModKey } from "@/components/admin/ui";
import { AdminIcon, type AdminIconName } from "@/components/admin/icons";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/sheet";
import { DropZone, MediaPicker, UploadTiles, useUploader } from "@/components/admin/media-picker";
import { cn, inr } from "@/lib/utils";
import { archiveProperty, checkSlug, duplicateProperty, saveProperty, setPropertyStatus, type PropertyInput } from "../actions";

type Img = { mediaId: string; alt: string; src: string };
type Draft = Omit<PropertyInput, "images"> & { images: Img[] };
type Opt = { id: string; name: string };

const TABS: { value: Tab; label: string; icon: AdminIconName }[] = [
  { value: "basics", label: "Basics", icon: "edit" },
  { value: "gallery", label: "Photos", icon: "image" },
  { value: "rooms", label: "Rooms & rules", icon: "bed" },
  { value: "pricing", label: "Pricing", icon: "rupee" },
  { value: "amenities", label: "Amenities", icon: "sparkle" },
  { value: "location", label: "Location", icon: "pin" },
  { value: "seo", label: "Search", icon: "search" },
];
type Tab = "basics" | "gallery" | "rooms" | "pricing" | "amenities" | "location" | "seo";

const FIELD_TAB: Record<string, Tab> = {
  name: "basics", slug: "basics", tagline: "basics", description: "basics", categoryId: "basics", destinationId: "basics", curatorNote: "basics",
  images: "gallery",
  maxGuests: "rooms", bedrooms: "rooms", bathrooms: "rooms", beds: "rooms", sleeping: "rooms", checkInTime: "rooms", checkOutTime: "rooms", minNights: "rooms", houseRules: "rooms", cancellationPolicy: "rooms",
  startingPrice: "pricing", priceLabel: "pricing", priceGroupSize: "pricing", priceNote: "pricing",
  riderNote: "amenities",
  city: "location", state: "location", locality: "location", addressLine: "location", latitude: "location", longitude: "location",
  metaTitle: "seo", metaDescription: "seo",
};

/** What the server will check before publishing — shown as it changes, not after a refusal. */
function readiness(d: Draft): { label: string; ok: boolean; tab: Tab }[] {
  return [
    { label: "At least one photo", ok: d.images.length > 0, tab: "gallery" },
    { label: "Every photo described", ok: d.images.length > 0 && d.images.every((i) => i.alt.trim()), tab: "gallery" },
    { label: "A description", ok: d.description.trim().length >= 40, tab: "basics" },
    { label: "Town or city", ok: Boolean(d.city.trim()), tab: "location" },
    { label: "How many it sleeps", ok: d.maxGuests > 0, tab: "rooms" },
  ];
}

/**
 * The property editor.
 *
 * Sections down the side keep a long form findable, with what still stands
 * between this stay and the website ticked off live underneath. The bar along
 * the top keeps status and Save in reach from anywhere. ⌘S saves. Leaving
 * with unsaved changes asks first. A slug change on a live page leaves a
 * redirect behind automatically. DPR §10.2
 */
export function PropertyEditor({
  initial,
  options,
  status: initialStatus,
  updatedAt,
  canPublish,
  canDelete,
}: {
  initial: Draft;
  options: { categories: Opt[]; destinations: (Opt & { state: string })[]; amenities: (Opt & { group: string })[]; facilities: Opt[]; experiences: Opt[] };
  status: string;
  updatedAt: string;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState<string>(updatedAt);
  const [status, setStatus] = useState(initialStatus);
  const [tab, setTab] = useState<Tab>("basics");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiving, setArchiving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useLargeTitle(titleRef, draft.name || "Untitled");

  const dirty = JSON.stringify(draft) !== saved;
  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value })), []);
  const checks = readiness(draft);
  const ready = checks.every((c) => c.ok);

  const save = useCallback(async () => {
    setSaving(true);
    const res = await saveProperty({ ...draft, images: draft.images.map(({ mediaId, alt }) => ({ mediaId, alt })) });
    setSaving(false);
    if (!res.ok) {
      const fields = res.fields ?? {};
      setErrors(fields);
      const first = Object.keys(fields)[0];
      if (first) setTab(FIELD_TAB[first.split(".")[0]!] ?? tab);
      toast({ kind: "error", title: res.error, body: first ? fields[first] : undefined });
      return false;
    }
    setErrors({});
    setSaved(JSON.stringify(draft));
    setSavedAt(res.data.savedAt);
    toast({ title: status === "PUBLISHED" ? "Saved — live on the website now" : "Saved" });
    router.refresh();
    return true;
  }, [draft, router, status, tab, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, save, saving]);

  const changeStatus = async (next: "PUBLISHED" | "UNPUBLISHED") => {
    setPublishing(true);
    if (dirty && !(await save())) return setPublishing(false);
    const res = await setPropertyStatus(draft.id, next);
    setPublishing(false);
    if (!res.ok) return toast({ kind: "error", title: next === "PUBLISHED" ? "Not ready to go live" : "Could not change status", body: res.error });
    setStatus(res.data);
    toast(
      next === "PUBLISHED"
        ? { title: `${draft.name} is live`, body: "It is on the website, in search and in the sitemap." }
        : { title: `${draft.name} is offline`, undo: () => changeStatus("PUBLISHED") },
    );
    router.refresh();
  };

  const err = (k: string) => errors[k];
  const errorTabs = new Set(Object.keys(errors).map((k) => FIELD_TAB[k.split(".")[0]!]));
  const statusBadge = status === "PUBLISHED" ? { tone: "ok" as const, label: "Live" } : status === "UNPUBLISHED" ? { tone: "warn" as const, label: "Offline" } : { tone: "neutral" as const, label: "Draft" };

  return (
    <>
      {/* The bar: title, state, and the actions that matter, always in reach. */}
      <div className="sticky top-[52px] z-20 -mx-4 mb-5 bg-pane/85 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-14 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
            <div className="flex items-center gap-2.5">
              <h1 ref={titleRef} className="truncate text-title text-fg sm:text-[1.75rem] sm:tracking-[-0.024em]">
                {draft.name || "Untitled"}
              </h1>
              <Badge tone={statusBadge.tone} dot>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="mt-0.5 h-5 text-subhead text-fg-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dirty ? "d" : "s"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className={cn("inline-flex items-center gap-1.5", dirty && "font-medium text-caution-text")}
                >
                  {dirty ? (
                    <>
                      <span className="size-1.5 rounded-full bg-caution" /> Unsaved changes ·{" "}
                      <span className="hidden sm:inline">
                        <ModKey />S to save
                      </span>
                    </>
                  ) : (
                    <>
                      <AdminIcon name="checkCircle" size={14} className="text-pos-text" /> Saved {time(savedAt)}
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Menu
              items={[
                ...(status === "PUBLISHED" ? [{ label: "View on the website", icon: "external" as const, href: `/stays/${initial.slug}`, external: true }] : []),
                { label: "Duplicate", icon: "copy", onSelect: () => duplicateProperty(draft.id) },
                ...(canPublish && status === "PUBLISHED" ? [{ label: "Take offline", icon: "eyeOff" as const, onSelect: () => changeStatus("UNPUBLISHED") }] : []),
                ...(canDelete ? ["separator" as const, { label: "Archive", icon: "trash" as const, destructive: true, onSelect: () => setArchiving(true) }] : []),
              ]}
              trigger={({ toggle, ref }) => <IconButton ref={ref} icon="more" label="More actions" tone="filled" onClick={toggle} />}
            />
            {canPublish && status !== "PUBLISHED" && (
              <Button variant={ready ? "tinted" : "secondary"} icon="globe" loading={publishing} onClick={() => changeStatus("PUBLISHED")}>
                Publish
              </Button>
            )}
            <SaveButton saving={saving} dirty={dirty} onClick={save} />
          </div>
        </div>
        {/* Phone and tablet: the sections as a strip. */}
        <div className="mt-3 lg:hidden">
          <Segmented id="property-tabs-m" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: t.label, count: t.value === "gallery" ? draft.images.length : undefined }))} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:gap-10">
        {/* Desktop: sections down the side, readiness beneath. */}
        <aside className="hidden lg:block">
          <div className="sticky top-[9.5rem] space-y-5">
            <nav aria-label="Sections" className="space-y-0.5">
              {TABS.map((t) => {
                const on = tab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTab(t.value)}
                    className={cn("relative flex h-9 w-full items-center gap-2.5 rounded-[11px] px-2.5 text-left text-callout font-medium transition-colors", on ? "text-fg" : "text-fg-2 hover:bg-fill hover:text-fg")}
                  >
                    {on && <motion.span layoutId="editor-tab" className="absolute inset-0 rounded-[11px] bg-panel shadow-tile dark:bg-fill-2" transition={{ type: "spring", bounce: 0, duration: 0.35 }} />}
                    <AdminIcon name={t.icon} size={17} className={cn("relative", on ? "text-accent-text" : "text-fg-3")} />
                    <span className="relative flex-1">{t.label}</span>
                    {errorTabs.has(t.value) ? (
                      <span className="relative size-2 rounded-full bg-neg" aria-label="Has errors" />
                    ) : t.value === "gallery" ? (
                      <span className="relative text-footnote tabular-nums text-fg-3">{draft.images.length}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
            {status !== "PUBLISHED" && (
              <div className="rounded-[18px] bg-panel p-4 shadow-tile">
                <p className="text-subhead font-semibold text-fg">{ready ? "Ready to go live" : "Before it can go live"}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {checks.map((c) => (
                    <li key={c.label}>
                      <button type="button" onClick={() => setTab(c.tab)} className="flex w-full items-center gap-2 text-left text-subhead">
                        <motion.span
                          key={String(c.ok)}
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                          className={cn("grid size-4 shrink-0 place-items-center rounded-full", c.ok ? "bg-pos text-white" : "shadow-[inset_0_0_0_1.5px_var(--d-fill-3)]")}
                        >
                          {c.ok && <AdminIcon name="check" size={10} strokeWidth={3.4} />}
                        </motion.span>
                        <span className={c.ok ? "text-fg-3" : "text-fg"}>{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="min-w-0 max-w-[52rem]"
          >
            {tab === "basics" && (
              <div className="space-y-4">
                <Card>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" required error={err("name")} count={draft.name.length} max={80} className="sm:col-span-2">
                      <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
                    </Field>
                    <Field label="Short line under the name" hint="One sentence a guest remembers." error={err("tagline")} count={draft.tagline.length} max={140} className="sm:col-span-2">
                      <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
                    </Field>
                    <Field label="Type" required error={err("categoryId")}>
                      <Select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                        {options.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Destination" required error={err("destinationId")}>
                      <Select value={draft.destinationId} onChange={(e) => set("destinationId", e.target.value)}>
                        {options.destinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}, {d.state}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </Card>
                <Card>
                  <Field label="About this stay" required hint="Leave a blank line between paragraphs." error={err("description")} count={draft.description.length} max={4000}>
                    <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} className="min-h-[14rem]" />
                  </Field>
                  <Field label="Why StaySutra recommends it" hint="In your own voice. It shows on the stay page, set apart." error={err("curatorNote")} count={(draft.curatorNote ?? "").length} max={600} className="mt-5">
                    <Textarea value={draft.curatorNote ?? ""} onChange={(e) => set("curatorNote", e.target.value)} />
                  </Field>
                </Card>
                <Card>
                  <Switch checked={draft.featured} onChange={(v) => set("featured", v)} label="Feature on the homepage" description="Featured stays lead the homepage, in the order below." />
                  <AnimatePresence initial={false}>
                    {draft.featured && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="overflow-hidden">
                        <Field label="Position" className="w-32 pt-4">
                          <Input type="number" min={1} max={99} value={draft.featureOrder ?? 1} onChange={(e) => set("featureOrder", num(e.target.value) ?? 1)} />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
                <Card>
                  <SlugField id={draft.id} value={draft.slug} original={initial.slug} live={status === "PUBLISHED"} error={err("slug")} onChange={(v) => set("slug", v)} />
                </Card>
              </div>
            )}

            {tab === "gallery" && <GalleryTab images={draft.images} onChange={(images) => set("images", images)} />}

            {tab === "rooms" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Capacity" />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stepper label="Sleeps up to" value={draft.maxGuests} min={1} onChange={(v) => set("maxGuests", v ?? 1)} error={err("maxGuests")} />
                    <Stepper label="Bedrooms" value={draft.bedrooms} onChange={(v) => set("bedrooms", v ?? 0)} />
                    <Stepper label="Bathrooms" value={draft.bathrooms} onChange={(v) => set("bathrooms", v ?? 0)} />
                    <Stepper label="Beds" value={draft.beds} onChange={(v) => set("beds", v)} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Where guests sleep" description="Room by room. Shown as cards on the stay page." />
                  <Repeater
                    rows={draft.sleeping}
                    onChange={(rows) => set("sleeping", rows)}
                    blank={{ room: "", beds: "" }}
                    addLabel="Add a room"
                    render={(row, update) => (
                      <div className="grid flex-1 gap-2 sm:grid-cols-2">
                        <Input value={row.room} onChange={(e) => update({ ...row, room: e.target.value })} placeholder="Bedroom 1" aria-label="Room" />
                        <Input value={row.beds} onChange={(e) => update({ ...row, beds: e.target.value })} placeholder="1 double bed" aria-label="Beds" />
                      </div>
                    )}
                  />
                </Card>
                <Card>
                  <CardHeader title="Times" description="Leave empty if they vary — the page then simply doesn’t list them." />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="Check-in from">
                      <Input type="time" value={draft.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} />
                    </Field>
                    <Field label="Check-out by">
                      <Input type="time" value={draft.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} />
                    </Field>
                    <Stepper label="Minimum nights" value={draft.minNights} min={1} onChange={(v) => set("minNights", v ?? 1)} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="House rules" />
                  <Repeater
                    rows={draft.houseRules}
                    onChange={(rows) => set("houseRules", rows)}
                    blank=""
                    addLabel="Add a rule"
                    render={(row, update) => <Input value={row} onChange={(e) => update(e.target.value)} placeholder="Quiet hours after 10 pm" className="flex-1" />}
                  />
                  <Field label="Cancellation terms" hint="Leave empty to use the site-wide policy." className="mt-5" count={(draft.cancellationPolicy ?? "").length} max={1200}>
                    <Textarea value={draft.cancellationPolicy ?? ""} onChange={(e) => set("cancellationPolicy", e.target.value)} />
                  </Field>
                </Card>
              </div>
            )}

            {tab === "pricing" && <PricingTab draft={draft} set={set} err={err} />}

            {tab === "amenities" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader title="Amenities" description="Tap to switch on. The list itself is managed under Destinations." />
                  {Object.entries(groupBy(options.amenities, (a) => a.group)).map(([group, items]) => (
                    <div key={group} className="mb-5 last:mb-0">
                      <p className="mb-2 text-subhead font-semibold text-fg-2">{group}</p>
                      <Chips items={items} value={draft.amenityIds} onChange={(v) => set("amenityIds", v)} />
                    </div>
                  ))}
                </Card>
                <Card>
                  <Switch checked={draft.isRiderFriendly} onChange={(v) => set("isRiderFriendly", v)} label="Rider-friendly" description="Listed on the rider-friendly page, with the facilities below." />
                  <AnimatePresence initial={false}>
                    {draft.isRiderFriendly && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }} className="overflow-hidden">
                        <div className="space-y-5 pt-5">
                          <Chips items={options.facilities} value={draft.facilityIds} onChange={(v) => set("facilityIds", v)} />
                          <Field label="For the bike — in a sentence" count={(draft.riderNote ?? "").length} max={400} error={err("riderNote")}>
                            <Textarea value={draft.riderNote ?? ""} onChange={(e) => set("riderNote", e.target.value)} className="min-h-[5rem]" />
                          </Field>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
                <Card>
                  <CardHeader title="Things to do" />
                  <Chips items={options.experiences} value={draft.experienceIds} onChange={(v) => set("experienceIds", v)} />
                </Card>
              </div>
            )}

            {tab === "location" && (
              <Card>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Village or area" error={err("locality")}>
                    <Input value={draft.locality ?? ""} onChange={(e) => set("locality", e.target.value)} placeholder="Kashele" />
                  </Field>
                  <Field label="Town or city" required error={err("city")}>
                    <Input value={draft.city} onChange={(e) => set("city", e.target.value)} />
                  </Field>
                  <Field label="State" error={err("state")}>
                    <Input value={draft.state} onChange={(e) => set("state", e.target.value)} />
                  </Field>
                  <Field label="Street address" hint="Never shown publicly — shared with guests once confirmed.">
                    <Input value={draft.addressLine ?? ""} onChange={(e) => set("addressLine", e.target.value)} />
                  </Field>
                  <Field label="Latitude" hint="From Google Maps: long-press the spot, copy the numbers." error={err("latitude")}>
                    <Input inputMode="decimal" value={draft.latitude ?? ""} onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))} />
                  </Field>
                  <Field label="Longitude" error={err("longitude")}>
                    <Input inputMode="decimal" value={draft.longitude ?? ""} onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))} />
                  </Field>
                </div>
                {draft.latitude != null && draft.longitude != null && (
                  <a href={`https://www.google.com/maps?q=${draft.latitude},${draft.longitude}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-fill px-3.5 py-2 text-subhead font-semibold text-fg transition-colors hover:bg-fill-2">
                    <AdminIcon name="pin" size={15} className="text-accent-text" />
                    Check the pin on Google Maps
                    <AdminIcon name="arrowUpRight" size={13} className="text-fg-3" />
                  </a>
                )}
              </Card>
            )}

            {tab === "seo" && (
              <Card>
                <CardHeader title="How it looks in Google" description="Optional. Leave empty and the name and short line are used." />
                <div className="rounded-[16px] bg-white p-4 text-left shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
                  <p className="truncate text-[0.8125rem] text-[#4d5156]">staysutra.in › stays › {draft.slug}</p>
                  <p className="mt-1 truncate text-[1.125rem] text-[#1a0dab]">{draft.metaTitle || `${draft.name} · StaySutra`}</p>
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-[#4d5156]">{draft.metaDescription || draft.tagline || draft.description.slice(0, 160)}</p>
                </div>
                <div className="mt-5 space-y-5">
                  <Field label="Search title" count={(draft.metaTitle ?? "").length} max={70} error={err("metaTitle")}>
                    <Input value={draft.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value)} />
                  </Field>
                  <Field label="Search description" count={(draft.metaDescription ?? "").length} max={170} error={err("metaDescription")}>
                    <Textarea value={draft.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} className="min-h-[5rem]" />
                  </Field>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={archiving}
        title={`Archive ${draft.name}?`}
        body="It leaves the website and this list. Enquiries and calendar history are kept."
        confirmLabel="Archive"
        onCancel={() => setArchiving(false)}
        onConfirm={async () => {
          const res = await archiveProperty(draft.id);
          setArchiving(false);
          if (!res.ok) return toast({ kind: "error", title: res.error });
          toast({
            title: "Archived",
            undo: async () => {
              await archiveProperty(draft.id, true);
              router.push(`/dashboard/properties/${draft.id}`);
            },
          });
          router.push("/dashboard/properties");
        }}
      />
    </>
  );
}

/* — Web address, checked as you type ———————————————————————————— */

function SlugField({ id, value, original, live, error, onChange }: { id: string; value: string; original: string; live: boolean; error?: string; onChange: (v: string) => void }) {
  const [state, setState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  useEffect(() => {
    if (!value || value === original) return setState("idle");
    setState("checking");
    const t = setTimeout(async () => {
      try {
        setState((await checkSlug(value, id)) ? "free" : "taken");
      } catch {
        setState("idle");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value, original, id]);

  return (
    <Field
      label="Web address"
      error={error ?? (state === "taken" ? "Another property already uses this address." : null)}
      hint={
        <>
          staysutra.in/stays/<span className="font-medium text-fg-2">{value || "…"}</span>
          {live && value !== original && " · the old address will redirect here"}
        </>
      }
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        invalid={state === "taken"}
        trailing={
          state === "checking" ? (
            <Spinner size={15} className="mr-1 text-fg-3" />
          ) : state === "free" ? (
            <AdminIcon name="checkCircle" size={18} className="mr-0.5 text-pos-text" aria-label="Available" />
          ) : state === "taken" ? (
            <AdminIcon name="xCircle" size={18} className="mr-0.5 text-neg-text" aria-label="Taken" />
          ) : null
        }
      />
    </Field>
  );
}

/* — Pricing ——————————————————————————————————————————————————— */

function PricingTab({ draft, set, err }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; err: (k: string) => string | undefined }) {
  const each = draft.startingPrice && draft.priceGroupSize ? Math.round(draft.startingPrice / draft.priceGroupSize / 50) * 50 : null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Price" description="For display — there is no payment on the site. Leave empty to show “Price on request”." />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price per night" error={err("startingPrice")}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.startingPrice ?? ""}
              onChange={(e) => set("startingPrice", num(e.target.value))}
              leading={<span className="text-callout font-medium">₹</span>}
              className="tabular-nums"
            />
          </Field>
          <Field label="Shown as" hint="“From”, “Weekends”…" error={err("priceLabel")}>
            <Input value={draft.priceLabel ?? ""} onChange={(e) => set("priceLabel", e.target.value)} placeholder="From" maxLength={24} />
          </Field>
          <Stepper label="For a group of" hint="Shows the per-guest figure" value={draft.priceGroupSize} onChange={(v) => set("priceGroupSize", v)} />
        </div>
        <Field label="The small print" className="mt-5" count={(draft.priceNote ?? "").length} max={240} error={err("priceNote")}>
          <Textarea value={draft.priceNote ?? ""} onChange={(e) => set("priceNote", e.target.value)} className="min-h-[5rem]" />
        </Field>
      </Card>
      <AnimatePresence initial={false}>
        {draft.startingPrice ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
            <p className="mb-2 px-1 text-subhead font-semibold text-fg-2">Guests will see</p>
            {/* The website's own look, so the preview is honest. */}
            <div className="rounded-[20px] bg-[#0a1628] p-6 text-white shadow-tile">
              <p className="flex items-baseline gap-2">
                <span className="text-[0.75rem] uppercase tracking-[0.14em] text-white/60">{draft.priceLabel || "From"}</span>
                <span className="font-display text-[1.875rem] font-extrabold tracking-[-0.02em]">{inr(draft.startingPrice)}</span>
                <span className="text-[0.8125rem] text-white/60">/ night</span>
              </p>
              {each && <p className="mt-1 text-[0.875rem] font-medium text-[#f2c75c]">≈ {inr(each)} per guest for {draft.priceGroupSize}</p>}
              {draft.priceNote && <p className="mt-3 text-[0.8125rem] leading-relaxed text-white/60">{draft.priceNote}</p>}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* — Gallery ——————————————————————————————————————————————————— */

function GalleryTab({ images, onChange }: { images: Img[]; onChange: (images: Img[]) => void }) {
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const latest = useRef(images);
  latest.current = images;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const add = useCallback(
    (items: { id: string; src: string; alt: string }[]) => {
      const now = latest.current;
      onChange([...now, ...items.filter((i) => !now.some((x) => x.mediaId === i.id)).map((i) => ({ mediaId: i.id, src: i.src, alt: i.alt }))]);
    },
    [onChange],
  );
  const { uploads, start, dismiss, retry, cancel } = useUploader("Properties", useCallback((item) => add([item]), [add]), "property-gallery");

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (!e.over || e.active.id === e.over.id) return;
    const from = images.findIndex((i) => i.mediaId === e.active.id);
    const to = images.findIndex((i) => i.mediaId === e.over!.id);
    onChange(arrayMove(images, from, to));
  };

  const missing = images.filter((i) => !i.alt.trim()).length;
  const active = images.find((i) => i.mediaId === dragging);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Photos"
          description="Drag to reorder. The first is the cover everywhere — cards, search results, link previews."
          action={
            <Button size="sm" variant="secondary" icon="media" onClick={() => setPicker(true)}>
              From library
            </Button>
          }
        />
        <AnimatePresence initial={false}>
          {missing > 0 && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <span className="mb-4 flex items-center gap-2 rounded-[14px] bg-caution/12 px-3.5 py-2.5 text-subhead font-medium text-caution-text">
                <AdminIcon name="alert" size={15} />
                {missing} {missing === 1 ? "photo needs" : "photos need"} a description before this can go live.
              </span>
            </motion.p>
          )}
        </AnimatePresence>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <SortableContext items={images.map((i) => i.mediaId)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => (
                <SortableImage
                  key={img.mediaId}
                  img={img}
                  index={i}
                  onAlt={(alt) => onChange(images.map((x) => (x.mediaId === img.mediaId ? { ...x, alt } : x)))}
                  onCover={() => onChange([img, ...images.filter((x) => x.mediaId !== img.mediaId)])}
                  onRemove={() => {
                    const before = images;
                    onChange(images.filter((x) => x.mediaId !== img.mediaId));
                    toast({ title: "Photo removed from the gallery", body: "Save to make it final.", undo: () => onChange(before) });
                  }}
                />
              ))}
              <UploadTiles uploads={uploads} onDismiss={dismiss} onRetry={retry} onCancel={cancel} />
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 260, easing: "cubic-bezier(0.2, 0.9, 0.1, 1)" }}>
            {active ? (
              <div className="relative aspect-[4/3] scale-[1.04] overflow-hidden rounded-[14px] shadow-lift ring-2 ring-accent">
                <Image src={active.src} alt="" fill sizes="300px" className="object-cover" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <div className={images.length || uploads.length ? "mt-4" : ""}>
          <DropZone onFiles={start} compact={images.length > 0} />
        </div>
      </Card>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={add} multiple title="Add photos" folder="Properties" />
    </div>
  );
}

function SortableImage({ img, index, onAlt, onCover, onRemove }: { img: Img; index: number; onAlt: (v: string) => void; onCover: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.mediaId });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative", isDragging && "opacity-30")}>
      <div {...attributes} {...listeners} className="group relative aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-[14px] bg-fill-2 active:cursor-grabbing">
        <Image src={img.src} alt={img.alt} fill sizes="(min-width:640px) 30vw, 45vw" className="pointer-events-none object-cover" draggable={false} />
        {index === 0 ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-caption font-bold text-accent-fg shadow">
            <AdminIcon name="star" size={11} strokeWidth={2.4} /> Cover
          </span>
        ) : (
          <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-black/55 text-caption font-bold text-white backdrop-blur">{index + 1}</span>
        )}
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/45 text-white opacity-80 backdrop-blur transition-opacity group-hover:opacity-100">
          <AdminIcon name="grip" size={14} />
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-0.5">
        <input
          value={img.alt}
          onChange={(e) => onAlt(e.target.value)}
          placeholder="Describe this photo"
          maxLength={200}
          aria-label={`Description for photo ${index + 1}`}
          className={cn(
            "h-8 min-w-0 flex-1 rounded-[9px] bg-transparent px-2 text-subhead text-fg transition-colors placeholder:font-medium placeholder:text-caution-text hover:bg-fill focus:bg-field focus:shadow-[0_0_0_1.5px_var(--d-accent)] focus:outline-none",
          )}
        />
        {index > 0 && <IconButton icon="star" label="Make cover" size={30} onClick={onCover} />}
        <IconButton icon="trash" label="Remove" size={30} onClick={onRemove} />
      </div>
    </div>
  );
}

/* — Small parts ——————————————————————————————————————————————— */

function Chips({ items, value, onChange }: { items: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = value.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== it.id) : [...value, it.id])}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-subhead font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-95",
              on ? "bg-accent/18 text-accent-text shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--d-accent)_55%,transparent)]" : "bg-fill text-fg-2 hover:bg-fill-2 hover:text-fg",
            )}
          >
            <AnimatePresence initial={false}>
              {on && (
                <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="overflow-hidden">
                  <AdminIcon name="check" size={14} strokeWidth={2.4} />
                </motion.span>
              )}
            </AnimatePresence>
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

function Repeater<T>({ rows, onChange, blank, addLabel, render }: { rows: T[]; onChange: (rows: T[]) => void; blank: T; addLabel: string; render: (row: T, update: (r: T) => void) => React.ReactNode }) {
  return (
    <div>
      <AnimatePresence initial={false}>
        {rows.map((row, i) => (
          <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.28 }} className="overflow-hidden">
            <div className="flex items-start gap-2 pb-2">
              {render(row, (r) => onChange(rows.map((x, j) => (j === i ? r : x))))}
              <IconButton icon="minus" label="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="mt-0.5 text-neg-text hover:bg-neg/10 hover:text-neg-text" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange([...rows, blank])} className="mt-1 text-accent-text">
        {addLabel}
      </Button>
    </div>
  );
}

/** A number with − and + either side — easy with a thumb, still typeable. */
function Stepper({ label, value, onChange, error, hint, min = 0 }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; hint?: string; min?: number }) {
  const v = value ?? 0;
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="flex h-10 items-center rounded-[11px] bg-field shadow-[inset_0_0_0_1px_var(--d-line-2)]">
        <button type="button" aria-label={`Fewer — ${label}`} disabled={v <= min} onClick={() => onChange(Math.max(min, v - 1))} className="grid h-full w-9 shrink-0 place-items-center rounded-l-[11px] text-fg-2 hover:bg-fill active:bg-fill-2 disabled:opacity-30">
          <AdminIcon name="minus" size={15} strokeWidth={2} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          value={value ?? ""}
          onChange={(e) => onChange(num(e.target.value))}
          aria-label={label}
          className="h-full w-full min-w-0 bg-transparent text-center text-body font-semibold tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" aria-label={`More — ${label}`} onClick={() => onChange(v + 1)} className="grid h-full w-9 shrink-0 place-items-center rounded-r-[11px] text-fg-2 hover:bg-fill active:bg-fill-2">
          <AdminIcon name="plus" size={15} strokeWidth={2} />
        </button>
      </div>
    </Field>
  );
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, it) => {
    (acc[key(it)] ??= []).push(it);
    return acc;
  }, {});
}

function time(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(iso));
}

