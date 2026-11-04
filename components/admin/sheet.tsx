"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { AdminIcon } from "./icons";
import { Spinner } from "./ui";
import { cn } from "@/lib/utils";

/** Overlays render into the dashboard root, so they inherit its theme. */
export function usePortalTarget() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById("dash-portal") ?? document.body), []);
  return el;
}

/**
 * A panel from the right on a desktop, a bottom sheet on a phone — the same
 * component, so a detail view feels the same wherever it is opened.
 *
 * On a phone the sheet tracks the finger 1:1 from its grabber, and on release
 * it projects where the flick was heading: a fast short flick dismisses, a
 * slow drag that ends near the top does not. It leaves the way it came.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
  headerAction,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  headerAction?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  const target = usePortalTarget();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const back = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      back?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Apple's projection: where would the flick have come to rest?
    const projected = info.offset.y + ((info.velocity.y / 1000) * 0.998) / (1 - 0.998);
    if (projected > 220) onClose();
  };

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-[var(--d-scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Desktop: from the right */}
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal
            className="absolute inset-y-2.5 right-2.5 hidden flex-col overflow-hidden rounded-[26px] bg-raised shadow-lift outline-none lg:flex"
            style={{ width: `min(${width}px, calc(100vw - 1.25rem))` }}
            initial={reduced ? { opacity: 0 } : { x: width + 32, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: width + 32, opacity: 0.6 }}
            transition={{ type: "spring", bounce: 0, duration: 0.42 }}
          >
            <SheetBody title={title} subtitle={subtitle} footer={footer} onClose={onClose} headerAction={headerAction}>
              {children}
            </SheetBody>
          </motion.div>

          {/* Phone: from the bottom, draggable */}
          <motion.div
            role="dialog"
            aria-modal
            className="absolute inset-x-0 bottom-0 flex max-h-[94svh] flex-col overflow-hidden rounded-t-[28px] bg-raised shadow-lift lg:hidden"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", bounce: 0.14, duration: 0.45 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.9 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex cursor-grab touch-none justify-center pb-0.5 pt-2 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <span className="h-[5px] w-9 rounded-full bg-fill-3" />
            </div>
            <SheetBody title={title} subtitle={subtitle} footer={footer} onClose={onClose} onGrab={(e) => drag.start(e)} headerAction={headerAction}>
              {children}
            </SheetBody>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    target,
  );
}

function SheetBody({
  title,
  subtitle,
  footer,
  onClose,
  children,
  onGrab,
  headerAction,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  onGrab?: (e: React.PointerEvent) => void;
  headerAction?: React.ReactNode;
}) {
  return (
    <>
      {(title || subtitle) && (
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 sm:px-6 lg:pt-5" onPointerDown={onGrab}>
          <div className="min-w-0">
            {title && <h2 className="truncate text-title2 text-fg">{title}</h2>}
            {subtitle && <div className="mt-0.5 text-subhead text-fg-3">{subtitle}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="grid size-[30px] place-items-center rounded-full bg-fill-2 text-fg-3 transition-colors hover:bg-fill-3 hover:text-fg active:scale-90"
            >
              <AdminIcon name="close" size={14} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}
      <div className="d-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2 sm:px-6">{children}</div>
      {footer && <div className="border-t border-line bg-raised px-5 py-3.5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] sm:px-6 lg:pb-4">{footer}</div>}
    </>
  );
}

/**
 * Reserved for what cannot be undone. Everything else uses an undo toast.
 * Laid out the way the system lays out an alert: title, the consequence in
 * plain words, then the two choices — the destructive one in red.
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
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const target = usePortalTarget();
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (!open) return;
    setWorking(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!target) return null;
  const isBusy = busy || working;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] grid place-items-center p-6">
          <motion.div className="absolute inset-0 bg-[var(--d-scrim)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            role="alertdialog"
            aria-modal
            aria-labelledby="confirm-title"
            className="relative w-full max-w-[19rem] overflow-hidden rounded-[22px] bg-raised text-center shadow-lift"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          >
            <div className="px-5 pb-4 pt-5">
              <h2 id="confirm-title" className="text-headline text-fg">
                {title}
              </h2>
              <div className="mt-1.5 text-subhead leading-relaxed text-fg-2">{body}</div>
            </div>
            <div className="grid grid-cols-2 border-t border-line">
              <button type="button" autoFocus onClick={onCancel} className="h-12 text-body font-medium text-fg transition-colors hover:bg-fill active:bg-fill-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setWorking(true);
                  try {
                    await onConfirm();
                  } finally {
                    setWorking(false);
                  }
                }}
                disabled={isBusy}
                className={cn("flex h-12 items-center justify-center gap-2 border-l border-line text-body font-semibold text-neg-text transition-colors hover:bg-neg/8 active:bg-neg/12 disabled:opacity-60")}
              >
                {isBusy && <Spinner size={14} />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    target,
  );
}
