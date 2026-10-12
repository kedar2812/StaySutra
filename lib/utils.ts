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

/**
 * "14:00" → "2 pm", "14:30" → "2:30 pm". Check-in times are entered on a
 * 24-hour clock and read by people who say "two o'clock". Anything that is not
 * an HH:MM time is returned unchanged.
 */
export function clockTime(value: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return value;
  const h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? `${h12} ${suffix}` : `${h12}:${min} ${suffix}`;
}

/**
 * Keeps hyphenated words whole. A heading or a narrow grid cell otherwise
 * breaks "check-in" into "check-" and "in", or "rider-friendly" across two
 * lines of display type. Returns the string split into plain text and
 * hyphenated words so the caller can wrap the latter in `whitespace-nowrap`.
 */
export function hyphenParts(text: string): { text: string; keep: boolean }[] {
  return text
    .split(/(\S+-\S+)/)
    .filter(Boolean)
    .map((t) => ({ text: t, keep: /\S-\S/.test(t) }));
}
