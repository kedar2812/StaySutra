import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import type { ReactNode } from "react";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import type { PlateMood, PlateScene } from "@/lib/plate";

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span className="t-caption text-text-mid" aria-current="page">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.path} className="t-caption transition-colors hover:text-text-hi">
                    {c.name}
                  </Link>
                  <Icon name="chevronRight" size={12} className="text-text-low" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The standard page opening: a plate band, breadcrumbs, overline and title.
 * Deliberately shorter than the homepage hero — one cinematic moment per site.
 */
export function PageHero({
  overline,
  title,
  lede,
  seed,
  scene,
  mood,
  trail,
  meta,
  children,
  size = "md",
}: {
  overline?: string;
  title: ReactNode;
  lede?: ReactNode;
  seed: string;
  scene?: PlateScene;
  mood?: PlateMood;
  trail?: Crumb[];
  meta?: ReactNode;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const pad = {
    sm: "pb-12 lg:pb-16",
    md: "pb-16 lg:pb-24",
    lg: "pb-20 lg:pb-32",
  }[size];

  return (
    <section
      className={cn(
        "grain relative isolate overflow-hidden pt-[calc(var(--header-h)+3.5rem)]",
        pad,
      )}
    >
      <div className="absolute inset-0 -z-10">
        <Frame seed={seed} scene={scene} mood={mood} muted fill sizes="100vw" />
        <div className="absolute inset-0 scrim-b" />
        <div className="absolute inset-0 bg-ink-900/45" />
      </div>

      <div className="shell relative">
        {trail && (
          <div className="mb-8">
            <Breadcrumbs trail={trail} />
          </div>
        )}
        {overline && (
          <>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{overline}</p>
          </>
        )}
        <h1
          className={cn(
            "mt-4 max-w-[16ch] text-balance",
            size === "lg" ? "t-display-xl" : "t-display-l",
          )}
        >
          {title}
        </h1>
        {lede && <p className="t-lede mt-6 max-w-[54ch]">{lede}</p>}
        {meta && <div className="mt-8">{meta}</div>}
        {children}
      </div>
    </section>
  );
}
