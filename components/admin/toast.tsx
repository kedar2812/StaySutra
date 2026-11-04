"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Completion feedback, and the undo that makes destructive actions safe
 * without a confirmation dialog in the way.
 *
 * A toast with `undo` stays six seconds with a ring that drains, so how long
 * you have is visible rather than guessed. Hovering pauses it. They rise from
 * the bottom edge and leave the same way; a flick downwards dismisses one.
 */

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
  undo?: () => void | Promise<void>;
  duration: number;
}

type Push = (t: { kind?: Kind; title: string; body?: string; undo?: Toast["undo"]; duration?: number }) => void;

const Ctx = createContext<Push>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback<Push>((t) => {
    const id = ++seq.current;
    setToasts((all) => [
      ...all.slice(-2),
      { id, kind: t.kind ?? "success", title: t.title, body: t.body, undo: t.undo, duration: t.duration ?? (t.undo ? 6000 : t.kind === "error" ? 6000 : 3600) },
    ]);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[90] flex flex-col items-center gap-2 px-3 lg:bottom-5 lg:left-auto lg:right-5 lg:items-end lg:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} onDone={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

const ICON = {
  success: { name: "check", cls: "bg-pos text-white" },
  error: { name: "alert", cls: "bg-neg text-white" },
  info: { name: "info", cls: "bg-note text-white" },
} as const;

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const left = useRef(toast.duration);
  const started = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(onDone, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started.current;
    };
  }, [paused, onDone]);

  const icon = ICON[toast.kind];

  return (
    <motion.div
      layout
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.94, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.2 } }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.08, bottom: 0.6 }}
      onDragEnd={(_, info) => (info.offset.y + info.velocity.y * 0.2 > 50 ? onDone() : undefined)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      role={toast.kind === "error" ? "alert" : "status"}
      className="d-glass-float pointer-events-auto relative w-full max-w-[24rem] touch-pan-x rounded-[20px] py-3 pl-3 pr-2.5"
    >
      <div className="flex items-center gap-3">
        <motion.span
          initial={reduced ? false : { scale: 0.3, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.45, duration: 0.5, delay: 0.05 }}
          className={cn("grid size-7 shrink-0 place-items-center rounded-full", icon.cls)}
        >
          <AdminIcon name={icon.name} size={15} strokeWidth={2.4} />
        </motion.span>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-callout font-semibold text-fg">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-subhead leading-snug text-fg-3">{toast.body}</p>}
        </div>
        {toast.undo ? (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await toast.undo?.();
            }}
            className="relative flex h-9 shrink-0 items-center gap-2 rounded-full bg-fill-2 pl-3 pr-2 text-subhead font-semibold text-fg transition-colors hover:bg-fill-3 active:scale-95"
          >
            Undo
            <svg width="18" height="18" viewBox="0 0 20 20" className="-rotate-90" aria-hidden>
              <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.2" />
              <motion.circle
                cx="10"
                cy="10"
                r="7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray={47.1}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: paused ? undefined : 47.1 }}
                transition={{ duration: toast.duration / 1000, ease: "linear" }}
              />
            </svg>
          </button>
        ) : (
          <button type="button" onClick={onDone} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-fg-3 hover:bg-fill hover:text-fg">
            <AdminIcon name="close" size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
