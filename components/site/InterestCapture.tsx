"use client";

import { useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Field, Honeypot } from "@/components/primitives/Field";
import { Icon } from "@/components/primitives/Icon";
import { track } from "@/lib/analytics";

/**
 * Name + phone against a feature that does not exist yet. Writes an Enquiry with
 * source = GENERAL so the interest is visible in the Phase 2 inbox rather than
 * evaporating. DPR §7.7
 */
export function InterestCapture({
  feature,
  /** Overrides for places where "tell me when it's ready" is too small a promise. */
  openLabel = "Tell me when it’s ready",
  submitLabel = "Keep me posted",
  doneMessage,
  /** Skips the collapsed state — used where the form is the point of the page. */
  expanded = false,
}: {
  feature: string;
  openLabel?: string;
  submitLabel?: string;
  doneMessage?: string;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());

  if (done) {
    return (
      <p className="flex items-center gap-2 text-[0.9375rem] text-text-mid">
        <Icon name="check" size={17} className="shrink-0 text-gold-500" />
        {doneMessage ?? `We will tell you when ${feature} is ready.`}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex items-center gap-2 rounded-pill border border-[color:var(--hairline-str)] px-5 py-2.5 text-[0.8125rem] font-medium text-text-hi transition-colors hover:border-gold-500 hover:text-gold-400"
      >
        <Icon name="mail" size={15} />
        {openLabel}
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a 10-digit Indian mobile number");
      return;
    }
    if (name.trim().length < 2) {
      setError("Tell us your name");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: "",
          source: "GENERAL",
          message: `Interested in: ${feature}`,
          company: "",
          startedAt,
          pageUrl: window.location.href,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await res.json();
      track("enquiry_submit", { source: "GENERAL", feature });
      setDone(true);
    } catch {
      setError("That did not go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-sm space-y-3">
      <Honeypot value="" onChange={() => {}} />
      <Field
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        placeholder="Full name"
      />
      <Field
        label="Mobile"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        placeholder="10-digit number"
        error={error ?? undefined}
      />
      <Button type="submit" size="sm" disabled={busy} icon="arrowRight">
        {busy ? "Sending…" : submitLabel}
      </Button>
      <p className="t-caption">
        One message when {feature} goes live. Nothing else.
      </p>
    </form>
  );
}
