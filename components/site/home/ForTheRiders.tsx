import Link from "next/link";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";

const copy = siteContent.home.riders;

/**
 * ⑧ An editorial preview of the ecosystem.
 *
 * Each piece leads with the line the client wants it known by — "Routes worth
 * planning a weekend around", "Ride with us. Stay with us.", "Find your next
 * ride." — so an unbuilt feature still reads as a stated intention rather than
 * as an empty slot. Anything that does not exist yet carries a muted COMING
 * SOON chip and no link at all: a dead link is what makes a section feel
 * unfinished, not the honest label. DPR §7.2 ⑦
 */
export function ForTheRiders() {
  return (
    <section aria-labelledby="riders-title" className="border-y border-[color:var(--hairline)] bg-ink-800">
      <div className="shell grid gap-12 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20 lg:py-32">
        {/* Holds its place while the list passes, instead of leaving half the
            section empty. */}
        <Reveal className="lg:sticky lg:top-[calc(var(--header-h)+3rem)] lg:self-start">
          <h2 id="riders-title" className="t-display-l max-w-[12ch]">
            {copy.title}
          </h2>
          <p className="t-lede mt-6 max-w-[42ch]">{copy.lede}</p>
          <TextLink href="/for-riders" className="mt-8">
            See what&rsquo;s coming
          </TextLink>
        </Reveal>

        <Reveal delay={0.08}>
          <ul>
            {copy.items.map((item) => {
              // "waitlist" is a real page with a real form behind it, so it
              // links like a live item — but it says what it is.
              const live = item.status === "live" || item.status === "waitlist";
              const href = "href" in item ? (item.href as string) : undefined;
              const row = (
                <>
                  <Icon
                    name={iconFor(item.iconKey)}
                    size={24}
                    className="mt-0.5 shrink-0 text-text-low transition-colors group-hover:text-text-mid"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3
                        className="font-display text-xl leading-tight tracking-[-0.015em] text-text-hi"
                        style={{ fontWeight: 700 }}
                      >
                        {item.title}
                      </h3>
                      {item.status !== "live" && (
                        <span className="rounded-chip border border-[color:var(--hairline-str)] px-2 py-0.5 text-xs font-medium text-text-mid">
                          {item.status === "waitlist" ? "Waitlist open" : "Coming soon"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[0.9375rem] leading-snug text-text-mid">
                      {item.tagline}
                    </p>
                    <p className="mt-1.5 text-[0.875rem] leading-relaxed text-text-low">
                      {item.body}
                    </p>
                  </div>
                  {live && (
                    <Icon
                      name="arrowUpRight"
                      size={18}
                      className="mt-1 shrink-0 self-start text-text-low transition-transform duration-300 ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  )}
                </>
              );

              const cls =
                "group grid grid-cols-[auto_1fr_auto] items-start gap-x-5 border-t border-[color:var(--hairline)] py-6 last:border-b";

              return (
                <li key={item.title}>
                  {live && href ? (
                    <Link href={href} className={`press-sm ${cls}`}>
                      {row}
                    </Link>
                  ) : (
                    <div className={cls}>{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
