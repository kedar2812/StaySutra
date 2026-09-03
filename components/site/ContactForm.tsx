"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ButtonLink } from "@/components/primitives/Button";
import { Field, Honeypot, TextArea } from "@/components/primitives/Field";
import { Icon } from "@/components/primitives/Icon";
import { contactSchema, type ContactInput } from "@/lib/validation";
import { waMessage, whatsappLink } from "@/lib/site";
import { track } from "@/lib/analytics";

export function ContactForm() {
  const [ref, setRef] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    defaultValues: { company: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          email: values.email,
          message: `${values.subject}\n\n${values.message}`,
          source: "CONTACT",
          company: values.company ?? "",
          startedAt,
          pageUrl: window.location.href,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { refCode: string };
      setRef(data.refCode);
      track("enquiry_submit", { source: "CONTACT" });
    } catch {
      setFailed(true);
    }
  });

  if (ref) {
    return (
      <div
        role="status"
        className="rounded-surface border border-[color:var(--hairline-str)] bg-ink-800 p-6 text-center"
      >
        <Icon name="check" size={26} className="mx-auto text-gold-500" />
        <h3 className="t-heading mt-4">Message received.</h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-mid">
          Your reference is{" "}
          <span className="t-num text-text-hi" style={{ fontWeight: 800 }}>
            {ref}
          </span>
          . We reply the same day.
        </p>
        <ButtonLink
          href={whatsappLink(`${waMessage.general()} Ref: ${ref}`)}
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
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Honeypot {...register("company")} />

      <div className="grid gap-4 sm:grid-cols-2">
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
        placeholder="Optional"
        error={errors.email?.message}
        {...register("email")}
      />

      <Field
        label="Subject"
        required
        placeholder="Booking, listing a property, something else"
        error={errors.subject?.message}
        {...register("subject")}
      />

      <TextArea
        label="Message"
        required
        rows={5}
        placeholder="Dates, group size, where you want to be."
        error={errors.message?.message}
        {...register("message")}
      />

      {failed && (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--color-err)]">
          That did not go through. Try again, or message us on WhatsApp — we will see
          it either way.
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full" icon="arrowRight">
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
