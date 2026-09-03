import type { MetadataRoute } from "next";
import { destinations, properties, stories } from "@/lib/content";
import { canonical } from "@/lib/site";

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

/**
 * Generated from content, so anything added in Phase 2 appears here with no
 * code change. Drafts and unpublished records are excluded upstream in
 * lib/content — nothing unpublished can reach this list. DPR §8.2
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: { path: string; priority: number; freq: Freq }[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/stays", priority: 0.9, freq: "daily" },
    { path: "/rider-friendly-stays", priority: 0.9, freq: "weekly" },
    { path: "/destinations", priority: 0.8, freq: "weekly" },
    { path: "/stories", priority: 0.7, freq: "weekly" },
    { path: "/list-your-property", priority: 0.8, freq: "monthly" },
    { path: "/for-riders", priority: 0.6, freq: "monthly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
    { path: "/contact", priority: 0.5, freq: "monthly" },
    { path: "/privacy", priority: 0.2, freq: "yearly" },
    { path: "/terms", priority: 0.2, freq: "yearly" },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: canonical(r.path),
      lastModified: now,
      changeFrequency: r.freq,
      priority: r.priority,
    })),
    ...properties.map((p) => ({
      url: canonical(`/stays/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...destinations.map((d) => ({
      url: canonical(`/destinations/${d.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...stories.map((s) => ({
      url: canonical(`/stories/${s.slug}`),
      lastModified: new Date(s.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
