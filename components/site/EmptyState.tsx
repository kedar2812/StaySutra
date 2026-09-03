import { ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Empty is a designed state, not a blank grid. Every one of them offers a way
 * forward — usually WhatsApp, because that is where this business actually
 * closes. DPR §6.4, §12
 */
export function EmptyState({
  title,
  body,
  waMessage,
  actions,
  className,
}: {
  title: string;
  body: string;
  waMessage?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-surface border border-[color:var(--hairline)] bg-ink-800/60 px-6 py-14 text-center",
        className,
      )}
    >
      <Icon name="compass" size={28} className="mx-auto text-text-low" />
      <h3 className="t-heading mt-5">{title}</h3>
      <p className="mx-auto mt-3 max-w-[46ch] text-[0.9375rem] leading-relaxed text-text-low">
        {body}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {actions}
        {waMessage && (
          <ButtonLink
            href={whatsappLink(waMessage)}
            target="_blank"
            rel="noreferrer noopener"
            variant="outline"
            icon="whatsapp"
            iconAfter={false}
          >
            Ask on WhatsApp
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
