import { ButtonLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";
import { whatsappLink, waMessage } from "@/lib/site";

const copy = siteContent.home.finalCta;

/**
 * ⑩ The page's deliberate breathing room. One idea, maximum whitespace, and the
 * only section on the homepage that does far less than it could. DPR §4.6, §7.2 ⑩
 */
export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="relative overflow-hidden">
      <div className="shell py-32 lg:py-48">
        <Reveal>
          <h2 id="final-cta-title" className="t-display-xl max-w-[13ch] text-balance">
            {copy.titleLines.map((line, i) => (
              <span key={line} className={i === copy.titleLines.length - 1 ? "block text-gold-500" : "block"}>
                {line}
              </span>
            ))}
          </h2>

          <p className="t-lede mt-8 max-w-[36ch]">{copy.lede}</p>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full sm:[&>a]:w-auto">
            <ButtonLink href={copy.primaryCta.href} size="lg" icon="arrowRight">
              {copy.primaryCta.label}
            </ButtonLink>
            {/* Planning a ride is a conversation, so it opens one. */}
            <ButtonLink
              href={whatsappLink(waMessage.general())}
              target="_blank"
              rel="noreferrer noopener"
              variant="outline"
              size="lg"
              icon="whatsapp"
              iconAfter={false}
            >
              {copy.secondaryCta.label}
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
