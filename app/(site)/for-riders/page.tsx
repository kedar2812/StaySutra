import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/site/JsonLd";
import { InterestCapture } from "@/components/site/InterestCapture";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { ButtonLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";

const copy = siteContent.forRiders;
const items = siteContent.home.riders.items;

export const metadata: Metadata = pageMeta({
  title: "For riders",
  description:
    "Rider Passport, epic routes, motorcycle trips, rider stories and community — what StaySutra is building, and where each piece stands right now.",
  path: "/for-riders",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "For riders", path: "/for-riders" },
];

/**
 * Informational for this contract. Every block that is not live carries a
 * COMING SOON chip and, instead of a dead link, an interest-capture field that
 * writes an Enquiry with source = GENERAL. Routes get a reserved URL structure
 * (/routes/[slug]) but no pages. DPR §7.7
 */
export default function ForRidersPage() {
  return (
    <>
      <PageHero
        overline={copy.overline}
        title={copy.title}
        lede={copy.lede}
        seed="for-riders"
        scene="ghat"
        mood="night"
        trail={trail}
      />

      <section className="shell py-20 lg:py-28">
        <ol className="grid gap-y-4">
          {items.map((item, i) => {
            const live = item.status === "live";
            return (
              <Reveal
                as="li"
                key={item.title}
                delay={Math.min(i, 5) * 0.05}
                className="grid grid-cols-[auto_1fr] gap-x-5 border-t border-[color:var(--hairline)] pt-8 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10"
              >
                <span className="t-num text-sm text-text-low lg:text-base">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Icon
                      name={iconFor(item.iconKey)}
                      size={24}
                      className="shrink-0 text-text-low"
                    />
                    <h2
                      className="font-display text-xl uppercase leading-tight tracking-[-0.01em] text-text-hi lg:text-2xl"
                      style={{ fontWeight: 800 }}
                    >
                      {item.title}
                    </h2>
                    {live ? (
                      <span className="rounded-chip bg-gold-500 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-gold-ink">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-chip border border-[color:var(--hairline)] px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-text-low">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-4 max-w-[44ch] text-[0.9375rem] leading-relaxed text-text-mid">
                    {item.body}
                  </p>
                </div>

                <div className="col-start-2 mt-6 pb-10 lg:col-start-3 lg:mt-0">
                  {live ? (
                    <ButtonLink href="/stories" variant="outline" icon="arrowRight">
                      Read the stories
                    </ButtonLink>
                  ) : (
                    <InterestCapture feature={item.title} />
                  )}
                </div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      <section className="border-t border-[color:var(--hairline)] bg-ink-800/40">
        <div className="shell py-20 lg:py-28">
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">In the meantime</p>
          <h2 className="t-display-m mt-4 max-w-[18ch] text-balance">
            The stays are live now, and that is the part that matters
          </h2>
          <p className="mt-6 max-w-[48ch] text-[0.9375rem] leading-relaxed text-text-mid">
            Everything above is being built. None of it is required for the thing
            StaySutra actually does today — put you somewhere good at the end of a
            long ride, with the bike under a roof.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/stays" size="lg" icon="arrowRight">
              Explore stays
            </ButtonLink>
            <ButtonLink href="/rider-friendly-stays" variant="outline" size="lg">
              What rider-friendly means
            </ButtonLink>
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
