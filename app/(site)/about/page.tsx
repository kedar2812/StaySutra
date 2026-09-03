import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/site/JsonLd";
import { Frame } from "@/components/primitives/Frame";
import { Rule } from "@/components/primitives/Rule";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { destinations, properties, siteContent } from "@/lib/content";
import { breadcrumbSchema, pageMeta } from "@/lib/seo";
import { brand, settings } from "@/lib/site";

const copy = siteContent.about;

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "India's rider-friendly stay network. Why we only list places that work at the end of a long ride, and what we ask before a property goes up.",
  path: "/about",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

/**
 * Editorial layout, generous whitespace, one strong full-bleed image. The brand
 * story here is drafted from StaySutra's own positioning and is flagged in
 * docs/CONTENT-GAPS.md pending the client's own copy. DPR §7.10, §16
 */
export default function AboutPage() {
  return (
    <>
      <PageHero
        overline={copy.overline}
        title={copy.title}
        lede={copy.lede}
        seed="about-hero"
        scene="ghat"
        mood="dawn"
        size="lg"
        trail={trail}
      />

      <section className="shell py-20 lg:py-28">
        <Reveal className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-24">
          <div className="max-w-[64ch] space-y-6 text-[1.0625rem] leading-[1.7] text-text-mid">
            <p className="text-[1.25rem] leading-relaxed text-text-hi">
              A stay is not a room. It is the last hour of a long day and the first
              hour of the next one, and those two hours decide how you remember the
              whole ride.
            </p>
            <p>
              StaySutra started because that hour kept going wrong. Not
              catastrophically — a gate locked at eleven, a bike left on a public
              road overnight, a kitchen that opened two hours after the group wanted
              to leave. Small failures, every one of them avoidable, and none of them
              anything a listing site would tell you about in advance.
            </p>
            <p>
              So we started asking. Eight questions, printed on every listing,
              including the ones where the answer is no. Is the parking covered? Is
              it inside the gate? Is there a tap? Will the kitchen feed a group at
              half five? Does the host ride?
            </p>
            <p>
              That is the whole idea. We are not trying to have the most properties.
              We are trying to have the ones where those answers are yes, and to be
              straight with you about the ones where they are not.
            </p>
          </div>

          <aside className="lg:pt-2">
            <Rule className="mb-5 max-w-24" />
            <h2 className="t-overline">Where we are</h2>
            <dl className="mt-6">
              <Fact term="Destinations" value={String(destinations.length)} note="Maharashtra and Goa" />
              <Fact term="Stays live" value={String(properties.length)} note="Every one visited" />
              <Fact
                term="Rider-friendly"
                value={String(properties.filter((p) => p.isRiderFriendly).length)}
                note="Meeting the checklist"
              />
            </dl>
            <p className="t-caption mt-5">
              Counts come straight from the listings on this site. When they change,
              this changes.
            </p>
          </aside>
        </Reveal>
      </section>

      {/* One strong full-bleed image, given room. */}
      <div className="relative">
        <Parallax className="h-[22rem] overflow-hidden lg:h-[34rem]">
          <Frame seed="about-band" scene="coast" mood="dusk" fill sizes="100vw" />
        </Parallax>
        <div className="pointer-events-none absolute inset-0 scrim-b opacity-70" />
      </div>

      <section className="shell py-20 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-24">
          <Reveal>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">For guests</p>
            <h2 className="t-display-m mt-4 max-w-[16ch] text-balance">
              You know what you are getting before you arrive
            </h2>
            <p className="mt-6 max-w-[44ch] text-[0.9375rem] leading-relaxed text-text-mid">
              Every listing states what the property has for the bike, what time the
              gate opens, and how far the nearest fuel is. There is no instant
              booking — we confirm on WhatsApp, because a two-line conversation
              catches things a form never will.
            </p>
            <ButtonLink href="/stays" icon="arrowRight" className="mt-8">
              Explore stays
            </ButtonLink>
          </Reveal>

          <Reveal delay={0.06}>
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">For owners</p>
            <h2 className="t-display-m mt-4 max-w-[16ch] text-balance">
              We handle the part you did not sign up for
            </h2>
            <p className="mt-6 max-w-[44ch] text-[0.9375rem] leading-relaxed text-text-mid">
              Photography, listing, marketing, pricing guidance, and every guest
              message from the first enquiry to check-out. You keep running the
              property. We bring the people who come back.
            </p>
            <ButtonLink
              href="/list-your-property"
              variant="outline"
              icon="arrowRight"
              className="mt-8"
            >
              Partner with StaySutra
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-[color:var(--hairline)]">
        <div className="shell py-16 lg:py-20">
          <Rule className="mb-5 max-w-24" />
          <p className="t-overline">Reach us</p>
          <ul className="mt-6 grid gap-x-10 sm:grid-cols-3">
            {[
              { icon: "whatsapp" as const, label: "WhatsApp", value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}` },
              { icon: "mail" as const, label: "Email", value: settings.email, href: `mailto:${settings.email}` },
              { icon: "instagram" as const, label: "Instagram", value: settings.instagramHandle, href: settings.instagram },
            ].map((row) => (
              <li key={row.label} className="border-t border-[color:var(--hairline)] py-5">
                <a
                  href={row.href}
                  target={row.href.startsWith("http") ? "_blank" : undefined}
                  rel={row.href.startsWith("http") ? "noreferrer noopener" : undefined}
                  className="press-sm group flex items-start gap-3.5"
                >
                  <Icon name={row.icon} size={20} className="mt-0.5 shrink-0 text-text-low" />
                  <span>
                    <span className="t-caption block uppercase tracking-[0.16em]">
                      {row.label}
                    </span>
                    <span className="mt-1 block text-[0.9375rem] text-text-hi">
                      {row.value}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="t-caption mt-6">
            {brand.name} · {settings.officeLocality}. {settings.responseTime}
          </p>
        </div>
      </section>

      <JsonLd data={breadcrumbSchema(trail)} />
    </>
  );
}

function Fact({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-[color:var(--hairline)] py-4 last:border-b">
      <div>
        <dt className="text-[0.9375rem] text-text-hi">{term}</dt>
        <dd className="t-caption mt-0.5">{note}</dd>
      </div>
      <span className="t-num shrink-0 text-2xl text-text-hi">{value}</span>
    </div>
  );
}
