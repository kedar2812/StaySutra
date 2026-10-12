import { Icon } from "@/components/primitives/Icon";
import { whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The last slot in a short grid. Two stays in a three-column row left an empty
 * column that read as something failing to load; the slot now holds the one
 * thing a guest can always do — ask — so a short list ends on an action
 * instead of a gap.
 */
export function AskTile({
  place,
  message,
  className,
}: {
  place: string;
  message: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "press group flex min-h-[18rem] flex-col justify-between rounded-card border border-dashed border-[color:var(--hairline-str)] p-6 transition-colors hover:border-gold-500/60 lg:p-8",
        className,
      )}
    >
      <Icon name="whatsapp" size={26} className="text-text-low transition-colors group-hover:text-gold-400" />
      <div>
        <p
          className="font-display text-xl leading-tight tracking-[-0.015em] text-text-hi"
          style={{ fontWeight: 700 }}
        >
          Not the right fit in {place}?
        </p>
        <p className="mt-3 max-w-[32ch] text-[0.9375rem] leading-relaxed text-text-mid">
          Tell us your dates and your group. We know places that are not on the site yet.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-mid transition-colors group-hover:text-gold-400">
          Ask on WhatsApp
          <Icon name="arrowUpRight" size={15} />
        </p>
      </div>
    </a>
  );
}
