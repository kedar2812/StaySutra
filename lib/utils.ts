import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ₹ with Indian digit grouping and no decimals — prices here are whole rupees. */
export function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Truncates on a word boundary so a card never cuts mid-word. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Treats a blank environment variable as an absent one.
 *
 * `??` only catches undefined, so a variable that exists but holds "" — exactly
 * what you get from seeding a deployment dashboard with the keys in
 * .env.example — slips past the fallback and reaches code that expected a real
 * value. An empty NEXT_PUBLIC_SITE_URL reaching `new URL()` is what failed the
 * first two Vercel builds.
 *
 * Pass the value, never the name. Next.js inlines `process.env.NEXT_PUBLIC_*`
 * by literal text substitution, so a dynamic lookup would never be replaced in
 * the client bundle.
 */
export function env(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
