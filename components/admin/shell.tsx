"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AdminIcon, type AdminIconName } from "./icons";
import { Kbd } from "./ui";
import { Sheet } from "./sheet";
import { ToastProvider } from "./toast";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: AdminIconName;
  badge?: number;
  /** Shown in the phone's bottom bar rather than under "More". */
  primary?: boolean;
  alert?: boolean;
}

export interface PaletteItem {
  label: string;
  hint?: string;
  href: string;
  icon: AdminIconName;
  group: string;
}

const COLLAPSE_KEY = "ss.sidebar.collapsed";

/**
 * The frame every dashboard screen sits in.
 *
 * Desktop: a sidebar that collapses to icons (remembered), and a glass top bar
 * with the breadcrumb, ⌘K and the account menu. Phone: the same top bar, and a
 * bottom tab bar within thumb reach — Overview, Properties, Calendar,
 * Enquiries, More. The active item is marked by one sliding indicator, so
 * moving between sections reads as one continuous motion. DPR §9.2
 */
export function AdminShell({
  user,
  nav,
  palette,
  children,
}: {
  user: { name: string; email: string; role: string };
  nav: NavItem[];
  palette: PaletteItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMore(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const current = nav.find((n) => isActive(n.href));

  return (
    <ToastProvider>
      <div className="admin-canvas min-h-svh text-[0.9375rem] text-text-mid">
        {/* Sidebar */}
        <motion.aside
          className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.06] bg-[#060d18]/95 lg:flex"
          animate={{ width: collapsed ? 76 : 248 }}
          initial={false}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        >
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 pl-1.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-gold-500 font-mark text-[0.9375rem] font-semibold text-gold-ink">
                S
              </span>
              {!collapsed && (
                <span className="truncate font-mark text-[0.9375rem] tracking-[0.04em] text-text-hi">
                  STAY<span className="text-gold-500">SUTRA</span>
                </span>
              )}
            </Link>
            {!collapsed && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="grid size-8 place-items-center rounded-[9px] text-text-dim transition-colors hover:bg-white/[0.06] hover:text-text-hi"
              >
                <AdminIcon name="sidebar" size={17} />
              </button>
            )}
          </div>

          <nav className="no-scrollbar mt-2 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Dashboard">
            {collapsed && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Expand sidebar"
                className="mb-2 grid h-10 w-full place-items-center rounded-[11px] text-text-dim hover:bg-white/[0.06] hover:text-text-hi"
              >
                <AdminIcon name="sidebar" size={18} />
              </button>
            )}
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-[11px] px-3 text-[0.875rem] font-medium transition-colors",
                    active ? "text-text-hi" : "text-text-low hover:bg-white/[0.04] hover:text-text-mid",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-[11px] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                    >
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-500" />
                    </motion.span>
                  )}
                  <AdminIcon name={item.icon} size={19} className={cn("relative shrink-0", active && "text-gold-400")} />
                  {!collapsed && <span className="relative truncate">{item.label}</span>}
                  {!!item.badge && (
                    <span
                      className={cn(
                        "relative ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums",
                        item.alert ? "bg-err text-white" : "bg-info/25 text-[#a9cdf2]",
                        collapsed && "absolute right-1.5 top-1 ml-0 h-4 min-w-4 px-1 text-[0.625rem]",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.06] p-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex h-10 items-center gap-3 rounded-[11px] px-3 text-[0.875rem] text-text-low transition-colors hover:bg-white/[0.04] hover:text-text-hi",
                collapsed && "justify-center px-0",
              )}
            >
              <AdminIcon name="globe" size={18} />
              {!collapsed && "View website"}
            </a>
            <UserMenu user={user} collapsed={collapsed} />
          </div>
        </motion.aside>

        {/* Main column */}
        <motion.div
          className="min-w-0"
          initial={false}
          animate={{ paddingLeft: 0 }}
          style={{ ["--sidebar" as string]: collapsed ? "76px" : "248px" }}
        >
          <div className="lg:pl-[var(--sidebar)] lg:transition-[padding] lg:duration-300">
            <header className="admin-glass sticky top-0 z-30 flex h-14 items-center gap-3 px-4 shadow-none sm:h-16 sm:px-6 [box-shadow:inset_0_-1px_0_rgba(255,255,255,0.06)]">
              <Link href="/dashboard" className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-gold-500 font-mark text-[0.9375rem] font-semibold text-gold-ink lg:hidden">
                S
              </Link>
              <Breadcrumb pathname={pathname} section={current} />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="hidden h-9 w-64 items-center gap-2.5 rounded-[10px] bg-white/[0.05] px-3 text-[0.8125rem] text-text-dim ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.08] hover:text-text-low md:flex"
                >
                  <AdminIcon name="search" size={15} />
                  Search or jump to…
                  <span className="ml-auto flex gap-1">
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Search"
                  className="grid size-9 place-items-center rounded-[10px] text-text-mid hover:bg-white/[0.06] md:hidden"
                >
                  <AdminIcon name="search" size={18} />
                </button>
              </div>
            </header>

            <main className="mx-auto w-full max-w-[1440px] px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-16">{children}</main>
          </div>
        </motion.div>

        {/* Phone tab bar */}
        <nav
          aria-label="Dashboard"
          className="admin-glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex h-16 items-stretch rounded-[22px] px-1.5 lg:hidden"
        >
          {nav
            .filter((n) => n.primary)
            .map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} className="relative flex flex-1 flex-col items-center justify-center gap-1">
                  {active && (
                    <motion.span
                      layoutId="tab-active"
                      className="absolute inset-x-1 inset-y-1.5 rounded-[16px] bg-white/[0.08]"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <span className="relative">
                    <AdminIcon name={item.icon} size={21} className={active ? "text-gold-400" : "text-text-low"} />
                    {!!item.badge && (
                      <span className={cn("absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.625rem] font-semibold text-white", item.alert ? "bg-err" : "bg-info")}>
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className={cn("relative text-[0.6875rem] font-medium", active ? "text-text-hi" : "text-text-low")}>{item.label}</span>
                </Link>
              );
            })}
          <button type="button" onClick={() => setMore(true)} className="relative flex flex-1 flex-col items-center justify-center gap-1">
            <AdminIcon name="more" size={21} className="text-text-low" />
            <span className="text-[0.6875rem] font-medium text-text-low">More</span>
          </button>
        </nav>

        <Sheet open={more} onClose={() => setMore(false)} title="More" subtitle={`${user.name} · ${user.role.toLowerCase()}`}>
          <div className="grid grid-cols-3 gap-2">
            {nav
              .filter((n) => !n.primary)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-[16px] px-2 py-4 text-center text-[0.8125rem] transition-colors active:scale-95",
                    isActive(item.href) ? "bg-white/[0.08] text-text-hi" : "bg-white/[0.03] text-text-mid",
                  )}
                >
                  <AdminIcon name={item.icon} size={22} className={isActive(item.href) ? "text-gold-400" : "text-text-low"} />
                  {item.label}
                </Link>
              ))}
            <a href="/" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-[16px] bg-white/[0.03] px-2 py-4 text-[0.8125rem] text-text-mid">
              <AdminIcon name="globe" size={22} className="text-text-low" />
              Website
            </a>
            <form action="/api/auth/logout" method="post" className="contents">
              <button type="submit" className="flex flex-col items-center gap-2 rounded-[16px] bg-white/[0.03] px-2 py-4 text-[0.8125rem] text-text-mid">
                <AdminIcon name="logout" size={22} className="text-text-low" />
                Sign out
              </button>
            </form>
          </div>
        </Sheet>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={palette} />
      </div>
    </ToastProvider>
  );
}

