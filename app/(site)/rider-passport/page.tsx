import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/site/JsonLd";
import { InterestCapture } from "@/components/site/InterestCapture";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { brand, waMessage, whatsappLink } from "@/lib/site";

const copy = siteContent.riderPassport;
const stamps = siteContent.home.passport.stamps;

export const metadata: Metadata = pageMeta({
  title: "Rider Passport",
  description:
    "Keep a record of every StaySutra stay, route and ride. One log of where you have been and what you rode to get there — stamped at every StaySutra property.",
  path: "/rider-passport",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Rider Passport", path: "/rider-passport" },
];

/**
 * The Rider Passport has its own URL because it is the one idea in the network
 * nobody else has, and because "make it prominent" means a destination, not a
 * larger box on the homepage.
 *
 * It is not built yet, and the page says so in plain words rather than
 * implying a live product. The only thing it asks for is a name and a mobile
 * number, which lands in the same enquiry inbox as everything else — so the
 * interest is a real, countable list on day one instead of a promise nobody
 * recorded. DPR §7.7, §12
 */
export default function RiderPassportPage() {
  const [lineOne, lineTwo, lineThree] = copy.titleLines;

  return (
    <>
      <PageHero
        overline={copy.overline}
        title={
          <>
            <span className="block">{lineOne}</span>
            <span className="block">{lineTwo}</span>
            <span className="block text-gold-500">{lineThree}</span>
          </>
        }
        lede={copy.lede}
        seed="rider-passport"
        scene="highway"
        mood="dusk"
        size="lg"
        trail={trail}
      >
        <div className="mt-10">
          <ButtonLink href="#join" size="lg" icon="arrowRight">
            Join the Rider Passport
          </ButtonLink>
        </div>
      </PageHero>

      {/* What it records */}
      <section aria-labelledby="passport-holds" className="shell py-20 lg:py-28">
        <Reveal>
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">What it holds</p>
          <h2 id="passport-holds" className="t-display-m mt-4 max-w-[18ch] text-balance">
            {copy.title}
          </h2>
          <div className="mt-7 max-w-[62ch] space-y-4 text-[1.0625rem] leading-relaxed text-text-mid">
            {copy.body.split("\n\n").map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.06} className="mt-14 grid gap-x-10 gap-y-2 sm:grid-cols-3">
          {stamps.map((stamp) => (
            <div key={stamp.title} className="border-t border-[color:var(--hairline)] pt-6">
              <span className="grid size-11 place-items-center rounded-pill border border-[color:var(--hairline-str)]">
                <Icon name={iconFor(stamp.iconKey)} size={19} className="text-text-mid" />
              </span>
              <h3
                className="mt-4 font-display text-[1.0625rem] uppercase leading-tight text-text-hi"
                style={{ fontWeight: 700 }}
              >
                {stamp.title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-text-low">{stamp.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* How it works — four steps on a road, drawn the way the nav is */}
      <section
        aria-labelledby="passport-how"
        className="border-y border-[color:var(--hairline)] bg-ink-800"
      >
        <div className="shell py-20 lg:py-28">
          <Reveal>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">How it works</p>
            <h2 id="passport-how" className="t-display-m mt-4 max-w-[16ch] text-balance">
              Four steps. You only do the first one.
            </h2>
          </Reveal>

          <Reveal delay={0.06}>
            <ol className="relative mt-12 grid gap-y-10 lg:grid-cols-4 lg:gap-x-8">
              {/* The road, measured — the same device as the header's route bar. */}
              <span
                aria-hidden
                className="absolute left-[7px] top-2 hidden h-[calc(100%-1rem)] w-px bg-[var(--hairline-str)] lg:left-0 lg:top-[7px] lg:block lg:h-px lg:w-full"
              />
              <span
                aria-hidden
                className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-[var(--hairline-str)] lg:hidden"
              />

              {copy.howItWorks.map((step) => (
                <li key={step.number} className="relative pl-8 lg:pl-0 lg:pr-6 lg:pt-8">
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 block size-[15px] rounded-pill border border-[color:var(--hairline-str)] bg-ink-800 lg:top-0"
                  >
                    <span className="absolute inset-[3px] rounded-pill bg-text-low" />
                  </span>
                  <span className="t-num block text-[0.8125rem] tabular-nums text-text-low">
                    {step.number}
                  </span>
                  <h3
                    className="mt-3 font-display text-[1.0625rem] uppercase leading-tight text-text-hi"
                    style={{ fontWeight: 700 }}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-[0.9375rem] leading-relaxed text-text-low">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Join */}
      <section id="join" aria-labelledby="passport-join" className="scroll-mt-28">
        <div className="shell grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:py-28">
          <Reveal>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">Join the list</p>
            <h2 id="passport-join" className="t-display-m mt-4 max-w-[14ch] text-balance">
              Be among the first to carry one
            </h2>
            <p className="mt-6 max-w-[44ch] text-[0.9375rem] leading-relaxed text-text-mid">
              The Rider Passport is not live yet — we are not going to pretend otherwise. Leave a
              name and a number and you will hear from us once, when it is. Nothing else, and never
              from anyone but {brand.name}.
            </p>

            <p className="mt-8">
              <a
                href={whatsappLink(waMessage.passport())}
                target="_blank"
                rel="noreferrer noopener"
                className="press-sm inline-flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-text-low transition-colors hover:text-text-hi"
              >
                <Icon name="whatsapp" size={16} />
                Or tell us on WhatsApp
              </a>
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-surface border border-[color:var(--hairline-str)] bg-ink-800/70 p-6 lg:p-8">
              <InterestCapture
                feature="the Rider Passport"
                expanded
                submitLabel="Join the Rider Passport"
                doneMessage="You are on the list. We will be in touch when the passport is ready."
              />
            </div>
          </Reveal>
        </div>
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
