"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, ButtonLink, Card, CardHeader, Field, IconButton, Input, Segmented, Select, Switch, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/sheet";
import { DropZone, MediaPicker, UploadTiles, useUploader } from "@/components/admin/media-picker";
import { cn, inr } from "@/lib/utils";
import { archiveProperty, duplicateProperty, saveProperty, setPropertyStatus, type PropertyInput } from "../actions";

type Img = { mediaId: string; alt: string; src: string };
type Draft = Omit<PropertyInput, "images"> & { images: Img[] };
type Opt = { id: string; name: string };

const TABS = [
  { value: "basics", label: "Basics" },
  { value: "gallery", label: "Photos" },
  { value: "rooms", label: "Rooms & rules" },
  { value: "pricing", label: "Pricing" },
  { value: "amenities", label: "Amenities" },
  { value: "location", label: "Location" },
  { value: "seo", label: "Search" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const FIELD_TAB: Record<string, Tab> = {
  name: "basics", slug: "basics", tagline: "basics", description: "basics", categoryId: "basics", destinationId: "basics", curatorNote: "basics",
  images: "gallery",
  maxGuests: "rooms", bedrooms: "rooms", bathrooms: "rooms", beds: "rooms", sleeping: "rooms", checkInTime: "rooms", checkOutTime: "rooms", minNights: "rooms", houseRules: "rooms", cancellationPolicy: "rooms",
  startingPrice: "pricing", priceLabel: "pricing", priceGroupSize: "pricing", priceNote: "pricing",
  riderNote: "amenities",
  city: "location", state: "location", locality: "location", addressLine: "location", latitude: "location", longitude: "location",
  metaTitle: "seo", metaDescription: "seo",
};

/**
 * The property editor.
 *
 * Tabs keep a long form findable; the sticky bar keeps status and the save
 * button in reach from anywhere in it. ⌘S saves. Leaving with unsaved changes
 * asks first. Publishing is refused with a specific list of what is missing,
 * never a vague "invalid". A slug change on a live page leaves a redirect
 * behind automatically. DPR §10.2
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiving, setArchiving] = useState(false);

  const dirty = JSON.stringify(draft) !== saved;
  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value })), []);

  const save = useCallback(async () => {
    setSaving(true);
    const res = await saveProperty({ ...draft, images: draft.images.map(({ mediaId, alt }) => ({ mediaId, alt })) });
    setSaving(false);
    if (!res.ok) {
      const fields = res.fields ?? {};
      setErrors(fields);
      const first = Object.keys(fields)[0];
      if (first) setTab(FIELD_TAB[first.split(".")[0]!] ?? tab);
      return toast({ kind: "error", title: res.error, body: first ? fields[first] : undefined });
    }
    setErrors({});
    setSaved(JSON.stringify(draft));
    setSavedAt(res.data.savedAt);
    toast({ title: status === "PUBLISHED" ? "Saved — live on the website now" : "Saved" });
    router.refresh();
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
    if (dirty) await save();
    const res = await setPropertyStatus(draft.id, next);
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

  return (
    <>
      {/* Sticky action bar */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-white/[0.06] bg-ink-900/85 px-4 py-3 backdrop-blur-xl sm:top-16 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-[1.25rem] tracking-[-0.02em] text-text-hi sm:text-[1.5rem]" style={{ fontWeight: 800 }}>
                {draft.name || "Untitled"}
              </h1>
              <Badge tone={status === "PUBLISHED" ? "ok" : status === "UNPUBLISHED" ? "warn" : "neutral"} dot>
                {status === "PUBLISHED" ? "Live" : status === "UNPUBLISHED" ? "Offline" : "Draft"}
              </Badge>
            </div>
            <p className="mt-0.5 text-[0.8125rem] text-text-low">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={dirty ? "d" : "s"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }} className={cn("inline-flex items-center gap-1.5", dirty && "text-warn")}>
                  {dirty ? <>Unsaved changes · <kbd className="font-sans">⌘S</kbd> to save</> : <>Saved · {time(savedAt)}</>}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status === "PUBLISHED" && <ButtonLink href={`/stays/${initial.slug}`} external icon="external" variant="ghost">View live</ButtonLink>}
            {canPublish && (status === "PUBLISHED" ? (
              <Button variant="ghost" onClick={() => changeStatus("UNPUBLISHED")}>Take offline</Button>
            ) : (
              <Button onClick={() => changeStatus("PUBLISHED")} icon="globe">Publish</Button>
            ))}
            <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>Save</Button>
          </div>
        </div>
        <Segmented id="property-tabs" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: t.label, count: t.value === "gallery" ? draft.images.length : undefined }))} className="mt-3" />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.25 }}
          className="max-w-[56rem]"
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
                      {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Destination" required error={err("destinationId")}>
                    <Select value={draft.destinationId} onChange={(e) => set("destinationId", e.target.value)}>
                      {options.destinations.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.state}</option>)}
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
                {draft.featured && (
                  <Field label="Order" className="mt-4 w-32">
                    <Input type="number" min={1} max={99} value={draft.featureOrder ?? 1} onChange={(e) => set("featureOrder", num(e.target.value) ?? 1)} />
                  </Field>
                )}
              </Card>
              <Card>
                <Field label="Web address" hint={`staysutra.in/stays/${draft.slug}${status === "PUBLISHED" && draft.slug !== initial.slug ? " · the old address will redirect here" : ""}`} error={err("slug")}>
                  <Input value={draft.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
                </Field>
              </Card>
            </div>
          )}

          {tab === "gallery" && <GalleryTab images={draft.images} onChange={(images) => set("images", images)} />}

          {tab === "rooms" && (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Capacity" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <NumberField label="Sleeps up to" value={draft.maxGuests} onChange={(v) => set("maxGuests", v ?? 1)} error={err("maxGuests")} />
                  <NumberField label="Bedrooms" value={draft.bedrooms} onChange={(v) => set("bedrooms", v ?? 0)} />
                  <NumberField label="Bathrooms" value={draft.bathrooms} onChange={(v) => set("bathrooms", v ?? 0)} />
                  <NumberField label="Beds" value={draft.beds} onChange={(v) => set("beds", v)} />
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
                  <Field label="Check-in from"><Input type="time" value={draft.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} /></Field>
                  <Field label="Check-out by"><Input type="time" value={draft.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} /></Field>
                  <NumberField label="Minimum nights" value={draft.minNights} onChange={(v) => set("minNights", v ?? 1)} />
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
                <CardHeader title="Amenities" description="Tap to switch on. The list itself is managed under Destinations & lists." />
                {Object.entries(groupBy(options.amenities, (a) => a.group)).map(([group, items]) => (
                  <div key={group} className="mb-5 last:mb-0">
                    <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-text-dim">{group}</p>
                    <Chips items={items} value={draft.amenityIds} onChange={(v) => set("amenityIds", v)} />
                  </div>
                ))}
              </Card>
              <Card>
                <Switch checked={draft.isRiderFriendly} onChange={(v) => set("isRiderFriendly", v)} label="Rider-friendly" description="Listed on the rider-friendly page, with the facilities below." />
                {draft.isRiderFriendly && (
                  <div className="mt-5 space-y-5">
                    <Chips items={options.facilities} value={draft.facilityIds} onChange={(v) => set("facilityIds", v)} />
                    <Field label="For the bike — in a sentence" count={(draft.riderNote ?? "").length} max={400} error={err("riderNote")}>
                      <Textarea value={draft.riderNote ?? ""} onChange={(e) => set("riderNote", e.target.value)} className="min-h-[5rem]" />
                    </Field>
                  </div>
                )}
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
                <Field label="Village or area" error={err("locality")}><Input value={draft.locality ?? ""} onChange={(e) => set("locality", e.target.value)} placeholder="Kashele" /></Field>
                <Field label="Town or city" required error={err("city")}><Input value={draft.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="State" error={err("state")}><Input value={draft.state} onChange={(e) => set("state", e.target.value)} /></Field>
                <Field label="Street address" hint="Never shown publicly — shared with guests once confirmed."><Input value={draft.addressLine ?? ""} onChange={(e) => set("addressLine", e.target.value)} /></Field>
                <Field label="Latitude" hint="From Google Maps: long-press the spot, copy the numbers." error={err("latitude")}>
                  <Input inputMode="decimal" value={draft.latitude ?? ""} onChange={(e) => set("latitude", e.target.value === "" ? null : Number(e.target.value))} />
                </Field>
                <Field label="Longitude" error={err("longitude")}>
                  <Input inputMode="decimal" value={draft.longitude ?? ""} onChange={(e) => set("longitude", e.target.value === "" ? null : Number(e.target.value))} />
                </Field>
              </div>
              {draft.latitude != null && draft.longitude != null && (
                <a href={`https://www.google.com/maps?q=${draft.latitude},${draft.longitude}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-gold-400 hover:underline">
                  Check the pin on Google Maps <AdminIcon name="external" size={13} />
                </a>
              )}
            </Card>
          )}

          {tab === "seo" && (
            <Card>
              <CardHeader title="How it looks in Google" description="Optional. Leave empty and the name and short line are used." />
              <div className="rounded-[14px] bg-white p-4 text-left">
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

      {/* Housekeeping */}
      <div className="mt-10 flex max-w-[56rem] flex-wrap gap-2 border-t border-white/[0.06] pt-6">
        <form action={duplicateProperty.bind(null, draft.id)}>
          <Button type="submit" variant="ghost" icon="copy">Duplicate</Button>
        </form>
        {canDelete && <Button variant="ghost" icon="trash" onClick={() => setArchiving(true)} className="text-[#ff9b93]">Archive</Button>}
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
          toast({ title: "Archived", undo: async () => { await archiveProperty(draft.id, true); router.push(`/dashboard/properties/${draft.id}`); } });
          router.push("/dashboard/properties");
        }}
      />
    </>
  );
}

/* — Pricing ——————————————————————————————————————————————————— */

function PricingTab({ draft, set, err }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; err: (k: string) => string | undefined }) {
  const each = draft.startingPrice && draft.priceGroupSize ? Math.round(draft.startingPrice / draft.priceGroupSize / 50) * 50 : null;
  return (
    <Card>
      <CardHeader title="Price" description="Display only — there is no payment on the site. Leave empty to show “Price on request”." />
      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField label="Price per night (₹)" value={draft.startingPrice} onChange={(v) => set("startingPrice", v)} error={err("startingPrice")} />
        <Field label="Shown as" hint="“From”, “Weekends”…" error={err("priceLabel")}>
          <Input value={draft.priceLabel ?? ""} onChange={(e) => set("priceLabel", e.target.value)} placeholder="From" maxLength={24} />
        </Field>
        <NumberField label="For a group of" hint="Shows the per-guest figure" value={draft.priceGroupSize} onChange={(v) => set("priceGroupSize", v)} />
      </div>
      <Field label="The small print" className="mt-5" count={(draft.priceNote ?? "").length} max={240} error={err("priceNote")}>
        <Textarea value={draft.priceNote ?? ""} onChange={(e) => set("priceNote", e.target.value)} className="min-h-[5rem]" />
      </Field>
      {draft.startingPrice ? (
        <div className="mt-6 rounded-[16px] bg-[#060c17] p-5 ring-1 ring-inset ring-white/[0.07]">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-dim">Guests will see</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-[0.75rem] uppercase tracking-[0.14em] text-text-low">{draft.priceLabel || "From"}</span>
            <span className="font-display text-[1.75rem] text-text-hi" style={{ fontWeight: 800 }}>{inr(draft.startingPrice)}</span>
            <span className="text-[0.8125rem] text-text-low">/ night</span>
          </p>
          {each && <p className="mt-1 text-[0.875rem] font-medium text-gold-400">≈ {inr(each)} per guest for {draft.priceGroupSize}</p>}
        </div>
      ) : null}
    </Card>
  );
}

/* — Gallery ——————————————————————————————————————————————————— */

function GalleryTab({ images, onChange }: { images: Img[]; onChange: (images: Img[]) => void }) {
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const add = useCallback((items: { id: string; src: string; alt: string }[]) => {
    onChange([...images, ...items.filter((i) => !images.some((x) => x.mediaId === i.id)).map((i) => ({ mediaId: i.id, src: i.src, alt: i.alt }))]);
  }, [images, onChange]);
  const { uploads, start, dismiss } = useUploader("Properties", useCallback((item) => add([item]), [add]));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = images.findIndex((i) => i.mediaId === e.active.id);
    const to = images.findIndex((i) => i.mediaId === e.over!.id);
    onChange(arrayMove(images, from, to));
  };

  const missing = images.filter((i) => !i.alt.trim()).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Photos"
          description="Drag to reorder. The first photo is the cover everywhere — cards, search results, link previews."
          action={<Button size="sm" icon="media" onClick={() => setPicker(true)}>From library</Button>}
        />
        {missing > 0 && (
          <p className="mb-4 flex items-center gap-2 rounded-[12px] bg-warn/10 px-3.5 py-2.5 text-[0.8125rem] text-[#f5c46a] ring-1 ring-inset ring-warn/25">
            <AdminIcon name="alert" size={15} />
            {missing} {missing === 1 ? "photo needs" : "photos need"} a description before this can go live.
          </p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
              <UploadTiles uploads={uploads} onDismiss={dismiss} />
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-4">
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
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative rounded-[14px] bg-white/[0.03] p-1.5 ring-1 ring-inset ring-white/[0.06]", isDragging && "z-10 scale-[1.03] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] ring-gold-500/60")}
    >
      <div {...attributes} {...listeners} className="relative aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-[10px] bg-ink-700 active:cursor-grabbing">
        <Image src={img.src} alt={img.alt} fill sizes="(min-width:640px) 30vw, 45vw" className="pointer-events-none object-cover" draggable={false} />
        {index === 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold-ink">Cover</span>
        ) : (
          <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-black/55 text-[0.6875rem] font-semibold text-white backdrop-blur">{index + 1}</span>
        )}
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><AdminIcon name="grip" size={14} /></span>
      </div>
      <div className="flex items-center gap-1 pt-1.5">
        <input
          value={img.alt}
          onChange={(e) => onAlt(e.target.value)}
          placeholder="Describe this photo"
          maxLength={200}
          className={cn("h-8 min-w-0 flex-1 rounded-[8px] bg-transparent px-2 text-[0.8125rem] text-text-hi placeholder:text-[#f5c46a]/80 focus:bg-[#060c17] focus:outline-none focus:ring-1 focus:ring-gold-500/60")}
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
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-medium ring-1 ring-inset transition-[background-color,color,transform] duration-150 active:scale-95",
              on ? "bg-gold-500/15 text-gold-400 ring-gold-500/40" : "text-text-low ring-white/[0.1] hover:text-text-mid hover:ring-white/20",
            )}
          >
            <AnimatePresence initial={false}>
              {on && (
                <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="overflow-hidden">
                  <AdminIcon name="check" size={14} strokeWidth={2.2} />
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
          <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="overflow-hidden">
            <div className="flex items-start gap-2 pb-2">
              {render(row, (r) => onChange(rows.map((x, j) => (j === i ? r : x))))}
              <IconButton icon="minus" label="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="mt-0.5" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button size="sm" variant="ghost" icon="plus" onClick={() => onChange([...rows, blank])} className="mt-1">{addLabel}</Button>
    </div>
  );
}

function NumberField({ label, value, onChange, error, hint }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <Input type="number" inputMode="numeric" min={0} value={value ?? ""} onChange={(e) => onChange(num(e.target.value))} className="tabular-nums" />
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
