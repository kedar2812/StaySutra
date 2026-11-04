"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The website's side of Dashboard → Analytics. On every page it sends one
 * small beacon ("this page was shown"), and when the page is left, a second
 * one with how long it was actually visible. No cookie, no storage, nothing
 * that identifies a person — see lib/server/analytics.ts.
 */
export function SiteAnalytics() {
  const pathname = usePathname();
  const view = useRef<{ id: string; visibleMs: number; since: number | null } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const send = (payload: object) => {
      const body = JSON.stringify(payload);
      try {
        if (navigator.sendBeacon?.("/api/collect", new Blob([body], { type: "text/plain" }))) return;
      } catch {}
      fetch("/api/collect", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    };

    const leave = () => {
      const v = view.current;
      if (!v) return;
      if (v.since !== null) v.visibleMs += performance.now() - v.since;
      v.since = null;
      if (v.visibleMs > 400) send({ t: "leave", id: v.id, s: v.visibleMs / 1000 });
    };

    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    view.current = { id, visibleMs: 0, since: document.visibilityState === "visible" ? performance.now() : null };
    send({ t: "view", id, u: window.location.pathname + window.location.search, r: first.current ? document.referrer : "", w: window.innerWidth });
    first.current = false;

    const onVisibility = () => {
      const v = view.current;
      if (!v) return;
      if (document.visibilityState === "hidden") {
        leave();
      } else if (v.since === null) {
        v.since = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      leave();
      view.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
    };
  }, [pathname]);

  return null;
}
