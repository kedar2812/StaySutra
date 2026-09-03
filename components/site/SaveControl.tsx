"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";

const KEY = "staysutra:saved";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * A shortlist held in the visitor's own browser. There are no accounts in this
 * contract, so it deliberately stays local — nothing is sent anywhere and
 * nothing pretends to be synced.
 */
export function SaveControl({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(read().includes(slug)), [slug]);

  const toggle = () => {
    const next = saved ? read().filter((s) => s !== slug) : [...read(), slug];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — the control still reflects this session */
    }
    setSaved(!saved);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from your shortlist` : `Save ${name} to your shortlist`}
      className={cn(
        "press glass-chip relative z-10 grid size-10 place-items-center rounded-pill",
        "border border-[color:var(--glass-edge)] transition-colors",
        saved ? "text-gold-500" : "text-text-hi/85 hover:text-text-hi",
        className,
      )}
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px) saturate(150%)",
      }}
    >
      <Icon name="heart" size={17} className={saved ? "fill-current" : undefined} />
    </button>
  );
}
