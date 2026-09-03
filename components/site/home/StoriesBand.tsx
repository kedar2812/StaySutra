import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { SectionHead } from "@/components/primitives/Rule";
import { TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { SnapRail } from "@/components/site/SnapRail";
import { stories, siteContent } from "@/lib/content";
import { settings } from "@/lib/site";
import { formatDate } from "@/lib/utils";

const copy = siteContent.home.stories;

/**
 * ⑨ Pulls the latest published Stories. If nothing is published the band hides
 * entirely rather than rendering an empty heading. DPR §7.2 ⑨, §12
 */
export function StoriesBand() {
  const latest = stories.slice(0, 5);
  if (!latest.length) return null;

  return (
    <section aria-labelledby="stories-title" className="pb-24 lg:pb-32">
      <div className="shell">
        <Reveal>
          <SectionHead
            overline={copy.overline}
            title={<span id="stories-title">{copy.title}</span>}
            action={
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <TextLink href={copy.action.href}>{copy.action.label}</TextLink>
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="t-caption uppercase tracking-[0.16em] transition-colors hover:text-text-hi"
                >
                  Follow {settings.instagramHandle}
                </a>
              </div>
            }
          />
        </Reveal>
      </div>

      <Reveal className="mt-12">
        <SnapRail
          label="Stories from the road"
          className="pb-2"
          itemClassName="w-[72vw] max-w-[20rem] md:w-[26vw]"
        >
          {latest.map((s) => (
            <Link key={s.slug} href={`/stories/${s.slug}`} className="press group block">
              <Frame
                seed={`story-${s.slug}`}
                ratio="4/3"
                muted
                sizes="(min-width:768px) 26vw, 72vw"
                className="rounded-card"
                imgClassName="transition-transform duration-[480ms] ease-out-quint group-hover:scale-[1.05]"
              >
                <div className="absolute inset-0 scrim-b opacity-80" />
              </Frame>
              <p className="t-caption mt-4 tabular-nums">
                {formatDate(s.publishedAt)} · {s.readMinutes} min read
              </p>
              <h3
                className="mt-2 font-display text-lg uppercase leading-tight tracking-tight text-text-hi"
                style={{ fontWeight: 700 }}
              >
                {s.title}
              </h3>
            </Link>
          ))}
        </SnapRail>
      </Reveal>
    </section>
  );
}
