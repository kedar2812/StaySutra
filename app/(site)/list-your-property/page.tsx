import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { OwnerForm } from "@/components/site/OwnerForm";
import { JsonLd } from "@/components/site/JsonLd";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { Frame } from "@/components/primitives/Frame";
import { Reveal } from "@/components/motion/Reveal";
import { siteContent } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { waMessage, whatsappLink } from "@/lib/site";

const copy = siteContent.listProperty;

export const metadata: Metadata = pageMeta({
  title: "List your property",
  description:
    "Turn your villa, farmhouse or resort into a professionally managed stay. Photography, marketing, revenue management and end-to-end guest communication.",
  path: "/list-your-property",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "List your property", path: "/list-your-property" },
];

export default function ListYourPropertyPage() {
  return (
    <>
      <PageHero
        overline={copy.overline}
        title={copy.title}
        lede={copy.lede}
        seed="list-your-property-hero"
        scene="plateau"
        mood="dawn"
        trail={trail}
      />

      {/* The sell — what the owner gets, and how the process runs. */}
      <section className="shell py-20 lg:py-28">
        <Reveal className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">What we handle</p>
            <h2 className="t-display-m mt-4 max-w-[17ch] text-balance">
              You keep running the property
            </h2>
            <ul className="mt-8">
              {copy.handled.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3.5 border-t border-[color:var(--hairline)] py-4 last:border-b"
                >
                  <Icon name="check" size={17} className="mt-1 shrink-0 text-text-low" />
                  <span className="text-[0.9375rem] leading-relaxed text-text-mid">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">How it works</p>
            <h2 className="t-display-m mt-4 max-w-[17ch] text-balance">
              Four steps, about ten minutes
            </h2>
            <ol className="mt-8">
              {copy.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] gap-x-5 border-t border-[color:var(--hairline)] py-5 last:border-b"
                >
                  <span className="t-num pt-0.5 text-sm text-text-low">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[0.9375rem] font-medium leading-tight text-text-hi">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-low">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* Image band — the deliberate breathing room before the form. */}
      <div className="relative h-[16rem] lg:h-[24rem]">
        <Frame seed="owner-band" scene="coast" mood="dusk" fill sizes="100vw" />
        <div className="pointer-events-none absolute inset-0 scrim-b opacity-80" />
      </div>

      {/* The form */}
      <section
        id="submit"
        aria-labelledby="submit-title"
        className="border-t border-[color:var(--hairline)] bg-ink-800/40 scroll-mt-24"
      >
        <div className="shell py-20 lg:py-28">
          <div className="max-w-3xl">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">Submit your property</p>
            <h2 id="submit-title" className="t-display-m mt-4">
              Send us the details
            </h2>
            <p className="mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-text-mid">
              We read every submission ourselves. Nothing goes live without a
              conversation first, and nothing you send here is published until you
              have seen the listing.
            </p>

            <div className="mt-12">
              <OwnerForm />
            </div>

            <p className="t-caption mt-10 flex items-start gap-2">
              <Icon name="whatsapp" size={14} className="mt-0.5 shrink-0" />
              Would rather talk first?{" "}
              <a
                href={whatsappLink(waMessage.owner())}
                target="_blank"
                rel="noreferrer noopener"
                className="text-gold-500 underline underline-offset-4 transition-colors hover:text-gold-400"
              >
                Message us on WhatsApp
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}
