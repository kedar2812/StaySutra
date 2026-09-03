import localFont from "next/font/local";

/**
 * Self-hosted — no Google Fonts CDN request, for privacy and for LCP.
 * Only the display weight is preloaded; body weights swap in. DPR §4.3, §8.4
 */

export const montserrat = localFont({
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
  src: [
    { path: "./fonts/Montserrat-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Montserrat-800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/Montserrat-900.woff2", weight: "900", style: "normal" },
  ],
});

/**
 * The wordmark only. StaySutra's actual mark (instagram.com/staysutra.in) is set
 * in a classical inscriptional serif, not in the UI display face — so the lockup
 * gets its own face and nothing else on the site uses it.
 */
export const cinzel = localFont({
  variable: "--font-cinzel",
  display: "swap",
  preload: true,
  src: [{ path: "./fonts/Cinzel-600.woff2", weight: "600", style: "normal" }],
});

export const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/Inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Inter-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Inter-600.woff2", weight: "600", style: "normal" },
  ],
});
