"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Completion feedback, and the undo that makes destructive actions safe
 * without a confirmation dialog in the way.
 *
 * A toast with `undo` stays six seconds with a draining bar, so how long you
 * have is visible rather than guessed. Hovering pauses it. They rise from the
 * bottom edge and leave the same way. DPR §9.2 (agency and forgiveness)
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
      { id, kind: t.kind ?? "success", title: t.title, body: t.body, undo: t.undo, duration: t.duration ?? (t.undo ? 6000 : 3500) },
    ]);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
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

  return (
    <motion.div
      layout
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      role={toast.kind === "error" ? "alert" : "status"}
      className="admin-glass pointer-events-auto relative w-full max-w-[24rem] overflow-hidden rounded-[16px] px-4 py-3.5"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
            toast.kind === "success" && "bg-ok/20 text-[#6fe0ac]",
            toast.kind === "error" && "bg-err/20 text-[#ff9b93]",
            toast.kind === "info" && "bg-info/20 text-[#93c2f0]",
          )}
        >
          <AdminIcon name={toast.kind === "error" ? "alert" : toast.kind === "info" ? "info" : "check"} size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-medium text-text-hi">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-[0.8125rem] leading-snug text-text-low">{toast.body}</p>}
        </div>
        {toast.undo ? (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await toast.undo?.();
            }}
            className="-my-1 shrink-0 rounded-[8px] px-2.5 py-1.5 text-[0.8125rem] font-semibold text-gold-400 transition-colors hover:bg-white/[0.06] active:scale-95"
          >
            Undo
          </button>
        ) : (
          <button type="button" onClick={onDone} aria-label="Dismiss" className="-my-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-[8px] text-text-low hover:bg-white/[0.06] hover:text-text-hi">
            <AdminIcon name="close" size={14} />
          </button>
        )}
      </div>
      {toast.undo && (
        <motion.span
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gold-500/70"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: paused ? undefined : 0 }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}
