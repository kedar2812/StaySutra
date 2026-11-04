"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { AdminIcon, type AdminIconName } from "./icons";
import { Avatar, Kbd, Menu, ModKey, Spinner, type MenuItem } from "./ui";
import { Sheet, usePortalTarget } from "./sheet";
import { ToastProvider, useToast } from "./toast";
import { TopbarProvider, useTopbar } from "./topbar";
import { UploadIndicator, UploadProvider, UploadTray, useUploads } from "./uploads";
import { useTheme, type ThemeChoice } from "./theme";
import { SIDEBAR_COOKIE } from "./theme-keys";
import { createPortal } from "react-dom";
import { BrandMark } from "./brand";
export { BrandMark };
import { cn } from "@/lib/utils";
import { createStory } from "@/app/dashboard/stories/actions";

export interface NavItem {
  href: string;
  label: string;
  icon: AdminIconName;
  badge?: number;
  /** Shown in the phone's tab bar rather than under "More". */
  primary?: boolean;
  alert?: boolean;
  group?: string;
}

export interface PaletteItem {
  label: string;
  hint?: string;
  href: string;
  icon: AdminIconName;
  group: string;
}

export interface ShellPerms {
  property: boolean;
  story: boolean;
  media: boolean;
  calendar: boolean;
}

/**
 * The frame every dashboard screen sits in.
 *
 * Desktop: the sidebar sits on the "desk", and the work happens in one
 * rounded pane beside it — a window, not a web page — with a translucent bar
 * that content scrolls under. Phone: iOS large titles that hand off to the bar
 * as you scroll, and a floating tab bar within thumb reach. The current place
 * is always marked by one indicator that slides, so moving between sections
 * reads as one continuous motion.
 */
export function AdminShell({
  user,
  nav,
  palette,
  perms,
  initialCollapsed,
  children,
}: {
  user: { name: string; email: string; role: string };
  nav: NavItem[];
  palette: PaletteItem[];
  perms: ShellPerms;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <TopbarProvider>
      <UploadProvider>
        <ToastProvider>
          <Frame user={user} nav={nav} palette={palette} perms={perms} initialCollapsed={initialCollapsed}>
            {children}
          </Frame>
        </ToastProvider>
      </UploadProvider>
    </TopbarProvider>
  );
}

function Frame({
  user,
  nav,
  palette,
  perms,
  initialCollapsed,
  children,
}: {
  user: { name: string; email: string; role: string };
  nav: NavItem[];
  palette: PaletteItem[];
  perms: ShellPerms;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMore(false), [pathname]);

  // Scroll edge: the bar becomes material only once content is under it.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        document.cookie = `${SIDEBAR_COOKIE}=${c ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
      } catch {}
      return !c;
    });
  };

  const isActive = useCallback((href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href)), [pathname]);
  const current = nav.find((n) => isActive(n.href));

  return (
    <div className="min-h-svh bg-pane text-callout lg:bg-desk" style={{ ["--sb" as string]: collapsed ? "76px" : "256px" }}>
      <Sidebar nav={nav} user={user} collapsed={collapsed} onToggle={toggle} isActive={isActive} onSearch={() => setPaletteOpen(true)} />

      <div
        id="dash-pane"
        className="d-scroll relative min-h-svh lg:fixed lg:inset-y-2 lg:left-[var(--sb)] lg:right-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:rounded-[22px] lg:bg-pane lg:shadow-pane lg:transition-[left] lg:duration-[420ms] lg:ease-[var(--ease-spring)]"
      >
        <Topbar section={current} pathname={pathname} scrolled={scrolled} perms={perms} onSearch={() => setPaletteOpen(true)} />
        <div ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-2" />
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] pt-1 sm:px-6 lg:px-10 lg:pb-20 lg:pt-4">{children}</main>
      </div>

      <TabBar nav={nav} isActive={isActive} onMore={() => setMore(true)} />

      <Sheet open={more} onClose={() => setMore(false)} title="More" subtitle={`${user.name} · ${user.role.toLowerCase()}`}>
        <div className="grid grid-cols-3 gap-2.5">
          {nav
            .filter((n) => !n.primary)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[18px] px-2 py-4 text-center text-subhead font-medium transition-[background-color,transform] active:scale-95",
                  isActive(item.href) ? "bg-accent/15 text-fg" : "bg-fill text-fg-2",
                )}
              >
                <AdminIcon name={item.icon} size={23} className={isActive(item.href) ? "text-accent-text" : "text-fg-3"} />
                {item.label}
              </Link>
            ))}
          <a href="/" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-[18px] bg-fill px-2 py-4 text-subhead font-medium text-fg-2 active:scale-95">
            <AdminIcon name="globe" size={23} className="text-fg-3" />
            Website
          </a>
          <form action="/api/auth/logout" method="post" className="contents">
            <button type="submit" className="flex flex-col items-center gap-2 rounded-[18px] bg-fill px-2 py-4 text-subhead font-medium text-fg-2 active:scale-95">
              <AdminIcon name="logout" size={23} className="text-fg-3" />
              Sign out
            </button>
          </form>
        </div>
        <p className="mb-2 mt-6 px-1 text-subhead font-semibold text-fg-2">Appearance</p>
        <ThemeSwitch wide />
      </Sheet>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={palette} />
      <UploadTray />
      <div id="dash-portal" />
    </div>
  );
}

