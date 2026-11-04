"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sheet } from "./sheet";
import { Button, FadeImage, Input, ProgressRing, Skeleton } from "./ui";
import { AdminIcon } from "./icons";
import { useUploader, mb, eta, type UploadTask, type UploadResult } from "./uploads";
import { cn } from "@/lib/utils";
import { listMedia, type MediaItem } from "@/app/dashboard/media/actions";

export { useUploader };
export type { UploadTask as UploadState };

export interface Picked {
  id: string;
  src: string;
  alt: string;
}

/**
 * Drop photos here — or anywhere on it, from the desktop, or choose them from
 * the phone's library. The zone answers the drag as it arrives: it lifts, its
 * edge turns gold, and it says what will happen when you let go.
 */
export function DropZone({
  onFiles,
  compact = false,
  label = "Drop photos here, or choose them",
}: {
  onFiles: (files: FileList) => void;
  compact?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      className={cn(
        "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[18px] text-center transition-[background-color,box-shadow,transform] duration-300 ease-[var(--ease-emph)]",
        compact ? "gap-3 px-4 py-4" : "flex-col gap-3 px-6 py-10 sm:py-12",
        over
          ? "scale-[1.01] bg-accent/10 shadow-[inset_0_0_0_2px_var(--d-accent)]"
          : "bg-fill/60 shadow-[inset_0_0_0_1.5px_var(--d-line-2)] hover:bg-fill hover:shadow-[inset_0_0_0_1.5px_var(--d-fill-3)]",
      )}
    >
      <motion.span
        animate={over ? { y: -4, scale: 1.08 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.35, duration: 0.45 }}
        className={cn("grid shrink-0 place-items-center rounded-full transition-colors", compact ? "size-9" : "size-14", over ? "bg-accent text-accent-fg" : "bg-panel text-fg-2 shadow-tile")}
      >
        <AdminIcon name={over ? "download" : "cloud"} size={compact ? 18 : 24} strokeWidth={1.7} />
      </motion.span>
      <span className={cn("flex flex-col", compact ? "items-start text-left" : "items-center")}>
        <span className="text-callout font-semibold text-fg">{over ? "Let go to upload" : label}</span>
        <span className="mt-0.5 text-footnote text-fg-3">
          {compact ? "JPEG, PNG, WebP or HEIC · 25 MB each" : "JPEG, PNG, WebP or HEIC, up to 25 MB each. Straight from a phone works — photos are turned upright and their location removed."}
        </span>
      </span>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => {
        if (e.target.files?.length) onFiles(e.target.files);
        e.target.value = "";
      }} />
    </div>
  );
}

/**
 * Photos on their way up, in the grid where they will land. The local preview
 * shows at once, dimmed; a ring fills with the bytes sent; then it spins while
 * the server finishes, and the tile becomes the real photo.
 */
