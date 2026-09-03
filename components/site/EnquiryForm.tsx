"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ButtonLink } from "@/components/primitives/Button";
import { Field, Honeypot, TextArea } from "@/components/primitives/Field";
import { Icon } from "@/components/primitives/Icon";
import { enquirySchema, type EnquiryInput } from "@/lib/validation";
import { whatsappLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Source = "PROPERTY" | "DESTINATION" | "CONTACT" | "GENERAL";

/**
 * The enquiry form. Validates on blur against the same Zod schema the server
 * action re-checks, cannot be double-submitted, and replaces itself in place
 * with the reference code and a WhatsApp handoff. DPR §6.1
 *
 * The server action, Turnstile, rate limiting and the notification email land
 * with the database in P1-11 — the contract and the states are already here.
 */
export function EnquiryForm({
  source,
  propertySlug,
  destinationSlug,
  waMessage,
  compact = false,
  withDates = false,
  className,
}: {
  source: Source;
  propertySlug?: string;
  destinationSlug?: string;
  waMessage: string;
  compact?: boolean;
  withDates?: boolean;
  className?: string;
}) {
  const [ref, setRef] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    mode: "onBlur",
    defaultValues: { source, propertySlug, destinationSlug, company: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      // Timing check — a human does not complete a form in under three seconds.
      if (Date.now() - startedAt < 3000) {
        await new Promise((r) => setTimeout(r, 3000 - (Date.now() - startedAt)));
      }
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, startedAt, pageUrl: window.location.href }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { refCode: string };
      setRef(data.refCode);
      track("enquiry_submit", { property_slug: propertySlug ?? null, source });
    } catch {
      setFailed(true);
    }
  });

  if (ref) {
    return (
      <div
        className={cn(
          "rounded-surface border border-[color:var(--hairline-str)] bg-ink-800 p-6 text-center",
          className,
        )}
        role="status"
      >
        <Icon name="check" size={26} className="mx-auto text-gold-500" />
        <h3 className="t-heading mt-4">We have it.</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-mid">
          Your reference is{" "}
          <span className="t-num text-text-hi" style={{ fontWeight: 800 }}>
            {ref}
          </span>
          . We reply the same day, usually within a few hours.
        </p>
        <ButtonLink
          href={whatsappLink(`${waMessage} Ref: ${ref}`)}
          target="_blank"
          rel="noreferrer noopener"
          icon="whatsapp"
          iconAfter={false}
          className="mt-6 w-full"
        >
          Continue on WhatsApp
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("space-y-4", className)}>
      <Honeypot {...register("company")} />

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field
          label="Your name"
          required
          autoComplete="name"
          placeholder="Full name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Field
          label="Mobile"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="10-digit number"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Optional, for the written confirmation"
        error={errors.email?.message}
        {...register("email")}
      />

      {withDates && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Check-in" type="date" error={errors.checkIn?.message} {...register("checkIn")} />
          <Field label="Check-out" type="date" error={errors.checkOut?.message} {...register("checkOut")} />
          <Field
            label="Guests"
            type="number"
            min={1}
            max={60}
            defaultValue={2}
            error={errors.guests?.message}
            {...register("guests")}
          />
        </div>
      )}

      <TextArea
        label="Anything we should know"
        rows={compact ? 3 : 4}
        placeholder="Group size, arrival time, bikes to park — whatever matters."
        error={errors.message?.message}
        {...register("message")}
      />

      {failed && (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--color-err)]">
          That did not go through. Try again, or message us on WhatsApp — we will
          see it either way.
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full" icon="arrowRight">
        {isSubmitting ? "Sending…" : "Send enquiry"}
      </Button>

      <p className="t-caption text-center">
        No spam, no calls you did not ask for. We reply on WhatsApp.
      </p>
    </form>
  );
}
