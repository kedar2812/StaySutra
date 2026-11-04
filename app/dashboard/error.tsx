"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";

/**
 * When a screen fails to load. Says what happened in plain words, keeps the
 * navigation around it, and offers the two things that usually fix it.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-[22px] bg-neg/12 text-neg-text">
          <AdminIcon name="alert" size={28} strokeWidth={1.6} />
        </span>
        <h1 className="mt-5 text-title text-fg">This screen didn’t load</h1>
        <p className="mt-2 text-callout leading-relaxed text-fg-3">
          Nothing was changed. It is usually the connection — try again. If it keeps happening, quote this code to whoever looks after the site
          {error.digest ? (
            <>
              : <span className="font-mono text-fg-2">{error.digest}</span>
            </>
          ) : null}
          .
        </p>
        <div className="mt-6 flex gap-2">
          <Button variant="primary" icon="refresh" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Overview
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