function Breadcrumb({ pathname, section }: { pathname: string; section?: NavItem }) {
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const tail = parts.length > 1 ? parts[parts.length - 1] : null;
  const tailLabel = tail === "new" ? "New" : tail === "edit" ? "Edit" : tail ? "Details" : null;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[0.875rem]">
      <span className={cn("truncate font-medium", tailLabel ? "text-text-low" : "text-text-hi")}>
        {section ? (
          tailLabel ? (
            <Link href={section.href} className="hover:text-text-hi">
              {section.label}
            </Link>
          ) : (
            section.label
          )
        ) : (
          "Dashboard"
        )}
      </span>
      {tailLabel && (
        <>
          <AdminIcon name="chevronRight" size={14} className="shrink-0 text-text-dim" />
          <span className="truncate font-medium text-text-hi">{tailLabel}</span>
        </>
      )}
    </nav>
  );
}

function UserMenu({ user, collapsed }: { user: { name: string; email: string; role: string }; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center gap-3 rounded-[11px] p-2 text-left transition-colors hover:bg-white/[0.04]", collapsed && "justify-center")}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink-500 to-ink-600 text-[0.75rem] font-semibold text-text-hi ring-1 ring-white/10">
          {initials}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-medium text-text-hi">{user.name}</span>
            <span className="block truncate text-[0.75rem] capitalize text-text-dim">{user.role.toLowerCase()}</span>
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            style={{ transformOrigin: "bottom left" }}
            className="admin-glass absolute bottom-full left-0 mb-2 w-60 rounded-[14px] p-1.5"
          >
            <p className="truncate px-3 pb-2 pt-1.5 text-[0.75rem] text-text-dim">{user.email}</p>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="flex h-9 w-full items-center gap-2.5 rounded-[9px] px-3 text-[0.8125rem] text-text-mid hover:bg-white/[0.07] hover:text-text-hi">
                <AdminIcon name="logout" size={16} />
                Sign out
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ⌘K. Jump to any section, property or recent enquiry by typing a few
 * letters. Arrow keys move, Enter goes, Escape closes.
 */
function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hits = needle
      ? items.filter((i) => `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(needle))
      : items.filter((i) => i.group === "Go to" || i.group === "Create");
    return hits.slice(0, 12);
  }, [q, items]);

  const go = (item?: PaletteItem) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="Command palette"
            className="admin-glass relative w-full max-w-[560px] overflow-hidden rounded-[20px]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
              <AdminIcon name="search" size={18} className="text-text-low" />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(results.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") go(results[index]);
                  else if (e.key === "Escape") onClose();
                }}
                placeholder="Search properties, enquiries, pages…"
                className="h-14 flex-1 bg-transparent text-[1rem] text-text-hi outline-none placeholder:text-text-dim"
              />
              <Kbd>esc</Kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-8 text-center text-[0.875rem] text-text-low">Nothing matches “{q}”.</li>}
              {results.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                return (
                  <li key={`${item.group}-${item.href}`}>
                    {header && <p className="px-3 pb-1.5 pt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-dim first:pt-1">{header}</p>}
                    <button
                      type="button"
                      onMouseMove={() => setIndex(i)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[0.875rem]",
                        i === index ? "bg-white/[0.08] text-text-hi" : "text-text-mid",
                      )}
                    >
                      <AdminIcon name={item.icon} size={17} className={i === index ? "text-gold-400" : "text-text-low"} />
                      <span className="truncate">{item.label}</span>
                      {item.hint && <span className="ml-auto truncate pl-3 text-[0.75rem] text-text-dim">{item.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