/* — Sidebar ———————————————————————————————————————————————————— */

function Sidebar({
  nav,
  user,
  collapsed,
  onToggle,
  isActive,
  onSearch,
}: {
  nav: NavItem[];
  user: { name: string; email: string; role: string };
  collapsed: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onSearch: () => void;
}) {
  const groups = useMemo(() => {
    const out: { name: string; items: NavItem[] }[] = [];
    for (const n of nav) {
      const g = n.group ?? "";
      const last = out.at(-1);
      if (last && last.name === g) last.items.push(n);
      else out.push({ name: g, items: [n] });
    }
    return out;
  }, [nav]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sb)] flex-col overflow-hidden px-3 pb-3 pt-4 transition-[width] duration-[420ms] ease-[var(--ease-spring)] lg:flex" aria-label="Dashboard">
      <div className={cn("flex h-10 items-center gap-2.5 pl-1.5", collapsed && "justify-center pl-0")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="StaySutra dashboard">
          <BrandMark />
          <span className={cn("min-w-0 transition-opacity duration-200", collapsed && "pointer-events-none w-0 opacity-0")}>
            <span className="block truncate text-callout font-bold tracking-[-0.01em] text-fg">StaySutra</span>
            <span className="-mt-0.5 block truncate text-footnote text-fg-3">Dashboard</span>
          </span>
        </Link>
        {!collapsed && (
          <button type="button" onClick={onToggle} aria-label="Collapse sidebar" title="Collapse sidebar" className="ml-auto grid size-8 shrink-0 place-items-center rounded-full text-fg-3 transition-colors hover:bg-fill-2 hover:text-fg">
            <AdminIcon name="sidebar" size={17} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={collapsed ? onToggle : onSearch}
        aria-label={collapsed ? "Expand sidebar" : "Search"}
        title={collapsed ? "Expand sidebar" : undefined}
        className={cn(
          "mt-4 flex h-9 shrink-0 items-center gap-2 rounded-[11px] text-subhead text-fg-3 transition-colors",
          collapsed ? "justify-center hover:bg-fill-2" : "bg-fill-2 px-2.5 hover:bg-fill-3",
        )}
      >
        <AdminIcon name={collapsed ? "sidebar" : "search"} size={16} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">Search</span>
            <Kbd className="bg-panel/70">
              <ModKey />K
            </Kbd>
          </>
        )}
      </button>

      <nav className="d-scroll d-scroll-slim -mr-2.5 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
        <LayoutGroup id="sidebar">
          {groups.map((g) => (
            <div key={g.name || "top"} className="mb-3">
              {g.name && (
                <p className={cn("mb-1 h-6 truncate px-2.5 pt-1.5 text-footnote font-semibold text-fg-3 transition-opacity", collapsed && "opacity-0")}>{g.name}</p>
              )}
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-9 items-center gap-3 rounded-[11px] px-2.5 text-callout font-medium transition-colors",
                          active ? "text-fg" : "text-fg-2 hover:bg-fill hover:text-fg",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-[11px] bg-panel shadow-tile dark:bg-fill-2"
                            transition={{ type: "spring", bounce: 0, duration: 0.38 }}
                          />
                        )}
                        <AdminIcon name={item.icon} size={18} strokeWidth={active ? 1.9 : 1.6} className={cn("relative shrink-0 transition-colors", active ? "text-accent-text" : "text-fg-3 group-hover:text-fg-2")} />
                        {!collapsed && <span className="relative truncate">{item.label}</span>}
                        {!!item.badge && (
                          <span
                            className={cn(
                              "relative ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-caption font-bold tabular-nums",
                              item.alert ? "bg-neg text-white" : "bg-note text-white",
                              collapsed && "absolute right-2 top-1 ml-0 h-4 min-w-4 px-1 text-[0.625rem]",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </LayoutGroup>
      </nav>

      <div className="space-y-2 pt-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title={collapsed ? "View website" : undefined}
          className={cn("flex h-9 items-center gap-3 rounded-[11px] px-2.5 text-callout font-medium text-fg-2 transition-colors hover:bg-fill hover:text-fg", collapsed && "justify-center px-0")}
        >
          <AdminIcon name="globe" size={18} className="text-fg-3" />
          {!collapsed && (
            <>
              <span className="flex-1">View website</span>
              <AdminIcon name="arrowUpRight" size={14} className="text-fg-4" />
            </>
          )}
        </a>
        {collapsed ? <ThemeCycle /> : <ThemeSwitch />}
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </aside>
  );
}

/* — Appearance ————————————————————————————————————————————————— */

const THEMES: { value: ThemeChoice; label: string; icon: AdminIconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Auto", icon: "monitor" },
];

export function ThemeSwitch({ wide }: { wide?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex rounded-full bg-fill p-[3px]">
      {THEMES.map((t) => {
        const on = theme === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={t.label}
            onClick={(e) => setTheme(t.value, { x: e.clientX, y: e.clientY })}
            className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-full text-footnote font-semibold transition-colors", wide ? "h-10" : "h-7", on ? "text-fg" : "text-fg-3 hover:text-fg-2")}
          >
            {on && <motion.span layoutId={wide ? "theme-wide" : "theme"} className="absolute inset-0 rounded-full bg-thumb shadow-[0_1px_3px_rgb(0_0_0/0.14)]" transition={{ type: "spring", bounce: 0, duration: 0.34 }} />}
            <AdminIcon name={t.icon} size={wide ? 16 : 14} strokeWidth={1.8} className="relative" />
            {wide && <span className="relative">{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Collapsed sidebar: one button that steps through the three appearances. */
function ThemeCycle() {
  const { theme, setTheme } = useTheme();
  const i = THEMES.findIndex((t) => t.value === theme);
  const next = THEMES[(i + 1) % THEMES.length]!;
  const now = THEMES[i]!;
  return (
    <button
      type="button"
      title={`Appearance: ${now.label}. Switch to ${next.label.toLowerCase()}.`}
      onClick={(e) => setTheme(next.value, { x: e.clientX, y: e.clientY })}
      className="grid h-9 w-full place-items-center rounded-[11px] text-fg-3 hover:bg-fill hover:text-fg"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={now.value} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}>
          <AdminIcon name={now.icon} size={18} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function UserMenu({ user, collapsed }: { user: { name: string; email: string; role: string }; collapsed: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const items: MenuItem[] = [
    { label: user.email, icon: "mail", disabled: true },
    { label: "Sign out", icon: "logout", onSelect: () => form.current?.requestSubmit() },
  ];
  return (
    <>
      <form ref={form} action="/api/auth/logout" method="post" hidden />
      <Menu
        side="top"
        align="start"
        width={248}
        items={items}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className={cn("flex w-full items-center gap-2.5 rounded-[12px] p-1.5 text-left transition-colors hover:bg-fill", open && "bg-fill", collapsed && "justify-center")}
          >
            <Avatar name={user.name} size={32} />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-subhead font-semibold text-fg">{user.name}</span>
                  <span className="block truncate text-footnote capitalize text-fg-3">{user.role.toLowerCase()}</span>
                </span>
                <AdminIcon name="chevronDown" size={14} className="mr-1 rotate-180 text-fg-4" />
              </>
            )}
          </button>
        )}
      />
    </>
  );
}

/* — Top bar ———————————————————————————————————————————————————— */

function Topbar({
  section,
  pathname,
  scrolled,
  perms,
  onSearch,
}: {
  section?: NavItem;
  pathname: string;
  scrolled: boolean;
  perms: ShellPerms;
  onSearch: () => void;
}) {
  const { title, collapsed } = useTopbar();
  const parts = pathname.split("/").filter(Boolean).slice(1);
  const isDetail = parts.length > 1;
  const showSmall = collapsed && Boolean(title);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[52px] items-center gap-2 px-3 transition-[background-color,box-shadow] duration-300 sm:px-5 lg:h-14 lg:px-6",
        scrolled ? "d-glass shadow-[0_0.5px_0_var(--d-line-2)]" : "bg-transparent",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Phone: the brand at rest, the page's title once its large title has gone. */}
      <div className="relative flex min-w-0 flex-1 items-center lg:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {showSmall ? (
            <motion.p key="t" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="truncate pl-1 text-headline text-fg">
              {title}
            </motion.p>
          ) : isDetail && section ? (
            <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Link href={section.href} className="flex items-center gap-0.5 text-callout font-medium text-accent-text">
                <AdminIcon name="chevronLeft" size={20} strokeWidth={2} />
                {section.label}
              </Link>
            </motion.div>
          ) : (
            <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Link href="/dashboard" className="flex items-center gap-2 pl-1" aria-label="Overview">
                <BrandMark size={28} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: where you are, always. */}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1 text-callout lg:flex">
        {section ? (
          isDetail ? (
            <>
              <Link href={section.href} className="truncate font-medium text-fg-3 transition-colors hover:text-fg">
                {section.label}
              </Link>
              <AdminIcon name="chevronRight" size={14} className="shrink-0 text-fg-4" />
              <span className="truncate font-semibold text-fg">{title ?? (parts.at(-1) === "new" ? "New" : "Details")}</span>
            </>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={showSmall ? "s" : "n"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", bounce: 0, duration: 0.28 }} className={cn("truncate font-semibold", showSmall ? "text-fg" : "text-fg-3")}>
                {section.label}
              </motion.span>
            </AnimatePresence>
          )
        ) : (
          <span className="font-semibold text-fg">Dashboard</span>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <UploadIndicator />
        <button type="button" onClick={onSearch} aria-label="Search" className="grid size-9 place-items-center rounded-full text-fg-2 transition-colors hover:bg-fill active:scale-90 lg:hidden">
          <AdminIcon name="search" size={19} strokeWidth={1.8} />
        </button>
        <QuickCreate perms={perms} />
      </div>
    </header>
  );
}

function QuickCreate({ perms }: { perms: ShellPerms }) {
  const router = useRouter();
  const toast = useToast();
  const { add } = useUploads();
  const file = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  const items: (MenuItem | "separator")[] = [
    ...(perms.property ? [{ label: "New property", icon: "properties", href: "/dashboard/properties?new=1" } satisfies MenuItem] : []),
    ...(perms.calendar ? [{ label: "Block dates", icon: "calendar", href: "/dashboard/calendar" } satisfies MenuItem] : []),
    ...(perms.story
      ? [
          {
            label: "Write a story",
            icon: "stories",
            onSelect: () =>
              start(async () => {
                try {
                  await createStory();
                } catch (e) {
                  // The action ends in redirect(); the router follows it. Anything else is a real failure.
                  if (!(e instanceof Error && /NEXT_REDIRECT/.test(e.message + String((e as { digest?: string }).digest)))) toast({ kind: "error", title: "Could not start a story" });
                }
              }),
          } satisfies MenuItem,
        ]
      : []),
    ...(perms.media ? ["separator" as const, { label: "Upload photos", icon: "imagePlus", onSelect: () => file.current?.click() } satisfies MenuItem] : []),
  ];
  if (!items.length) return null;

  return (
    <>
      <input
        ref={file}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) {
            const n = add(e.target.files, { scope: "library", folder: null });
            if (n) router.prefetch("/dashboard/media");
          }
          e.target.value = "";
        }}
      />
      <Menu
        items={items}
        trigger={({ toggle, ref, open }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label="Create"
            className={cn(
              "ml-1 flex h-9 items-center gap-1.5 rounded-full bg-fg pl-2.5 pr-3.5 text-subhead font-semibold text-pane transition-[transform,opacity] active:scale-95",
              open && "opacity-85",
            )}
          >
            {pending ? <Spinner size={16} /> : <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", bounce: 0.3, duration: 0.35 }}><AdminIcon name="plus" size={17} strokeWidth={2.2} /></motion.span>}
            <span className="hidden sm:inline">New</span>
          </button>
        )}
      />
    </>
  );
}

/* — Phone tab bar ——————————————————————————————————————————————— */

function TabBar({ nav, isActive, onMore }: { nav: NavItem[]; isActive: (href: string) => boolean; onMore: () => void }) {
  const primary = nav.filter((n) => n.primary);
  const moreActive = nav.some((n) => !n.primary && isActive(n.href));
  return (
    <nav
      aria-label="Dashboard"
      className="d-glass-float fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.625rem)] z-40 mx-auto flex h-[62px] max-w-[30rem] items-stretch rounded-full p-1 lg:hidden"
    >
      <LayoutGroup id="tabs">
        {primary.map((item) => (
          <Tab key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} badge={item.badge} alert={item.alert} />
        ))}
        <button type="button" onClick={onMore} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full">
          {moreActive && <motion.span layoutId="tab-active" className="absolute inset-0 rounded-full bg-fill-2" transition={{ type: "spring", bounce: 0.12, duration: 0.42 }} />}
          <AdminIcon name="more" size={22} className={cn("relative", moreActive ? "text-accent-text" : "text-fg-2")} />
          <span className={cn("relative text-[0.625rem] font-semibold", moreActive ? "text-fg" : "text-fg-3")}>More</span>
        </button>
      </LayoutGroup>
    </nav>
  );
}

function Tab({ href, icon, label, active, badge, alert }: { href: string; icon: AdminIconName; label: string; active: boolean; badge?: number; alert?: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full active:scale-95">
      {active && <motion.span layoutId="tab-active" className="absolute inset-0 rounded-full bg-fill-2" transition={{ type: "spring", bounce: 0.12, duration: 0.42 }} />}
      <span className="relative">
        <AdminIcon name={icon} size={22} strokeWidth={active ? 1.9 : 1.6} className={active ? "text-accent-text" : "text-fg-2"} />
        {!!badge && (
          <span className={cn("absolute -right-2.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white ring-2 ring-[var(--d-glass)]", alert ? "bg-neg" : "bg-note")}>{badge}</span>
        )}
      </span>
      <span className={cn("relative max-w-full truncate px-1 text-[0.625rem] font-semibold", active ? "text-fg" : "text-fg-3")}>{label}</span>
    </Link>
  );
}

/* — Command palette ———————————————————————————————————————————————— */

type Command = PaletteItem & { run?: () => void };

/**
 * ⌘K, Spotlight-style. Jump to any section, property or recent enquiry by
 * typing a few letters; switch appearance; sign out. Arrow keys move, Enter
 * goes, Escape closes.
 */
function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { setTheme } = useTheme();
  const target = usePortalTarget();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const logout = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(
    () => [
      ...items,
      { label: "Light appearance", href: "#", icon: "sun", group: "Appearance", run: () => setTheme("light") },
      { label: "Dark appearance", href: "#", icon: "moon", group: "Appearance", run: () => setTheme("dark") },
      { label: "Match the device", href: "#", icon: "monitor", group: "Appearance", run: () => setTheme("system") },
      { label: "Sign out", href: "#", icon: "logout", group: "Account", run: () => logout.current?.requestSubmit() },
    ],
    [items, setTheme],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.filter((i) => i.group === "Go to" || i.group === "Create");
    const words = needle.split(/\s+/);
    return commands
      .map((i) => {
        const hay = `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (i.label.toLowerCase().startsWith(needle) ? 0 : 1) + (i.group === "Go to" ? 0 : 0.5);
        return { i, score };
      })
      .filter((x): x is { i: Command; score: number } => Boolean(x))
      .sort((a, b) => a.score - b.score)
      .map((x) => x.i)
      .slice(0, 14);
  }, [q, commands]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (item?: Command) => {
    if (!item) return;
    onClose();
    if (item.run) item.run();
    else router.push(item.href);
  };

  if (!target) return null;
  let lastGroup = "";

  return createPortal(
    <>
      <form ref={logout} action="/api/auth/logout" method="post" hidden />
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
            <motion.div className="absolute inset-0 bg-[var(--d-scrim)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.div
              role="dialog"
              aria-label="Search"
              className="d-glass-float relative w-full max-w-[600px] overflow-hidden rounded-[24px]"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -12, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(6px)", transition: { duration: 0.14 } }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.38 }}
            >
              <div className="flex items-center gap-3 px-5">
                <AdminIcon name="search" size={21} strokeWidth={1.8} className="text-fg-3" />
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
                  aria-label="Search"
                  className="h-[60px] min-w-0 flex-1 bg-transparent text-[1.1875rem] tracking-[-0.012em] text-fg outline-none"
                />
                <Kbd>esc</Kbd>
              </div>
              <ul ref={list} className="d-scroll max-h-[52vh] overflow-y-auto border-t border-line p-2">
                {results.length === 0 && <li className="px-3 py-10 text-center text-callout text-fg-3">Nothing matches “{q}”.</li>}
                {results.map((item, i) => {
                  const header = item.group !== lastGroup ? item.group : null;
                  lastGroup = item.group;
                  const on = i === index;
                  return (
                    <li key={`${item.group}-${item.label}-${item.href}`}>
                      {header && <p className="px-3 pb-1 pt-3 text-footnote font-semibold text-fg-3 first:pt-1.5">{header}</p>}
                      <button
                        type="button"
                        data-i={i}
                        onMouseMove={() => setIndex(i)}
                        onClick={() => go(item)}
                        className={cn("flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left text-callout transition-colors", on ? "bg-accent text-accent-fg" : "text-fg")}
                      >
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-[8px]", on ? "bg-black/10" : "bg-fill-2")}>
                          <AdminIcon name={item.icon} size={16} className={on ? "" : "text-fg-2"} />
                        </span>
                        <span className="truncate font-medium">{item.label}</span>
                        {item.hint && <span className={cn("ml-auto truncate pl-3 text-footnote", on ? "text-accent-fg/70" : "text-fg-3")}>{item.hint}</span>}
                        {on && <AdminIcon name="arrowRight" size={15} className={cn("shrink-0", !item.hint && "ml-auto")} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    target,
  );
}
