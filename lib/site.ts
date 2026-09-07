import { siteContent } from "./content";
import { env } from "./utils";

export const SITE_URL = env(
  process.env.NEXT_PUBLIC_SITE_URL,
  "https://staysutra.in",
).replace(/\/$/, "");

export const WHATSAPP_NUMBER = env(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  siteContent.settings.whatsappNumber,
);

export const brand = siteContent.brand;
export const settings = siteContent.settings;

/**
 * Every WhatsApp deep link carries context, so the conversation starts with the
 * property already named rather than "hi". DPR §6.2
 */
export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Dates arrive as ISO (yyyy-mm-dd) from `<input type="date">`. WhatsApp is read
 * by a person, so they leave as "12 Oct 2026" — short, unambiguous, and it does
 * not put an American month-first date in front of an Indian host.
 */
function waDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export const waMessage = {
  general: () => "Hi StaySutra, I'd like help planning a trip.",
  property: (name: string, destination: string, slug: string) =>
    `Hi StaySutra, I'm interested in ${name} in ${destination}. Ref: ${SITE_URL}/stays/${slug}`,
  destination: (name: string) =>
    `Hi StaySutra, I'm looking for a stay in ${name}.`,
  owner: () => "Hi StaySutra, I'd like to list my property.",
  passport: () => "Hi StaySutra, I'd like to join the Rider Passport.",

  /**
   * The primary booking flow while confirmation is manual. Every part is
   * optional except the property, so the message degrades in a sentence a host
   * can still act on rather than shipping "from  to  for  guests".
   */
  availability: ({
    name,
    slug,
    checkIn,
    checkOut,
    guests,
  }: {
    name: string;
    slug: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) => {
    const parts = [`Hi StaySutra, I would like to check availability for ${name}`];
    if (checkIn && checkOut) parts.push(`from ${waDate(checkIn)} to ${waDate(checkOut)}`);
    else if (checkIn) parts.push(`from ${waDate(checkIn)}`);
    if (guests) parts.push(`for ${guests} ${guests === 1 ? "guest" : "guests"}`);
    return `${parts.join(" ")}. Ref: ${SITE_URL}/stays/${slug}`;
  },
} as const;

export function canonical(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
