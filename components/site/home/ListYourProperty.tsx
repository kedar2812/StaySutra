import { ButtonLink } from "@/components/primitives/Button";
import { Frame } from "@/components/primitives/Frame";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent, destinations } from "@/lib/content";

const copy = siteContent.home.owners;

/**
 * ⑧ Owner acquisition.
 *
 * The reference's stats block (1000+ stays / 25K+ riders / 50+ destinations /
 * 4.8★) is deliberately not shipped: the mock itself labels those "target
 * stays" and "target rating", and publishing targets as achievements is a claim
 * the client would have to defend. This ships DPR §7.2 ⑧ option (b) — an honest
 * reframe — with one verifiable number computed from the database.
 * Logged in docs/CONTENT-GAPS.md for the client's decision.
 */
export function ListYourProperty() {
  return (
    <section aria-labelledby="owners-title" className="section">
      <div className="shell">
        <Reveal className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="relative">
            <Frame
              seed="list-your-property"
              scene="plateau"
              mood="dawn"
              ratio="4/3"
              sizes="(min-width:1024px) 48vw, 92vw"
              className="rounded-card"
            />
            {/* Deliberate overlap — the panel breaks the image edge. */}
            <div className="glass absolute -bottom-7 -right-6 hidden w-[17rem] rounded-card px-6 py-5 lg:block">
              <p className="flex items-baseline gap-3">
                <span className="t-num text-4xl text-gold-500">{destinations.length}</span>
                <span className="on-glass text-[0.9375rem] leading-snug">
                  destinations live at launch
                </span>
              </p>
              <p className="t-caption mt-2.5">Across Maharashtra and Goa.</p>
            </div>
          </div>

          <div>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{copy.overline}</p>
            <h2 id="owners-title" className="t-display-m mt-4 max-w-[18ch] text-balance">
              {copy.title}
            </h2>
            <p className="t-lede mt-6 max-w-[46ch]">{copy.lede}</p>

            <ul className="mt-9">
              {copy.benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3.5 border-t border-[color:var(--hairline)] py-4 last:border-b"
                >
                  <Icon name="check" size={17} className="mt-1 shrink-0 text-text-low" />
                  <span className="text-[0.9375rem] leading-relaxed text-text-mid">{b}</span>
                </li>
              ))}
            </ul>

            <ButtonLink href={copy.cta.href} size="lg" icon="arrowRight" className="mt-9">
              {copy.cta.label}
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
