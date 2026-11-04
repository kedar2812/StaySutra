"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon } from "./icons";
import { IconButton, ProgressRing } from "./ui";
import { cn } from "@/lib/utils";

/**
 * Every photo upload in the dashboard goes through here.
 *
 * One queue for the whole session, held above the pages, so an upload keeps
 * going when you move to another screen. Three files travel at once; the
 * rest wait their turn. Each file reports what is really happening to it:
 * bytes sent (from the browser's own upload progress), speed, time left, then
 * "processing" while the server turns it upright, resizes it and strips its
 * location data — and finally done, or a specific error with a retry.
 *
 * XHR rather than fetch: fetch still cannot report upload progress in every
 * browser the team uses.
 */

const MAX_BYTES = 25 * 1024 * 1024;
const PARALLEL = 3;
const SPEED_WINDOW = 5000;

export type UploadStatus = "queued" | "uploading" | "processing" | "done" | "error";

export interface UploadResult {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  originalName?: string;
}

export interface UploadTask {
  id: string;
  scope: string;
  folder: string | null;
  file: File;
  name: string;
  size: number;
  preview: string;
  status: UploadStatus;
  loaded: number;
  /** Bytes per second, smoothed. */
  speed: number;
  error?: string;
  result?: UploadResult;
  finishedAt?: number;
}

type Listener = (item: UploadResult) => void;

interface UploadsCtx {
  tasks: UploadTask[];
  add: (files: FileList | File[], opts: { scope: string; folder: string | null }) => number;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
  subscribe: (scope: string, fn: Listener) => () => void;
  trayOpen: boolean;
  setTrayOpen: (open: boolean) => void;
}

const Ctx = createContext<UploadsCtx | null>(null);

export function useUploads() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUploads must be used inside <UploadProvider>");
  return ctx;
}

