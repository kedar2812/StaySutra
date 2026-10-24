"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "motion/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ButtonLink } from "@/components/primitives/Button";
import { Field, Honeypot, TextArea } from "@/components/primitives/Field";
import { Icon } from "@/components/primitives/Icon";
import { enquirySchema, type EnquiryInput } from "@/lib/validation";
import { whatsappLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { isRangeFree } from "@/lib/calendar/dates";
import type { BlockedRange } from "@/lib/types";

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
  blocked,
  className,
}: {
  /** Booked nights. A range that touches one is refused before it is sent. */
  blocked?: BlockedRange[];
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    mode: "onBlur",
    defaultValues: { source, propertySlug, destinationSlug, company: "" },
  });

  const clash = () =>
    setError("checkOut", {
      message: "Those nights are already booked. Pick other dates, or ask us on WhatsApp.",
    });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(false);
    if (blocked && values.checkIn && values.checkOut && !isRangeFree(values.checkIn, values.checkOut, blocked)) {
      clash();
      return;
    }
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
      if (res.status === 409) {
        clash();
        return;
      }
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
        {/*
          The end of the journey is what gets remembered, and the moment after
          sending is when doubt sets in. So it lands with weight, and says
          exactly what happens next and when — in the order it will happen.
        */}
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
          className="mx-auto grid size-14 place-items-center rounded-full bg-gold-500 text-gold-ink"
        >
          <Icon name="check" size={26} />
        </motion.span>
        <h3 className="t-heading mt-5">We have it.</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-mid">
          Your reference is{" "}
          <span className="t-num text-text-hi" style={{ fontWeight: 800 }}>
            {ref}
          </span>
          .
        </p>
        <ol className="mx-auto mt-6 max-w-[22rem] space-y-3 text-left">
          {[
            ["Now", "We check your dates with the host."],
            ["Same day", "A written quote reaches you on WhatsApp."],
            ["Only then", "You decide. Nothing is paid until you say yes."],
          ].map(([when, what], i) => (
            <motion.li
              key={when}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, type: "spring", bounce: 0, duration: 0.4 }}
              className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-[color:var(--hairline)] pt-3 text-[0.875rem]"
            >
              <span className="font-semibold uppercase tracking-[0.1em] text-[0.6875rem] leading-5 text-gold-400">
                {when}
              </span>
              <span className="leading-5 text-text-mid">{what}</span>
            </motion.li>
          ))}
        </ol>
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
