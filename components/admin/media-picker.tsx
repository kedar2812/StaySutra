"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sheet } from "./sheet";
import { Button, Input, Spinner } from "./ui";
import { AdminIcon } from "./icons";
import { useToast } from "./toast";
import { cn } from "@/lib/utils";
import { listMedia, type MediaItem } from "@/app/dashboard/media/actions";

export interface Picked {
  id: string;
  src: string;
  alt: string;
}

export interface UploadState {
  key: string;
  name: string;
  progress: number;
  error?: string;
  preview: string;
}

/**
 * Upload one file with real progress. XHR rather than fetch, because fetch
 * still cannot report upload progress in every browser the client uses.
 */
export function uploadFile(file: File, folder: string | null, onProgress: (p: number) => void): Promise<Picked & { width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("The connection dropped. Try again."));
    xhr.open("POST", "/api/admin/media");
    xhr.send(form);
  });
}

/** A drop zone that uploads as files land, showing each one's own progress. */
export function useUploader(folder: string | null, onDone: (item: Picked) => void) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const toast = useToast();

  const start = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) continue;
        const key = `${file.name}-${file.size}-${Math.random()}`;
        const preview = URL.createObjectURL(file);
        setUploads((u) => [...u, { key, name: file.name, progress: 0, preview }]);
        uploadFile(file, folder, (progress) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress } : x))))
          .then((item) => {
            setUploads((u) => u.filter((x) => x.key !== key));
            URL.revokeObjectURL(preview);
            onDone(item);
          })
          .catch((error: Error) => {
            setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: error.message } : x)));
            toast({ kind: "error", title: `${file.name} did not upload`, body: error.message });
          });
      }
    },
    [folder, onDone, toast],
  );

  const dismiss = (key: string) => setUploads((u) => u.filter((x) => x.key !== key));
  return { uploads, start, dismiss };
}

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
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed text-center transition-[background-color,border-color,transform] duration-200",
        compact ? "gap-1.5 px-4 py-5" : "gap-3 px-6 py-10",
        over ? "scale-[1.01] border-gold-500/70 bg-gold-500/[0.06]" : "border-white/[0.14] hover:border-white/25 hover:bg-white/[0.02]",
      )}
    >
      <span className={cn("grid place-items-center rounded-full bg-white/[0.06] text-text-mid", compact ? "size-9" : "size-12")}>
        <AdminIcon name="upload" size={compact ? 17 : 21} />
      </span>
      <span className="text-[0.875rem] font-medium text-text-hi">{label}</span>
      {!compact && <span className="text-[0.8125rem] text-text-low">JPEG, PNG or WebP · up to 25 MB each · straight from your phone works</span>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
    </div>
  );
}

export function UploadTiles({ uploads, onDismiss }: { uploads: UploadState[]; onDismiss: (key: string) => void }) {
  return (
    <AnimatePresence>
      {uploads.map((u) => (
        <motion.div
          key={u.key}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-ink-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u.preview} alt="" className="size-full object-cover opacity-50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 p-3 text-center">
            {u.error ? (
              <>
                <AdminIcon name="alert" size={18} className="text-[#ff9b93]" />
                <span className="line-clamp-2 text-[0.75rem] text-text-hi">{u.error}</span>
                <button type="button" onClick={() => onDismiss(u.key)} className="text-[0.75rem] text-text-low underline">Dismiss</button>
              </>
            ) : (
              <>
                <span className="text-[0.75rem] font-medium tabular-nums text-text-hi">{u.progress < 1 ? `${Math.round(u.progress * 100)}%` : "Processing…"}</span>
                <span className="h-1 w-3/4 overflow-hidden rounded-full bg-white/20">
                  <motion.span className="block h-full rounded-full bg-gold-500" animate={{ width: `${Math.max(4, u.progress * 100)}%` }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} />
                </span>
              </>
            )}
          </div>
        </motion.div>
      ))}
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
    listMedia().then(setItems);
  }, [open]);

  const onUploaded = useCallback((item: Picked) => {
    setItems((all) => [{ ...item, width: 0, height: 0, originalName: "", folder: null, sizeBytes: 0, isDecorative: false, createdAt: new Date().toISOString(), uses: 0 }, ...(all ?? [])]);
    setSelected((s) => (multiple ? [...s, item.id] : [item.id]));
  }, [multiple]);
  const { uploads, start, dismiss } = useUploader(folder, onUploaded);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (items ?? []).filter((m) => !n || `${m.alt} ${m.originalName} ${m.folder ?? ""}`.toLowerCase().includes(n));
  }, [items, q]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]));

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
      width={760}
      footer={
        <div className="flex items-center gap-3">
          <span className="flex-1 text-[0.8125rem] text-text-low">{selected.length ? `${selected.length} selected` : "Nothing selected"}</span>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!selected.length} onClick={confirm}>{multiple ? `Add ${selected.length || ""}` : "Use photo"}</Button>
        </div>
      }
    >
      <DropZone onFiles={start} compact label="Upload new photos" />
      <div className="mt-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or file name" leading={<AdminIcon name="search" size={15} />} />
      </div>
      {!items ? (
        <div className="grid place-items-center py-16 text-text-low"><Spinner size={22} /></div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <UploadTiles uploads={uploads} onDismiss={dismiss} />
          {shown.map((m) => {
            const index = selected.indexOf(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-[12px] bg-ink-700 ring-2 transition-[box-shadow,transform] duration-150 active:scale-[0.96]",
                  index >= 0 ? "ring-gold-500" : "ring-transparent",
                )}
              >
                <Image src={m.src} alt={m.alt} fill sizes="200px" className={cn("object-cover transition-transform duration-300", index >= 0 && "scale-[0.94] rounded-[8px]")} />
                {index >= 0 && (
                  <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-gold-500 text-[0.75rem] font-bold text-gold-ink shadow">
                    {multiple ? index + 1 : <AdminIcon name="check" size={13} strokeWidth={2.5} />}
                  </span>
                )}
                {!m.alt && !m.isDecorative && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-warn/90 px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink-900">No alt</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
