import type { MetadataRoute } from "next";
import { canonical, SITE_URL } from "@/lib/site";

/** DPR §8.2, §3.3 */
export default function robots(): MetadataRoute.Robots {
  /*
   * Staging must never be indexed — an indexed duplicate of the site is a
   * duplicate-content problem that takes weeks to unwind. Anything that is not
   * unambiguously the production host is disallowed outright.
   */
  const isProduction =
    Boolean(process.env.NEXT_PUBLIC_SITE_URL) &&
    !SITE_URL.includes("staging.") &&
    !SITE_URL.includes("localhost") &&
    !SITE_URL.includes("127.0.0.1");

  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/dashboard/", "/api/", "/uploads/"],
      },
    ],
    sitemap: canonical("/sitemap.xml"),
    host: SITE_URL,
  };
}
