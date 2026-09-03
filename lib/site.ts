import { siteContent } from "./content";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://staysutra.in";

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? siteContent.settings.whatsappNumber;

export const brand = siteContent.brand;
export const settings = siteContent.settings;

/**
 * Every WhatsApp deep link carries context, so the conversation starts with the
 * property already named rather than "hi". DPR §6.2
 */
export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const waMessage = {
  general: () => "Hi StaySutra, I'd like help planning a ride.",
  property: (name: string, destination: string, slug: string) =>
    `Hi StaySutra, I'm interested in ${name} in ${destination}. Ref: ${SITE_URL}/stays/${slug}`,
  destination: (name: string) =>
    `Hi StaySutra, I'm looking for a rider-friendly stay in ${name}.`,
  owner: () => "Hi StaySutra, I'd like to list my property.",
} as const;

export function canonical(path = "/"): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
