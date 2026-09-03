"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { whatsappLink } from "@/lib/site";

/**
 * A branded error page with a retry that actually retries. Never a framework
 * default. DPR §6.4
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-svh items-center bg-ink-900 px-[var(--gutter)] py-24"
    >
      <div className="mx-auto w-full max-w-xl">
        <Rule className="mb-5 max-w-24" />
        <p className="t-overline">Something broke</p>
        <h1 className="t-display-l mt-4 max-w-[14ch] text-balance">
          That did not load.
        </h1>
        <p className="t-lede mt-6">
          The fault is on our side, not yours. Try again — and if it keeps
          happening, tell us on WhatsApp and we will fix it.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button onClick={reset} size="lg" icon="arrowRight">
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink
            href={whatsappLink(
              `Hi StaySutra, a page on the site failed to load.${
                error.digest ? ` Ref: ${error.digest}` : ""
              }`,
            )}
            target="_blank"
            rel="noreferrer noopener"
            variant="ghost"
            size="lg"
            icon="whatsapp"
            iconAfter={false}
          >
            Report it
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="t-caption mt-10 flex items-center gap-2">
            <Icon name="shield" size={14} className="shrink-0" />
            Reference: <span className="tabular-nums">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
