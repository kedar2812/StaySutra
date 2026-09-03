import { PropertyCard } from "@/components/site/PropertyCard";
import { SnapRail } from "@/components/site/SnapRail";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHead } from "@/components/primitives/Rule";
import { TextLink } from "@/components/primitives/Button";
import { featuredProperties, siteContent } from "@/lib/content";
import { EmptyState } from "@/components/site/EmptyState";

const copy = siteContent.home.featured;

/**
 * ④ A lead card at 2× with the others stepping down — an editorial grid, not
 * four identical tiles. On mobile it becomes a snap rail with edge peek.
 * DPR §4.6, §7.2 ④
 */
export function FeaturedStays() {
  const [lead, ...rest] = featuredProperties;

  return (
    <section aria-labelledby="featured-title" className="section">
      <div className="shell">
        <Reveal>
          <SectionHead
            overline={copy.overline}
            title={<span id="featured-title">{copy.title}</span>}
            action={<TextLink href={copy.action.href}>{copy.action.label}</TextLink>}
          />
        </Reveal>

        {!lead ? (
          <EmptyState
            className="mt-12"
            title="Stays are being onboarded"
            body="The first listings go live as soon as their photography and details are confirmed."
            waMessage="Hi StaySutra, tell me when the first stays go live."
          />
        ) : (
          <>
            <Reveal className="mt-12 hidden lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-14">
              <div className="col-span-7">
                <PropertyCard
                  property={lead}
                  scale="lead"
                  sizes="(min-width:1024px) 56vw, 100vw"
                />
              </div>
              <div className="col-span-5 flex flex-col justify-end gap-10">
                {rest.slice(0, 2).map((p) => (
                  <PropertyCard
                    key={p.slug}
                    property={p}
                    scale="compact"
                    sizes="(min-width:1024px) 38vw, 100vw"
                  />
                ))}
              </div>
              {rest.slice(2, 5).map((p) => (
                <div key={p.slug} className="col-span-4">
                  <PropertyCard property={p} sizes="(min-width:1024px) 30vw, 100vw" />
                </div>
              ))}
            </Reveal>

            <div className="mt-10 lg:hidden">
              <SnapRail
                label="Featured stays"
                className="-mx-[var(--gutter)] pb-2"
                itemClassName="w-[78vw] max-w-[22rem] sm:w-[52vw]"
              >
                {featuredProperties.map((p) => (
                  <PropertyCard key={p.slug} property={p} sizes="78vw" />
                ))}
              </SnapRail>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
