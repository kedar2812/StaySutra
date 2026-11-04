"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Light, dark, or whatever the device is set to.
 *
 * The choice lives in a cookie so the server renders the right appearance on
 * the first paint — a dashboard that flashes white before turning dark at
 * 11 pm is exactly the kind of thing that makes software feel cheap.
 *
 * Switching is a View Transition: the new appearance grows out of the button
 * that was pressed, as a circle. Reduced motion gets a short cross-fade.
 */

import { THEME_COOKIE, type ThemeChoice } from "./theme-keys";
export type { ThemeChoice };

interface ThemeCtx {
  theme: ThemeChoice;
  /** What is actually showing right now — "system" resolved. */
  resolved: "light" | "dark";
  setTheme: (next: ThemeChoice, origin?: { x: number; y: number }) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "system", resolved: "light", setTheme: () => {} });
export const useTheme = () => useContext(Ctx);

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
const resolve = (t: ThemeChoice): "light" | "dark" => (t === "system" ? (prefersDark() ? "dark" : "light") : t);

export function ThemeRoot({
  initial,
  className,
  style,
  children,
}: {
  initial: ThemeChoice;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeChoice>(initial);
  const [resolved, setResolved] = useState<"light" | "dark">(initial === "dark" ? "dark" : "light");

  useEffect(() => {
    setResolved(resolve(theme));
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  const setTheme = useCallback<ThemeCtx["setTheme"]>(
    (next, origin) => {
      try {
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {}
      const before = resolve(theme);
      const after = resolve(next);
      const apply = () => flushSync(() => setThemeState(next));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;

      // Same appearance either way (e.g. "system" while the system is dark): no show.
      if (before === after || !vt) return apply();

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const root = document.documentElement.style;
      root.setProperty("--vt-x", `${x}px`);
      root.setProperty("--vt-y", `${y}px`);
      root.setProperty("--vt-r", `${r}px`);
      if (reduced) root.setProperty("--vt-r", "0px");
      vt.call(document, apply);
    },
    [theme],
  );

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme }}>
      <div className={cn("dash", className)} data-theme={theme} style={style}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