export function UploadTiles({
  uploads,
  onDismiss,
  onRetry,
  onCancel,
  aspect = "aspect-[4/3]",
}: {
  uploads: UploadTask[];
  onDismiss: (id: string) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  aspect?: string;
}) {
  return (
    <AnimatePresence>
      {uploads.map((u) => {
        const pct = u.size ? u.loaded / u.size : 0;
        return (
          <motion.div
            key={u.id}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
            className={cn("relative overflow-hidden rounded-[14px] bg-fill-2", aspect)}
          >
            {u.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.preview}
                alt=""
                className="absolute inset-0 size-full object-cover transition-[filter] duration-500"
                style={{ filter: u.status === "error" ? "grayscale(1) brightness(0.5)" : `saturate(${0.3 + pct * 0.7}) brightness(${0.55 + pct * 0.25})` }}
              />
            ) : null}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-white">
              {u.status === "error" ? (
                <>
                  <span className="grid size-9 place-items-center rounded-full bg-neg">
                    <AdminIcon name="alert" size={17} strokeWidth={2} />
                  </span>
                  <span className="line-clamp-2 text-footnote font-medium leading-snug drop-shadow">{u.error}</span>
                  <span className="flex gap-1.5">
                    {onRetry && <button type="button" onClick={() => onRetry(u.id)} className="rounded-full bg-white/90 px-2.5 py-1 text-footnote font-semibold text-black active:scale-95">Retry</button>}
                    <button type="button" onClick={() => onDismiss(u.id)} className="rounded-full bg-black/45 px-2.5 py-1 text-footnote font-semibold text-white backdrop-blur active:scale-95">Dismiss</button>
                  </span>
                </>
              ) : (
                <>
                  <ProgressRing value={u.status === "processing" ? null : u.status === "queued" ? 0 : pct} size={46} stroke={4} className="text-white" trackClassName="text-white/25">
                    <span className="text-caption font-bold tabular-nums">{u.status === "uploading" ? `${Math.round(pct * 100)}` : ""}</span>
                  </ProgressRing>
                  <span className="text-footnote font-medium tabular-nums drop-shadow">
                    {u.status === "queued" ? "Waiting" : u.status === "processing" ? "Processing" : u.speed >= 1024 ? `${mb(u.speed)}/s · ${eta((u.size - u.loaded) / u.speed)}` : `${mb(u.loaded)} of ${mb(u.size)}`}
                  </span>
                  {onCancel && (u.status === "uploading" || u.status === "queued") && (
                    <button type="button" onClick={() => onCancel(u.id)} aria-label={`Cancel ${u.name}`} className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90">
                      <AdminIcon name="close" size={13} strokeWidth={2.4} />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

/**
 * Choose from the library, or upload new — one sheet for both. `multiple`
 * keeps a numbered selection in the order you tapped, which becomes gallery order.
 */
export function MediaPicker({
  open,
  onClose,
  onPick,
  multiple = false,
  title = "Choose a photo",
  folder = null,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (items: Picked[]) => void;
  multiple?: boolean;
  title?: string;
  folder?: string | null;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ("");
    listMedia().then(setItems);
  }, [open]);

  const onUploaded = useCallback(
    (item: UploadResult) => {
      setItems((all) => [
        { ...item, originalName: item.originalName ?? "", folder, sizeBytes: 0, isDecorative: false, createdAt: new Date().toISOString(), uses: 0 },
        ...(all ?? []),
      ]);
      setSelected((s) => (multiple ? [...s, item.id] : [item.id]));
    },
    [multiple, folder],
  );
  const { uploads, start, dismiss, retry, cancel } = useUploader(folder, onUploaded, `picker:${folder ?? "library"}`);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (items ?? []).filter((m) => !n || `${m.alt} ${m.originalName} ${m.folder ?? ""}`.toLowerCase().includes(n));
  }, [items, q]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));

  const confirm = () => {
    const byId = new Map((items ?? []).map((m) => [m.id, m]));
    onPick(selected.map((id) => byId.get(id)!).filter(Boolean).map((m) => ({ id: m.id, src: m.src, alt: m.alt })));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={multiple ? "Tap in the order you want them shown" : undefined}
      width={780}
      footer={
        <div className="flex items-center gap-3">
          <span className="flex-1 text-subhead text-fg-3">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={selected.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="inline-block tabular-nums">
                {selected.length ? `${selected.length} selected` : "Nothing selected"}
              </motion.span>
            </AnimatePresence>
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selected.length} onClick={confirm}>
            {multiple ? `Add ${selected.length || ""}`.trim() : "Use photo"}
          </Button>
        </div>
      }
    >
      <DropZone onFiles={start} compact label="Upload new photos" />
      <div className="mt-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or file name" leading={<AdminIcon name="search" size={15} />} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        <UploadTiles uploads={uploads} onDismiss={dismiss} onRetry={retry} onCancel={cancel} />
        {!items
          ? Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-[14px]" />)
          : shown.map((m) => {
              const index = selected.indexOf(m.id);
              const on = index >= 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className="group relative aspect-[4/3] overflow-hidden rounded-[14px] bg-fill-2 transition-transform duration-150 active:scale-[0.96]"
                >
                  <FadeImage src={m.src} alt={m.alt} fill sizes="200px" className={cn("object-cover transition-[transform,border-radius] duration-300 ease-[var(--ease-emph)]", on && "scale-[0.9] rounded-[10px]")} />
                  <span className={cn("pointer-events-none absolute inset-0 rounded-[14px] transition-shadow duration-200", on ? "shadow-[inset_0_0_0_3px_var(--d-accent)]" : "group-hover:shadow-[inset_0_0_0_1px_var(--d-line-2)]")} />
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.45, duration: 0.4 }}
                        className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-caption font-bold text-accent-fg shadow-[0_2px_8px_rgb(0_0_0/0.3)]"
                      >
                        {multiple ? index + 1 : <AdminIcon name="check" size={13} strokeWidth={2.8} />}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!m.alt && !m.isDecorative && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-caution px-1.5 py-0.5 text-caption font-bold text-black">No description</span>
                  )}
                </button>
              );
            })}
      </div>
      {items && !shown.length && !uploads.length && <p className="py-10 text-center text-callout text-fg-3">{items.length ? `Nothing matches “${q}”.` : "The library is empty — upload the first photos above."}</p>}
    </Sheet>
  );
}
