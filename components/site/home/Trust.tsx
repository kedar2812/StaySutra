import { Icon } from "@/components/primitives/Icon";
import { SectionHead } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";

const copy = siteContent.home.trust;

/**
 * ⑪ The reassurance block, immediately before the closing CTA.
 *
 * Deliberately has no statistics. Every "1000+ stays / 25K+ riders / 4.8★"
 * number on the reference mock is a target rather than a fact, and publishing a
 * target as an achievement is a claim the client would have to defend to a
 * first guest who asks. Five verifiable promises about how the service works
 * carry more weight at launch than five figures nobody can check. DPR §4.6, §12
 *
 * Layout is a hairline table on a dark band — no cards, no boxes, nothing that
 * repeats the section above it.
 */
export function Trust() {
  return (
    <section
      aria-labelledby="trust-title"
      className="border-y border-[color:var(--hairline)] bg-ink-800"
    >
      <div className="shell py-20 lg:py-28">
        <Reveal>
          <SectionHead
            overline={copy.overline}
            title={<span id="trust-title">{copy.title}</span>}
          />
        </Reveal>

        <Reveal delay={0.06}>
          <ul className="mt-12 grid border-t border-[color:var(--hairline)] sm:grid-cols-2 lg:grid-cols-5">
            {copy.items.map((item) => (
              <li
                key={item.title}
                className="border-b border-[color:var(--hairline)] py-6 sm:pr-6 sm:even:border-l sm:even:pl-6 lg:border-b-0 lg:border-l lg:px-6 lg:pb-0 lg:pt-8 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="grid size-8 place-items-center rounded-pill border border-[color:var(--hairline-str)]">
                  <Icon name="check" size={15} className="text-text-hi" />
                </span>
                <h3
                  className="mt-4 font-display text-[0.9375rem] uppercase leading-tight tracking-[-0.005em] text-text-hi"
                  style={{ fontWeight: 700 }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-text-low">{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
