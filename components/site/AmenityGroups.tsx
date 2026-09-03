"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { spring } from "@/lib/motion";
import type { ManagedItem } from "@/lib/types";

/**
 * Amenities grouped, with "Show all" expanding in place on a measured height —
 * not an `auto` guess that jumps. DPR §7.6 (6)
 */
export function AmenityGroups({ items, initial = 8 }: { items: ManagedItem[]; initial?: number }) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - initial;

  const groups = items.reduce<Record<string, ManagedItem[]>>((acc, item) => {
    const key = item.group ?? "More";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  const visible = expanded ? items : items.slice(0, initial);
  const visibleGroups = expanded
    ? groups
    : visible.reduce<Record<string, ManagedItem[]>>((acc, item) => {
        const key = item.group ?? "More";
        (acc[key] ??= []).push(item);
        return acc;
      }, {});

  return (
    <div>
      <motion.div
        layout={reduced ? false : true}
        transition={spring.ui}
        className="grid gap-x-10 gap-y-8 sm:grid-cols-2"
      >
        {Object.entries(visibleGroups).map(([group, list]) => (
          <div key={group}>
            <h3 className="t-caption uppercase tracking-[0.16em] text-text-hi">{group}</h3>
            <ul className="mt-3">
              {list.map((a) => (
                <li
                  key={a.slug}
                  className="flex items-center gap-3 border-t border-[color:var(--hairline)] py-3 text-[0.9375rem] text-text-mid"
                >
                  <Icon
                    name={iconFor(a.iconKey)}
                    size={19}
                    className="shrink-0 text-text-low"
                  />
                  {a.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="press mt-7 inline-flex items-center gap-2 rounded-pill border border-[color:var(--hairline-str)] px-5 py-2.5 text-[0.8125rem] font-medium text-text-hi transition-colors hover:border-gold-500 hover:text-gold-400"
        >
          {expanded ? "Show less" : `Show all ${items.length}`}
          <Icon
            name="chevronDown"
            size={15}
            className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </button>
      )}
    </div>
  );
}
