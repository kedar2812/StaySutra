import { z } from "zod";

/**
 * One schema per form, shared by the client and the server. Never validate twice
 * with two definitions. Messages are specific — "Invalid input" tells nobody
 * anything. DPR §6.1
 */

const phone = z
  .string()
  .trim()
  .regex(/^(\+?91[\s-]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number");

const name = z
  .string()
  .trim()
  .min(2, "Tell us your name")
  .max(80, "That name is longer than we can store");

const email = z
  .string()
  .trim()
  .email("Check the email address — it needs an @ and a domain")
  .max(160)
  .optional()
  .or(z.literal(""));

export const enquirySchema = z
  .object({
    name,
    phone,
    email,
    checkIn: z.string().optional().or(z.literal("")),
    checkOut: z.string().optional().or(z.literal("")),
    guests: z.coerce.number().int().min(1).max(60).optional(),
    message: z.string().trim().max(1200, "Keep it under 1200 characters").optional(),
    propertySlug: z.string().optional(),
    destinationSlug: z.string().optional(),
    source: z.enum(["PROPERTY", "DESTINATION", "CONTACT", "GENERAL"]),
    pageUrl: z.string().optional(),
    // Spam controls — a bot fills the honeypot; a human takes over 3 seconds.
    company: z.literal("").optional(),
    startedAt: z.number().optional(),
  })
  .refine(
    (v) => !v.checkIn || !v.checkOut || v.checkOut > v.checkIn,
    { message: "Check-out has to be after check-in", path: ["checkOut"] },
  );

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const contactSchema = z.object({
  name,
  phone,
  email,
  subject: z.string().trim().min(2, "Give it a subject").max(120),
  message: z.string().trim().min(10, "A sentence or two is enough").max(1200),
  company: z.literal("").optional(),
  startedAt: z.number().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/* — Owner submission, one schema per step. DPR §7.8 ————————————— */

export const ownerStep1 = z.object({
  ownerName: name,
  ownerPhone: phone,
  ownerEmail: z.string().trim().email("Check the email address").max(160),
  propertyName: z.string().trim().min(2, "What is the property called?").max(120),
  propertyType: z.string().min(1, "Pick the closest type"),
  city: z.string().trim().min(2, "Which city or town?").max(80),
  state: z.string().trim().min(2, "Which state?").max(80),
  locality: z.string().trim().max(120).optional().or(z.literal("")),
});

export const ownerStep2 = z.object({
  maxGuests: z.coerce.number().int().min(1, "At least one").max(200),
  bedrooms: z.coerce.number().int().min(0).max(80),
  bathrooms: z.coerce.number().int().min(0).max(80),
  amenityKeys: z.array(z.string()).default([]),
  facilityKeys: z.array(z.string()).default([]),
  hasBikeParking: z.boolean().default(false),
  parkingCapacity: z.coerce.number().int().min(0).max(200).optional(),
  expectedPrice: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const ownerStep4 = z.object({
  notes: z.string().trim().max(1200).optional().or(z.literal("")),
  consent: z.literal(true, {
    errorMap: () => ({ message: "We need your agreement to the terms to continue" }),
  }),
});

export const ownerSubmissionSchema = ownerStep1.merge(ownerStep2).merge(ownerStep4);
export type OwnerStep1 = z.infer<typeof ownerStep1>;
export type OwnerStep2 = z.infer<typeof ownerStep2>;
export type OwnerStep4 = z.infer<typeof ownerStep4>;
export type OwnerSubmission = z.infer<typeof ownerSubmissionSchema>;

/**
 * "SS-2609-0143" — short enough to read out on a call, unique enough to quote.
 */
export function refCode(prefix = "SS"): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const n = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${mm}${yy}-${n}`;
}
