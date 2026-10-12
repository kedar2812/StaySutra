import Link from "next/link";
import { Frame } from "@/components/primitives/Frame";
import { SectionHead } from "@/components/primitives/Rule";
import { TextLink } from "@/components/primitives/Button";
import { Reveal } from "@/components/motion/Reveal";
import { SnapRail } from "@/components/site/SnapRail";
import { stories, siteContent } from "@/lib/content";
import { settings } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { Icon } from "@/components/primitives/Icon";

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
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="press-sm inline-flex min-h-11 items-center gap-2 text-[0.875rem] text-text-mid transition-colors hover:text-text-hi"
                >
                  <Icon name="instagram" size={16} />
                  {settings.instagramHandle}
                </a>
                <TextLink href={copy.action.href}>{copy.action.label}</TextLink>
              </div>
            }
          />
        </Reveal>
      </div>

      {/*
        A rail on a phone, where swiping is the native gesture. On a desktop the
        rail used to cut its fifth card off at the window edge with no arrows,
        which read as overflow rather than as "there is more" — so the four
        latest sit in a row and "Read all stories" covers the rest.
      */}
      <Reveal className="mt-12">
        <div className="shell hidden gap-6 lg:grid lg:grid-cols-4">
          {latest.slice(0, 4).map((s) => (
            <StoryCard key={s.slug} story={s} />
          ))}
        </div>
        <SnapRail
          label="Stories from the road"
          className="pb-2 lg:hidden"
          itemClassName="w-[72vw] max-w-[20rem] md:w-[36vw]"
        >
          {latest.map((s) => (
            <StoryCard key={s.slug} story={s} />
          ))}
        </SnapRail>
      </Reveal>
    </section>
  );
}

function StoryCard({ story: s }: { story: (typeof stories)[number] }) {
  return (
    <Link href={`/stories/${s.slug}`} className="press group block">
      <Frame
        seed={`story-${s.slug}`}
        ratio="4/3"
        sizes="(min-width:1024px) 24vw, (min-width:768px) 36vw, 72vw"
        className="rounded-card"
        imgClassName="transition-transform duration-[480ms] ease-out-quint group-hover:scale-[1.05]"
      />
      <p className="t-caption mt-4 tabular-nums">
        {formatDate(s.publishedAt)} · {s.readMinutes} min read
      </p>
      <h3
        className="mt-2 font-display text-lg leading-tight tracking-[-0.01em] text-text-hi"
        style={{ fontWeight: 700 }}
      >
        {s.title}
      </h3>
    </Link>
  );
}
