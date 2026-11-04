"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge, Button, Card, EmptyState, FadeImage, Field, Input, PageHeader, PhotoBadge, SaveButton, Segmented, Switch, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { ConfirmDialog, Sheet, usePortalTarget } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { UploadTiles, useUploader } from "@/components/admin/media-picker";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { deleteMedia, updateMedia, type MediaItem } from "./actions";

type Filter = "all" | "missing" | "unused" | string;

/**
 * The media library. Every photo the site can use, with what it is used by,
 * and a nudge — never a block — towards describing each one. A description is
 * required only at the point a photo goes onto a live page. DPR §10.3
 *
 * Photos can be dropped anywhere on this screen; each one shows its own
 * progress where it will land, and the session-wide tray keeps the total.
 */
export function MediaLibrary({ initial, initialFilter }: { initial: MediaItem[]; initialFilter: Filter }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<MediaItem | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const onUploaded = useCallback(() => router.refresh(), [router]);
  const { uploads, start, dismiss, retry, cancel } = useUploader(null, onUploaded, "library");

  const folders = useMemo(() => [...new Set(items.map((i) => i.folder).filter((f): f is string => Boolean(f)))].sort(), [items]);
  const missing = items.filter((i) => !i.alt && !i.isDecorative).length;
  const unused = items.filter((i) => !i.uses).length;
  const totalMb = items.reduce((n, i) => n + i.sizeBytes, 0) / 1048576;

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filter === "missing" && (m.alt || m.isDecorative)) return false;
      if (filter === "unused" && m.uses > 0) return false;
      if (!["all", "missing", "unused"].includes(filter) && m.folder !== filter) return false;
      return !n || `${m.alt} ${m.originalName}`.toLowerCase().includes(n);
    });
  }, [items, filter, q]);

  // A server refresh (after an upload) brings the new list.
  useEffect(() => setItems(initial), [initial]);

  return (
    <>
      <PageHeader
        title="Media"
        description={`${items.length} photos · ${totalMb.toFixed(0)} MB. Uploads are resized, turned upright and stripped of location data automatically.`}
        actions={
          <>
            <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => {
              if (e.target.files?.length) start(e.target.files);
              e.target.value = "";
            }} />
            <Button variant="primary" icon="upload" onClick={() => input.current?.click()}>
              Upload photos
            </Button>
          </>
        }
      />

      <PageDrop onFiles={start} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="media-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: items.length },
            { value: "missing", label: "Needs description", count: missing },
            { value: "unused", label: "Unused", count: unused },
            ...folders.map((f) => ({ value: f, label: f })),
          ]}
        />
        <div className="lg:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search descriptions and file names" leading={<AdminIcon name="search" size={15} />} aria-label="Search photos" />
        </div>
      </div>

      {shown.length || uploads.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          <UploadTiles uploads={uploads} onDismiss={dismiss} onRetry={retry} onCancel={cancel} />
          {shown.map((m) => (
            <button key={m.id} type="button" onClick={() => setOpen(m)} className="group rounded-[16px] text-left outline-offset-4 transition-transform duration-150 active:scale-[0.97]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-fill-2">
                <FadeImage
                  src={m.src}
                  alt={m.alt}
                  fill
                  sizes="(min-width:1536px) 18vw, (min-width:1024px) 23vw, 45vw"
                  className="object-cover transition-transform duration-[700ms] ease-[var(--ease-emph)] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
                  {!m.alt && !m.isDecorative ? <PhotoBadge tone="warn" dot>No description</PhotoBadge> : <span />}
                  {m.uses > 0 && <PhotoBadge tone="ok" dot>In use</PhotoBadge>}
                </div>
              </div>
              <p className={cn("mt-2 line-clamp-2 px-1 text-subhead leading-snug", m.alt ? "text-fg-2" : "text-fg-4")}>{m.alt || m.originalName}</p>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="media"
            title={items.length ? "Nothing here" : "No photos yet"}
            body={items.length ? "Try another filter, or search for something else." : "Drop photos anywhere on this page, or choose them with Upload photos."}
            action={!items.length && <Button variant="primary" icon="upload" onClick={() => input.current?.click()}>Upload photos</Button>}
          />
        </Card>
      )}

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.originalName} subtitle={open ? `${open.width} × ${open.height} · ${(open.sizeBytes / 1024).toFixed(0)} KB` : ""} width={560}>
        {open && (
          <MediaForm
            key={open.id}
            item={open}
            folders={folders}
            onChange={(next) => {
              setItems((all) => all.map((x) => (x.id === next.id ? next : x)));
              setOpen(next);
            }}
            onDeleted={(id) => {
              setItems((all) => all.filter((x) => x.id !== id));
              setOpen(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/**
 * Drag photos over any part of the window and the whole page offers to take
 * them — no need to aim for a box.
 */
function PageDrop({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [over, setOver] = useState(false);
  const reduced = useReducedMotion();
  const target = usePortalTarget();
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setOver(false);
    };
    const overFn = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      if (e.dataTransfer?.files.length) onFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, [onFiles]);

  if (!target) return null;
  return createPortal(
    <AnimatePresence>
      {over && (
        <motion.div className="pointer-events-none fixed inset-0 z-[96] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[var(--d-scrim)] backdrop-blur-[3px]" />
          <motion.div
            initial={reduced ? false : { scale: 0.92, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
            className="relative flex w-full max-w-md flex-col items-center rounded-[28px] bg-raised px-8 py-10 text-center shadow-lift ring-2 ring-accent ring-offset-4 ring-offset-transparent"
          >
            <motion.span animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg">
              <AdminIcon name="download" size={28} strokeWidth={1.8} />
            </motion.span>
            <p className="mt-4 text-title2 text-fg">Drop to upload</p>
            <p className="mt-1 text-subhead text-fg-3">Into the media library. Each photo shows its own progress.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    target,
  );
}

function MediaForm({ item, folders, onChange, onDeleted }: { item: MediaItem; folders: string[]; onChange: (m: MediaItem) => void; onDeleted: (id: string) => void }) {
  const toast = useToast();
  const [alt, setAlt] = useState(item.alt);
  const [decorative, setDecorative] = useState(item.isDecorative);
  const [folder, setFolder] = useState(item.folder ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dirty = alt !== item.alt || decorative !== item.isDecorative || folder !== (item.folder ?? "");

  const save = async () => {
    setBusy(true);
    const res = await updateMedia({ id: item.id, alt, isDecorative: decorative, folder });
    setBusy(false);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    onChange({ ...item, alt, isDecorative: decorative, folder: folder || null });
    toast({ title: "Saved" });
  };

  return (
    <div className="space-y-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-black">
        <Image src={item.src} alt={item.alt} fill sizes="520px" className="object-contain" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.uses ? <Badge tone="ok" dot>Used in {item.uses} {item.uses === 1 ? "place" : "places"}</Badge> : <Badge>Not used yet</Badge>}
        {item.folder && <Badge>{item.folder}</Badge>}
        <Badge>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.createdAt))}</Badge>
      </div>
      <Field label="Description" hint="What a person would see. Used by Google and by screen readers." count={alt.length} max={200}>
        <Textarea value={alt} onChange={(e) => setAlt(e.target.value)} className="min-h-[5rem]" placeholder="The private pool at dusk, with string lights over the lawn" />
      </Field>
      <Switch checked={decorative} onChange={setDecorative} label="Decorative" description="Only for photos that add mood and no information." />
      <Field label="Folder" hint={folders.length ? `Existing: ${folders.join(", ")}` : undefined}>
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} list="media-folders" />
        <datalist id="media-folders">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </Field>
      <div className="flex gap-2 border-t border-line pt-5">
        <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>
          Delete
        </Button>
        <SaveButton saving={busy} dirty={dirty} onClick={save} className="flex-1" />
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this photo?"
        body="It is removed from the library for good. Photos still used on the website cannot be deleted."
        confirmLabel="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          const res = await deleteMedia(item.id);
          setConfirm(false);
          if (!res.ok) return toast({ kind: "error", title: "Not deleted", body: res.error });
          toast({ title: "Photo deleted" });
          onDeleted(item.id);
        }}
      />
    </div>
  );
}
