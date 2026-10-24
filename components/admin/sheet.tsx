"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { AdminIcon } from "./icons";
import { cn } from "@/lib/utils";

/**
 * A side panel on a desktop, a bottom sheet on a phone — the same component,
 * so a detail view feels the same wherever it is opened.
 *
 * On a phone the sheet tracks the finger 1:1 from its grabber, and on release
 * it projects where the flick was heading: a fast short flick dismisses, a
 * slow long drag that ends near the top does not. It leaves the way it came.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const reduced = useReducedMotion();
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Apple's projection: where would the flick have come to rest?
    const projected = info.offset.y + ((info.velocity.y / 1000) * 0.998) / (1 - 0.998);
    if (projected > 220) onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Desktop: from the right */}
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal
            className="absolute inset-y-2 right-2 hidden flex-col overflow-hidden rounded-[22px] bg-ink-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08] outline-none lg:flex"
            style={{ width }}
            initial={reduced ? { opacity: 0 } : { x: width + 24 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: width + 24 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          >
            <SheetBody title={title} subtitle={subtitle} footer={footer} onClose={onClose}>
              {children}
            </SheetBody>
          </motion.div>

          {/* Phone: from the bottom, draggable */}
          <motion.div
            role="dialog"
            aria-modal
            className="absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col overflow-hidden rounded-t-[24px] bg-ink-800 ring-1 ring-white/[0.08] lg:hidden"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-[5px] w-10 rounded-full bg-white/20" />
            </div>
            <SheetBody title={title} subtitle={subtitle} footer={footer} onClose={onClose} onGrab={(e) => drag.start(e)}>
              {children}
            </SheetBody>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetBody({
  title,
  subtitle,
  footer,
  onClose,
  children,
  onGrab,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  onGrab?: (e: React.PointerEvent) => void;
}) {
  return (
    <>
      {(title || subtitle) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6" onPointerDown={onGrab}>
          <div className="min-w-0">
            {title && <h2 className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-text-hi">{title}</h2>}
            {subtitle && <div className="mt-0.5 text-[0.8125rem] text-text-low">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-text-mid transition-colors hover:bg-white/[0.1] hover:text-text-hi active:scale-90"
          >
            <AdminIcon name="close" size={15} />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      {footer && (
        <div className={cn("border-t border-white/[0.06] px-5 py-4 sm:px-6", "pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:pb-4")}>
          {footer}
        </div>
      )}
    </>
  );
}

/**
 * Reserved for what cannot be undone. Everything else uses an undo toast.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal
            className="relative w-full max-w-sm rounded-[22px] bg-ink-800 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <h2 className="text-[1.0625rem] font-semibold text-text-hi">{title}</h2>
            <div className="mt-2 text-[0.875rem] leading-relaxed text-text-low">{body}</div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="h-10 rounded-[11px] px-4 text-[0.875rem] font-medium text-text-mid hover:bg-white/[0.06] active:scale-[0.97]">
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="h-10 rounded-[11px] bg-err px-4 text-[0.875rem] font-semibold text-white hover:bg-err/90 active:scale-[0.97] disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
