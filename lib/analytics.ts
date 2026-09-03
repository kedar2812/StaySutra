/**
 * GA4 events. The parameter sets exist to answer one question the client will
 * actually ask: which destination and which property produce enquiries.
 * DPR §8.5
 */

export type AnalyticsEvent =
  | "enquiry_submit"
  | "whatsapp_click"
  | "property_view"
  | "filter_apply"
  | "owner_submission_start"
  | "owner_submission_complete"
  | "search_submit"
  | "story_read";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}
