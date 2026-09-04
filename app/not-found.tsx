import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { destinations } from "@/lib/content";
import { waMessage, whatsappLink } from "@/lib/site";

/**
 * A branded 404 that offers routes onward rather than dead-ending — Explore
 * Stays, Destinations and WhatsApp, plus the live destination list. It is also
 * what a deleted property resolves to. DPR §6.4, §7.12, §8.1
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="grain relative isolate flex min-h-[80svh] items-center overflow-hidden pt-[calc(var(--header-h)+3rem)] pb-20">
          <div className="absolute inset-0 -z-10">
            <Frame seed="not-found" scene="highway" mood="night" muted fill sizes="100vw" />
            <div className="absolute inset-0 scrim-l" />
            <div className="absolute inset-0 bg-ink-900/55" />
          </div>

          <div className="shell relative">
            <Rule className="mb-5 max-w-24" />
            <p className="t-overline">Error 404</p>
            <h1 className="t-display-xl mt-4 max-w-[13ch] text-balance">
              Wrong turn.
            </h1>
            <p className="t-lede mt-6 max-w-[44ch]">
              This page does not exist — or it did, and the stay it described has
              come off the site. Either way, here is the way back.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/stays" size="lg" icon="arrowRight">
                Explore stays
              </ButtonLink>
              <ButtonLink href="/destinations" variant="outline" size="lg">
                Destinations
              </ButtonLink>
              <ButtonLink
                href={whatsappLink(waMessage.general())}
                target="_blank"
                rel="noreferrer noopener"
                variant="ghost"
                size="lg"
                icon="whatsapp"
                iconAfter={false}
              >
                Ask us
              </ButtonLink>
            </div>

            <div className="mt-16">
              <h2 className="t-caption uppercase tracking-[0.2em] text-text-hi">
                Or pick a destination
              </h2>
              <Rule className="mt-4 max-w-md" />
              <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
                {destinations.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/destinations/${d.slug}`}
                      className="press-sm group inline-flex items-center gap-1.5 text-[0.9375rem] text-text-low transition-colors hover:text-text-hi"
                    >
                      {d.name}
                      <Icon
                        name="arrowRight"
                        size={14}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
