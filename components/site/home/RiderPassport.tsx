import { Frame } from "@/components/primitives/Frame";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";
import { brand } from "@/lib/site";

const copy = siteContent.home.passport;

/**
 * ⑦ The Rider Passport.
 *
 * This is the one idea on the site that no competitor has, so it is the one
 * section allowed to be an object rather than a layout: a passport page,
 * rendered as glass over a dimmed road, with the three things it records set
 * out as entries rather than as feature bullets.
 *
 * Nothing here claims a number. There is no member count, no stamp count and no
 * serial — the panel says the number is issued on your first stay, which is
 * true, instead of printing a fabricated one. DPR §4.6, §12
 *
 * Gold budget for this viewport: the last headline line, the CTA, and the rule
 * across the top of the passport panel. Nothing else. §4.2
 */
export function RiderPassport() {
  const [lineOne, lineTwo, lineThree] = copy.titleLines;

  return (
    <section
      aria-labelledby="passport-title"
      className="grain relative isolate overflow-hidden border-y border-[color:var(--hairline)]"
    >
      <div className="absolute inset-0 -z-10">
        <Frame seed="rider-passport-band" scene="ghat" mood="night" muted fill sizes="100vw" />
        <div className="absolute inset-0 bg-ink-900/82" />
        <div className="absolute inset-0 scrim-l opacity-80" />
      </div>

      <div className="shell grid items-center gap-14 py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 lg:py-32">
        <Reveal>
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">{copy.overline}</p>

          <h2 id="passport-title" className="t-display-l mt-4">
            <span className="block">{lineOne}</span>
            <span className="block">{lineTwo}</span>
            <span className="block text-gold-500">{lineThree}</span>
          </h2>

          <p className="t-lede mt-7 max-w-[38ch] text-text-hi">{copy.lede}</p>
          <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-text-mid">
            {copy.body}
          </p>

          <ButtonLink href={copy.cta.href} size="lg" icon="arrowRight" className="mt-9">
            {copy.cta.label}
          </ButtonLink>
        </Reveal>

        {/* The artefact. One glass surface — nothing else on this band is glass. */}
        <Reveal delay={0.08}>
          <div className="glass relative overflow-hidden rounded-surface p-7 lg:p-9">
            {/* The one gold rule: the passport's own top edge. */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gold-500/70" />

            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-mark text-[0.9375rem] uppercase tracking-[0.34em] text-text-hi">
                  {brand.name}
                </p>
                <p className="mt-2 text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-text-low">
                  Rider Passport
                </p>
              </div>
              <Icon name="book" size={26} className="shrink-0 text-text-low" />
            </div>

            {/* A perforation, not a border — it reads as a document. */}
            <span
              aria-hidden
              className="mt-7 block h-px"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--hairline-str) 0 6px, transparent 6px 12px)",
              }}
            />

            <ul className="mt-2">
              {copy.stamps.map((stamp) => (
                <li
                  key={stamp.title}
                  className="flex items-start gap-4 border-b border-[color:var(--hairline)] py-5 last:border-b-0"
                >
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-pill border border-[color:var(--hairline-str)]">
                    <Icon name={iconFor(stamp.iconKey)} size={18} className="text-text-mid" />
                  </span>
                  <span className="min-w-0">
                    <span className="on-glass block text-[0.9375rem] leading-tight">
                      {stamp.title}
                    </span>
                    <span className="t-caption mt-1.5 block">{stamp.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <span
              aria-hidden
              className="mt-1 block h-px"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--hairline-str) 0 6px, transparent 6px 12px)",
              }}
            />

            {/*
              Where a passport prints its number. We do not have one to print
              and will not invent one, so the field states when it gets filled.
            */}
            <p className="mt-5 flex items-baseline gap-3">
              <span className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-text-low">
                No.
              </span>
              <span aria-hidden className="h-px flex-1 bg-[var(--hairline-str)]" />
            </p>
            <p className="t-caption mt-2.5">{copy.serialNote}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
