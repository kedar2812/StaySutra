import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { cinzel, inter, montserrat } from "./fonts";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { JsonLd } from "@/components/site/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo";
import { brand, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${brand.name} — Rider-friendly stays across the Sahyadris and the Konkan`,
    template: `%s · ${brand.name}`,
  },
  description: brand.positioning,
  applicationName: brand.name,
  authors: [{ name: brand.name }],
  formatDetection: { telephone: true, address: false, email: false },
  openGraph: { siteName: brand.name, locale: "en_IN", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#070E1A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const GA4 = process.env.NEXT_PUBLIC_GA4_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${montserrat.variable} ${inter.variable} ${cinzel.variable}`}>
      <body>
        {/*
          Motion serialises its `initial` styles into the SSR HTML, so without
          JavaScript every revealed section would render at opacity 0. Core
          content stays readable instead. DPR §12
        */}
        <noscript>
          <style>{`[data-motion]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <SmoothScroll />
        {children}
        {/* Film grain sits above everything and receives no pointer events. */}
        <div className="grain-fixed" aria-hidden />

        <JsonLd data={[organizationSchema(), websiteSchema()]} />

        {GA4 && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
