"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth scroll. Native scrollbars are preserved and the whole thing is
 * off under prefers-reduced-motion — smoothing the scroll of someone who asked
 * for less motion is exactly the wrong trade. DPR §4.5
 *
 * Lenis keeps its own scroll position and writes it back to the window on every
 * animation frame. That makes it authoritative, and it means anything that
 * moves the page without telling Lenis gets undone a frame later. Two things
 * do exactly that, and both are handled here:
 *
 *   1. App Router navigation. Next calls `window.scrollTo(0, 0)` on a route
 *      change; Lenis, still holding the previous page's offset, immediately
 *      scrolls back — so a link followed from halfway down one page opened the
 *      next one halfway down. Every route change now resets Lenis itself.
 *   2. In-page anchors. A native `#id` jump was being reverted the same way.
 *      `anchors` hands those clicks to Lenis, which honours the target's
 *      `scroll-margin-top` — that is what keeps `#enquire` and `#availability`
 *      clear of the fixed header instead of landing underneath it.
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const start = () => {
      if (lenis.current || query.matches) return;
      lenis.current = new Lenis({
        lerp: 0.09,
        duration: 1.1,
        smoothWheel: true,
        anchors: true,
      });
      const loop = (time: number) => {
        lenis.current?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lenis.current?.destroy();
      lenis.current = null;
    };

    if (query.matches) stop();
    else start();

    const onChange = () => (query.matches ? stop() : start());
    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  /*
   * A new page starts at the top of a new page.
   *
   * Keyed on the pathname alone, deliberately. The listing filters live in the
   * query string, and yanking someone back to the top every time they change
   * a price band would be its own bug.
   *
   * The first run is skipped so this never fights the browser: a reload, or a
   * back button, restores a scroll position on purpose, and that is not ours
   * to overrule.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // A link that names a section still goes to that section.
    const hash = window.location.hash;
    const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;

    if (lenis.current) {
      if (target) lenis.current.scrollTo(target, { immediate: true, force: true });
      else lenis.current.scrollTo(0, { immediate: true, force: true });
      return;
    }

    // Reduced motion: Lenis is not running, so Next's own scroll handling is
    // already correct for the top case and only an anchor needs help.
    if (target) target.scrollIntoView();
  }, [pathname]);

  return null;
}