const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|avif|gif|tiff?)$/i.test(f.name);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const listeners = useRef(new Map<string, Set<Listener>>());
  const seq = useRef(0);
  /** Recent (time, bytes) readings per upload, for an honest speed. */
  const samples = useRef(new Map<string, { t: number; loaded: number }[]>());

  /**
   * Bytes moved over the last few seconds, measured up to now — not up to the
   * last progress event. If the connection stalls, the speed falls with it
   * instead of freezing on whatever it was a moment ago.
   */
  const windowSpeed = useCallback((id: string) => {
    const list = samples.current.get(id);
    if (!list?.length) return 0;
    const now = performance.now();
    while (list.length > 2 && now - list[1]!.t > SPEED_WINDOW) list.shift();
    const first = list[0]!;
    const last = list.at(-1)!;
    const secs = (now - first.t) / 1000;
    return secs > 0.25 ? Math.max(0, (last.loaded - first.loaded) / secs) : 0;
  }, []);

  const patch = useCallback((id: string, p: Partial<UploadTask>) => {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }, []);

  const add = useCallback<UploadsCtx["add"]>((files, { scope, folder }) => {
    const list = Array.from(files);
    const next: UploadTask[] = list.map((file) => {
      const id = `u${++seq.current}-${Date.now().toString(36)}`;
      const base: UploadTask = {
        id,
        scope,
        folder,
        file,
        name: file.name,
        size: file.size,
        preview: isImage(file) && !/\.(heic|heif|tiff?)$/i.test(file.name) ? URL.createObjectURL(file) : "",
        status: "queued",
        loaded: 0,
        speed: 0,
      };
      // Refuse what the server would refuse, before a single byte is sent.
      if (!isImage(file)) return { ...base, status: "error", error: "Not a photo — use JPEG, PNG, WebP or HEIC." };
      if (file.size > MAX_BYTES) return { ...base, status: "error", error: `${(file.size / 1048576).toFixed(0)} MB is over the 25 MB limit.` };
      return base;
    });
    if (next.length) {
      setTasks((all) => [...all, ...next]);
      setTrayOpen(true);
    }
    return next.length;
  }, []);

  // The pump: keep up to PARALLEL uploads in flight.
  useEffect(() => {
    const active = tasks.filter((t) => t.status === "uploading" || t.status === "processing").length;
    const waiting = tasks.filter((t) => t.status === "queued" && !xhrs.current.has(t.id));
    for (const task of waiting.slice(0, Math.max(0, PARALLEL - active))) start(task);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Once a second, refresh every live upload's speed, even with no new bytes.
  const uploading = tasks.some((t) => t.status === "uploading");
  useEffect(() => {
    if (!uploading) return;
    const timer = setInterval(() => {
      setTasks((all) => all.map((t) => (t.status === "uploading" ? { ...t, speed: windowSpeed(t.id) } : t)));
    }, 1000);
    return () => clearInterval(timer);
  }, [uploading, windowSpeed]);

  const finish = useCallback(
    (task: UploadTask, result: UploadResult) => {
      samples.current.delete(task.id);
      xhrs.current.delete(task.id);
      patch(task.id, { status: "done", loaded: task.size, result, finishedAt: Date.now() });
      for (const fn of listeners.current.get(task.scope) ?? []) fn(result);
    },
    [patch],
  );

  function start(task: UploadTask) {
    const xhr = new XMLHttpRequest();
    xhrs.current.set(task.id, xhr);
    const form = new FormData();
    form.append("file", task.file);
    if (task.folder) form.append("folder", task.folder);

    samples.current.set(task.id, [{ t: performance.now(), loaded: 0 }]);
    patch(task.id, { status: "uploading", loaded: 0, speed: 0, error: undefined });

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      // The request body is a little larger than the file (form boundaries); scale to the file.
      const loaded = Math.min(task.size, (e.loaded / e.total) * task.size);
      samples.current.get(task.id)?.push({ t: performance.now(), loaded });
      patch(task.id, { loaded, speed: windowSpeed(task.id) });
    };
    xhr.upload.onload = () => patch(task.id, { status: "processing", loaded: task.size });
    xhr.onload = () => {
      let body: { error?: string } & Partial<UploadResult> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.id) return finish(task, body as UploadResult);
      xhrs.current.delete(task.id);
      patch(task.id, {
        status: "error",
        error: body.error ?? (xhr.status === 401 ? "Your session ended — sign in again." : xhr.status === 413 ? "Too large for the server." : "The server could not save it."),
      });
    };
    xhr.onerror = () => {
      xhrs.current.delete(task.id);
      patch(task.id, { status: "error", error: "The connection dropped." });
    };
    xhr.onabort = () => {
      xhrs.current.delete(task.id);
    };
    xhr.open("POST", "/api/admin/media");
    xhr.send(form);
  }

  const remove = useCallback((id: string) => {
    setTasks((all) => {
      const t = all.find((x) => x.id === id);
      if (t?.preview) URL.revokeObjectURL(t.preview);
      return all.filter((x) => x.id !== id);
    });
  }, []);

  const cancel = useCallback(
    (id: string) => {
      xhrs.current.get(id)?.abort();
      xhrs.current.delete(id);
      remove(id);
    },
    [remove],
  );

  const retry = useCallback((id: string) => {
    setTasks((all) =>
      all.map((t) => (t.id === id && t.status === "error" && isImage(t.file) && t.size <= MAX_BYTES ? { ...t, status: "queued", loaded: 0, speed: 0, error: undefined } : t)),
    );
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((all) => {
      for (const t of all) if ((t.status === "done" || t.status === "error") && t.preview) URL.revokeObjectURL(t.preview);
      return all.filter((t) => t.status !== "done" && t.status !== "error");
    });
  }, []);

  const subscribe = useCallback<UploadsCtx["subscribe"]>((scope, fn) => {
    const set = listeners.current.get(scope) ?? new Set();
    set.add(fn);
    listeners.current.set(scope, set);
    return () => set.delete(fn);
  }, []);

  // Done uploads leave the list on their own a few seconds after the last one lands.
  useEffect(() => {
    const busy = tasks.some((t) => t.status === "queued" || t.status === "uploading" || t.status === "processing");
    const done = tasks.filter((t) => t.status === "done");
    if (busy || !done.length) return;
    const timer = setTimeout(() => {
      setTasks((all) => {
        for (const t of all) if (t.status === "done" && t.preview) URL.revokeObjectURL(t.preview);
        return all.filter((t) => t.status !== "done");
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, [tasks]);

  // Closing the tab mid-upload loses the photo: ask first.
  useEffect(() => {
    const busy = tasks.some((t) => t.status === "queued" || t.status === "uploading");
    if (!busy) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [tasks]);

  const value = useMemo(
    () => ({ tasks, add, cancel, retry, dismiss: remove, clearFinished, subscribe, trayOpen, setTrayOpen }),
    [tasks, add, cancel, retry, remove, clearFinished, subscribe, trayOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * A screen's view of the queue: start uploads into a folder, hear about each
 * one as it lands, and see the ones still in flight for this screen.
 */
export function useUploader(folder: string | null, onDone: (item: UploadResult) => void, scope = folder ?? "library") {
  const { tasks, add, subscribe, cancel, retry, dismiss } = useUploads();
  const cb = useRef(onDone);
  cb.current = onDone;
  useEffect(() => subscribe(scope, (item) => cb.current(item)), [scope, subscribe]);
  const start = useCallback((files: FileList | File[]) => add(files, { scope, folder }), [add, scope, folder]);
  const mine = useMemo(() => tasks.filter((t) => t.scope === scope && t.status !== "done"), [tasks, scope]);
  return { uploads: mine, start, cancel, retry, dismiss };
}

/* — Figures ———————————————————————————————————————————————————— */

export function summarise(tasks: UploadTask[]) {
  const live = tasks.filter((t) => t.status !== "error");
  const total = live.reduce((n, t) => n + t.size, 0);
  const loaded = live.reduce((n, t) => n + (t.status === "done" || t.status === "processing" ? t.size : t.loaded), 0);
  const busy = tasks.filter((t) => t.status === "queued" || t.status === "uploading" || t.status === "processing");
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "error").length;
  const speed = tasks.filter((t) => t.status === "uploading").reduce((n, t) => n + t.speed, 0);
  const remaining = live.filter((t) => t.status === "queued" || t.status === "uploading").reduce((n, t) => n + (t.size - t.loaded), 0);
  return {
    progress: total ? loaded / total : 0,
    busy: busy.length,
    processingOnly: busy.length > 0 && busy.every((t) => t.status === "processing"),
    done,
    failed,
    total: tasks.length,
    eta: speed >= 1024 ? remaining / speed : null,
    speed,
  };
}

export const mb = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export const eta = (s: number | null) =>
  s === null || !Number.isFinite(s) ? "" : s < 1.5 ? "a moment left" : s < 60 ? `${Math.round(s)} s left` : s < 3600 ? `${Math.ceil(s / 60)} min left` : "over an hour left";

/* — The tray —————————————————————————————————————————————————————— */

/**
 * The uploads panel. Opens when photos start going up and stays out of the way:
 * minimised, it is a ring in the top bar showing overall progress.
 */
export function UploadTray() {
  const { tasks, cancel, retry, dismiss, clearFinished, trayOpen, setTrayOpen } = useUploads();
  const reduced = useReducedMotion();
  const s = summarise(tasks);
  const show = trayOpen && tasks.length > 0;

  useEffect(() => {
    if (!tasks.length) setTrayOpen(false);
  }, [tasks.length, setTrayOpen]);

  const headline = s.busy
    ? s.processingOnly
      ? `Finishing ${s.busy} ${s.busy === 1 ? "photo" : "photos"}`
      : `Uploading ${s.busy} ${s.busy === 1 ? "photo" : "photos"}`
    : s.failed
      ? `${s.failed} ${s.failed === 1 ? "upload needs" : "uploads need"} attention`
      : `${s.done} ${s.done === 1 ? "photo" : "photos"} uploaded`;

  return (
    <AnimatePresence>
      {show && (
        <motion.section
          aria-label="Uploads"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } }}
          transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[88] mx-auto max-w-[24rem] overflow-hidden rounded-[22px] bg-raised shadow-lift lg:inset-x-auto lg:bottom-5 lg:right-5 lg:mx-0 lg:w-[23rem]"
        >
          <header className="flex items-center gap-3 px-4 pb-3 pt-3.5">
            <ProgressRing value={s.busy ? (s.processingOnly ? null : s.progress) : 1} size={30} stroke={3} className={s.failed && !s.busy ? "text-neg" : s.busy ? "text-accent" : "text-pos"}>
              {!s.busy && <AdminIcon name={s.failed ? "alert" : "check"} size={13} strokeWidth={2.4} />}
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="truncate text-callout font-semibold text-fg">{headline}</p>
              <p className="truncate text-footnote tabular-nums text-fg-3">
                {s.busy ? (s.processingOnly ? "Resizing and removing location data" : [`${Math.round(s.progress * 100)}%`, s.speed >= 1024 ? `${mb(s.speed)}/s` : "slow connection", eta(s.eta)].filter(Boolean).join("  ·  ")) : "Saved to the media library"}
              </p>
            </div>
            {!s.busy && <IconButton icon="close" label="Clear finished" size={30} onClick={clearFinished} />}
            <IconButton icon="chevronDown" label="Minimise" size={30} onClick={() => setTrayOpen(false)} />
          </header>
          <div className="h-[2px] bg-fill">
            <motion.div className="h-full bg-accent" animate={{ width: `${(s.busy ? s.progress : 1) * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} />
          </div>
          <ul className="d-scroll max-h-[min(22rem,50vh)] overflow-y-auto p-1.5">
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <motion.li
                  key={t.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <TaskRow task={t} onCancel={() => cancel(t.id)} onRetry={() => retry(t.id)} onDismiss={() => dismiss(t.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function TaskRow({ task: t, onCancel, onRetry, onDismiss }: { task: UploadTask; onCancel: () => void; onRetry: () => void; onDismiss: () => void }) {
  const pct = t.size ? t.loaded / t.size : 0;
  const recoverable = t.status === "error" && isImage(t.file) && t.size <= MAX_BYTES;
  return (
    <div className="flex items-center gap-3 rounded-[14px] px-2.5 py-2">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-fill-2">
        {t.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.preview} alt="" className={cn("size-full object-cover transition-[filter,opacity] duration-500", t.status === "queued" || t.status === "uploading" ? "opacity-60 saturate-50" : "")} />
        ) : (
          <span className="grid size-full place-items-center text-fg-3">
            <AdminIcon name="image" size={18} />
          </span>
        )}
        {t.status === "done" && (
          <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4, duration: 0.45 }} className="absolute inset-0 grid place-items-center bg-black/30 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" className="d-check-draw" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </motion.span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-subhead font-medium text-fg">{t.name}</p>
        <p className={cn("mt-0.5 truncate text-footnote tabular-nums", t.status === "error" ? "text-neg-text" : "text-fg-3")}>
          {t.status === "queued" && `Waiting · ${mb(t.size)}`}
          {t.status === "uploading" && `${mb(t.loaded)} of ${mb(t.size)}  ·  ${t.speed >= 1024 ? `${mb(t.speed)}/s  ·  ${eta((t.size - t.loaded) / t.speed)}` : t.loaded ? "slow connection…" : "starting…"}`}
          {t.status === "processing" && "Processing…"}
          {t.status === "done" && `Uploaded · ${t.result ? `${t.result.width} × ${t.result.height}` : mb(t.size)}`}
          {t.status === "error" && t.error}
        </p>
        {(t.status === "uploading" || t.status === "processing" || t.status === "queued") && (
          <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-fill-2">
            {t.status === "processing" ? (
              <span className="d-indeterminate block h-full rounded-full text-accent" />
            ) : (
              <motion.span className="block h-full rounded-full bg-accent" initial={false} animate={{ width: `${pct * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 0.35 }} />
            )}
          </span>
        )}
      </div>
      {t.status === "uploading" || t.status === "queued" ? (
        <IconButton icon="close" label={`Cancel ${t.name}`} size={30} tone="filled" onClick={onCancel} />
      ) : t.status === "error" ? (
        <div className="flex gap-1">
          {recoverable && <IconButton icon="refresh" label={`Retry ${t.name}`} size={30} tone="filled" onClick={onRetry} />}
          <IconButton icon="close" label="Dismiss" size={30} onClick={onDismiss} />
        </div>
      ) : null}
    </div>
  );
}

/** The top bar's ring: overall progress while anything is moving, a tap to open the tray. */
export function UploadIndicator() {
  const { tasks, trayOpen, setTrayOpen } = useUploads();
  const s = summarise(tasks);
  return (
    <AnimatePresence>
      {tasks.length > 0 && (
        <motion.button
          type="button"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
          onClick={() => setTrayOpen(!trayOpen)}
          aria-label={`Uploads: ${Math.round(s.progress * 100)}%`}
          title="Uploads"
          className="grid size-9 place-items-center rounded-full hover:bg-fill active:scale-90"
        >
          <ProgressRing value={s.busy ? (s.processingOnly ? null : s.progress) : 1} size={24} stroke={2.6} className={s.failed && !s.busy ? "text-neg" : s.busy ? "text-accent" : "text-pos"}>
            <AdminIcon name={s.busy ? "upload" : s.failed ? "alert" : "check"} size={11} strokeWidth={2.4} className="text-fg-2" />
          </ProgressRing>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
