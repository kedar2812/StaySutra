import { Icon } from "@/components/primitives/Icon";
import { inline, type Block } from "@/lib/prose";

/**
 * Article body. Measure is capped at 68 characters, headings get their own
 * rhythm, and blockquotes are real quotes rather than indented paragraphs.
 * DPR §7.9
 */
export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-[68ch]">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2
                key={i}
                id={block.id}
                className="mt-14 scroll-mt-28 font-display text-2xl uppercase leading-tight tracking-[-0.015em] text-text-hi first:mt-0"
                style={{ fontWeight: 800 }}
              >
                {block.text}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={i}
                id={block.id}
                className="mt-10 scroll-mt-28 font-display text-lg uppercase leading-tight tracking-[-0.01em] text-text-hi"
                style={{ fontWeight: 700 }}
              >
                {block.text}
              </h3>
            );

          case "quote":
            return (
              <blockquote
                key={i}
                className="my-10 border-l-2 border-gold-500 pl-6 lg:-ml-6"
              >
                <Icon name="quote" size={20} className="mb-3 text-text-low" />
                <p className="font-display text-lg leading-snug tracking-[-0.01em] text-text-hi lg:text-xl">
                  {block.text}
                </p>
              </blockquote>
            );

          case "ul":
            return (
              <ul key={i} className="my-7 space-y-3">
                {block.items.map((item, j) => (
                  <li key={j} className="grid grid-cols-[auto_1fr] gap-x-3.5">
                    <span
                      className="mt-[0.7em] h-1 w-2.5 shrink-0 bg-[var(--hairline-str)]"
                      aria-hidden
                    />
                    <span
                      className="text-[1.0625rem] leading-relaxed text-text-mid"
                      dangerouslySetInnerHTML={{ __html: inline(item) }}
                    />
                  </li>
                ))}
              </ul>
            );

          case "rule":
            return (
              <hr
                key={i}
                className="my-12 h-px border-0 bg-[var(--hairline)]"
              />
            );

          default:
            return (
              <p
                key={i}
                className="mt-5 text-[1.0625rem] leading-[1.7] text-text-mid first:mt-0"
                dangerouslySetInnerHTML={{ __html: inline(block.text) }}
              />
            );
        }
      })}
    </div>
  );
}
