import type Lenis from "lenis";

/**
 * Page scroll lock for overlays — the menu, the sheets and the gallery.
 *
 * `overflow: hidden` alone does not lock this page. Lenis drives the scroll
 * itself and writes the position back to the window on every frame, and a
 * programmatic scroll is not stopped by overflow — the page kept travelling
 * underneath an open menu, 2,400px for eight wheel ticks. So the lock does both:
 * it stops Lenis, and it hides overflow on the root for touch and keyboard.
 *
 * Counted, so a sheet opened over the menu does not unlock the page when it
 * closes first. Scrollable regions inside an overlay carry `data-lenis-prevent`
 * so the wheel still moves them while the page stays put.
 *
 * `is-scroll-locked` on <html> also lets floating chrome (the WhatsApp button)
 * step aside while an overlay is up, without every overlay knowing about it.
 */

let lenis: Lenis | null = null;
let locks = 0;
let previous = "";

export function registerLenis(instance: Lenis | null) {
  lenis = instance;
  if (instance && locks > 0) instance.stop();
}

export function lockScroll(): () => void {
  locks += 1;
  if (locks === 1) {
    const root = document.documentElement;
    previous = root.style.overflow;
    root.style.overflow = "hidden";
    root.classList.add("is-scroll-locked");
    lenis?.stop();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      const root = document.documentElement;
      root.style.overflow = previous;
      root.classList.remove("is-scroll-locked");
      lenis?.start();
    }
  };
}
