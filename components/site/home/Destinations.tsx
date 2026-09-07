import { DestinationTile } from "@/components/site/DestinationTile";
import { SectionHead } from "@/components/primitives/Rule";
import { TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { destinations, siteContent } from "@/lib/content";

const copy = siteContent.home.destinations;

/**
 * ⑥ Asymmetric mosaic. One tall lead, a block of four, and a full-width banner
 * to close — so every destination we serve is on the page rather than five of
 * six with a "view all" link doing the apologising.
 *
 * New destinations added from the dashboard appear here automatically, ordered
 * by sortOrder; the layout degrades cleanly at any count because each slot is
 * taken with `slice`.
 */
export function Destinations() {
  const [lead, ...rest] = destinations;
  if (!lead) return null;

  const block = rest.slice(0, 4);
  const banner = rest[4];

  return (
    <section aria-labelledby="destinations-title" className="pb-24 lg:pb-32">
      <div className="shell">
        <Reveal>
          <SectionHead
            overline={copy.overline}
            title={<span id="destinations-title">{copy.title}</span>}
            lede={copy.lede}
            action={<TextLink href="/destinations">All destinations</TextLink>}
          />
        </Reveal>

        <Reveal className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          <DestinationTile
            destination={lead}
            size="lg"
            sizes="(min-width:1024px) 50vw, 92vw"
            className="min-h-[26rem] sm:col-span-2 lg:row-span-2 lg:min-h-[34rem]"
          />
          {block.map((d) => (
            <DestinationTile
              key={d.slug}
              destination={d}
              sizes="(min-width:1024px) 25vw, 45vw"
              className="min-h-[15rem] lg:min-h-[16.75rem]"
            />
          ))}
        </Reveal>

        {banner && (
          <Reveal className="mt-4">
            <DestinationTile
              destination={banner}
              size="lg"
              sizes="(min-width:1024px) 92vw, 92vw"
              className="min-h-[18rem] lg:min-h-[22rem]"
            />
          </Reveal>
        )}
      </div>
    </section>
  );
}
