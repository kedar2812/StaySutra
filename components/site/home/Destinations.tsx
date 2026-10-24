import { DestinationTile } from "@/components/site/DestinationTile";
import { SectionHead } from "@/components/primitives/Rule";
import { TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { getContent } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Asymmetric mosaic: one lead over two rows, two tiles stacked beside it, the
 * rest three across underneath. Every destination we serve is on the page.
 *
 * The old layout ended on a full-width banner, which at desktop width cropped
 * the Goa photograph down to a strip of glittering water and set its text on
 * top of it. Every tile here is close enough to its photograph's own shape to
 * keep the subject. New destinations from the dashboard slot in by sortOrder.
 */
export async function Destinations() {
  const c = await getContent();
  const copy = c.site.home.destinations;
  // Lead with where the stays are; a destination still onboarding never takes the big tile.
  const ordered = [...c.destinations].sort((a, b) => c.countIn(b.slug) - c.countIn(a.slug));
  const [lead, ...rest] = ordered;
  if (!lead) return null;

  return (
    <section aria-labelledby="destinations-title" className="section">
      <div className="shell">
        <Reveal>
          <SectionHead
            title={<span id="destinations-title">{copy.title}</span>}
            lede={copy.lede}
            action={<TextLink href="/destinations">All destinations</TextLink>}
          />
        </Reveal>

        <Reveal className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DestinationTile
            destination={lead}
            count={c.countIn(lead.slug)}
            size="lg"
            sizes="(min-width:1024px) 62vw, 92vw"
            className="min-h-[26rem] sm:col-span-2 lg:row-span-2 lg:min-h-[34rem]"
          />
          {rest.map((d, i) => (
            <DestinationTile
              key={d.slug}
              destination={d}
              count={c.countIn(d.slug)}
              sizes="(min-width:1024px) 30vw, 45vw"
              className={cn(
                "min-h-[15rem] lg:min-h-[16.5rem]",
                i === rest.length - 1 && rest.length % 2 === 1 && "sm:col-span-2 lg:col-span-1",
              )}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
