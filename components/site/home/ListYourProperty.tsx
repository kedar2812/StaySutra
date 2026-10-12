import { ButtonLink } from "@/components/primitives/Button";
import { Frame } from "@/components/primitives/Frame";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent, destinations } from "@/lib/content";

const copy = siteContent.home.owners;

/**
 * ⑨ Owner acquisition — the second revenue line, so it argues rather than
 * announces.
 *
 * Seven services, each with the sentence that says what it actually means. A
 * list of one-word capabilities ("Photography. Marketing. Revenue.") is what
 * every management company already has on its site; the line underneath is the
 * part an owner can judge.
 *
 * The reference mock's stats block (1000+ stays / 25K+ riders / 4.8★) is
 * deliberately not shipped: the mock labels those "target stays" and "target
 * rating", and publishing targets as achievements is a claim the client would
 * have to defend. One verifiable number, computed from content, stands in its
 * place. DPR §7.2 ⑧ option (b), §4.6
 */
export function ListYourProperty() {
  return (
    <section aria-labelledby="owners-title" className="section">
      <div className="shell">
        <Reveal className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-20">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">{copy.overline}</p>
            <h2 id="owners-title" className="t-display-l mt-4 max-w-[14ch]">
              {copy.title}
            </h2>
            <p className="t-lede mt-6 max-w-[42ch]">{copy.lede}</p>

            <div className="relative mt-10">
              <Frame
                seed="list-your-property"
                scene="plateau"
                mood="dawn"
                ratio="4/3"
                sizes="(min-width:1024px) 44vw, 92vw"
                className="rounded-card"
              />
              {/* Deliberate overlap — the panel breaks the image edge. */}
              <div className="glass absolute -bottom-7 -right-6 hidden w-[16rem] rounded-card px-5 py-4 lg:block">
                <p className="on-glass text-[0.9375rem] leading-snug">
                  Launching across {destinations.length} destinations
                </p>
                <p className="t-caption mt-2">{copy.note}</p>
              </div>
            </div>
          </div>

          <div className="lg:pt-2">
            {/* A list of services, not a sequence — so no step numbers. */}
            <ul className="border-t border-[color:var(--hairline)]">
              {copy.services.map((s) => (
                <li
                  key={s.title}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 border-b border-[color:var(--hairline)] py-5"
                >
                  <Icon name="check" size={17} className="mt-0.5 text-text-low" />
                  <div className="min-w-0">
                    <h3
                      className="font-display text-lg leading-tight tracking-[-0.015em] text-text-hi"
                      style={{ fontWeight: 700 }}
                    >
                      {s.title}
                    </h3>
                    <p className="mt-1.5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-text-low">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ButtonLink href={copy.cta.href} size="lg" icon="arrowRight">
                {copy.cta.label}
              </ButtonLink>
              <p className="flex items-center gap-2 text-[0.8125rem] text-text-low sm:pl-2">
                <Icon name="clock" size={15} className="shrink-0" />
                We reply to every submission within two working days.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
