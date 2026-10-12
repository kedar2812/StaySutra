"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/primitives/Icon";
import { whatsappLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * The floating WhatsApp button. DPR §6.2
 *
 * A float is only useful where it is not in the way, so it appears only when
 * nothing else on screen already offers the same action or needs the corner:
 *
 *   - not over the first screen, where the hero carries its own buttons;
 *   - not while any element marked `data-wa-hide` is in view — the footer, the
 *     final call to action, enquiry forms, the inline availability panel;
 *   - not under an open menu, sheet or gallery (`.is-scroll-locked`, CSS).
 *
 * Property pages render their own instance with a pre-filled message and
 * `desktopOnly`: below the desktop breakpoint the docked price bar carries a
 * WhatsApp button, and two of them six pixels apart is one too many.
 * `scope` lets globals.css hide the layout's global instance whenever a
 * page-specific one is on the document.
 */
export function WhatsAppFloat({
  message,
  source,
  scope = "page",
  desktopOnly = false,
}: {
  message: string;
  source: string;
  /** "global" instances yield to any page-specific float on the same document. */
  scope?: "global" | "page";
  desktopOnly?: boolean;
}) {
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);
  const [blocked, setBlocked] = useState(false);

  /*
   * Reading is scrolling down, so that is when the button gets out of the way
   * of the text under it. It comes back the moment you scroll up — reaching
   * for something — or stop for a second.
   */
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = window.scrollY;
    let idle = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setPastHero(y > window.innerHeight * 0.65);
        if (y > last + 6) setReading(true);
        else if (y < last - 6) setReading(false);
        last = y;
        window.clearTimeout(idle);
        idle = window.setTimeout(() => setReading(false), 900);
      });
    };
    onScroll();
    setReading(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-wa-hide], footer");
    if (!targets.length) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setBlocked(visible.size > 0);
      },
      // Only the lower part of the screen matters — that is where the button is.
      { rootMargin: "-40% 0px 0px 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [pathname]);

  const shown = pastHero && !blocked && !reading;

  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with StaySutra on WhatsApp"
      data-wa-float={scope}
      tabIndex={shown ? undefined : -1}
      aria-hidden={shown ? undefined : true}
      onClick={() => track("whatsapp_click", { source })}
      className={cn(
        "press glass fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 z-40 grid size-[3.25rem] place-items-center rounded-pill text-text-hi transition-[opacity,transform,color] duration-300 ease-out-quint hover:text-gold-400 sm:right-6 sm:size-14",
        shown ? "opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0",
        desktopOnly && "max-lg:hidden",
      )}
    >
      <Icon name="whatsapp" size={24} />
    </a>
  );
}
