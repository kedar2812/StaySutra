import type { Metadata } from "next";
import { canonical, brand, settings, SITE_URL } from "./site";
import type { Destination, PropertyView, Story } from "./types";

/**
 * Metadata templates per page type. Phase 2 layers per-page overrides from the
 * dashboard on top of these — the shape does not change. DPR §8.1
 */

const TITLE_SUFFIX = `${brand.name}`;

export function pageMeta({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = canonical(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      url,
      title: `${title} · ${TITLE_SUFFIX}`,
      description,
      siteName: brand.name,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${TITLE_SUFFIX}`,
      description,
    },
  };
}

/* — JSON-LD. Typed helpers so content added in Phase 2 emits correct schema
     without anyone touching a template. DPR §8.3 ————————————————— */

type Json = Record<string, unknown>;

export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: SITE_URL,
    description: brand.positioning,
    email: settings.email,
    telephone: settings.phone,
    sameAs: [settings.instagram],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Pune",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/stays?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function lodgingSchema(p: PropertyView): Json {
  const schema: Json = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: p.name,
    description: p.tagline,
    url: canonical(`/stays/${p.slug}`),
    address: {
      "@type": "PostalAddress",
      addressLocality: p.locality || p.city,
      addressRegion: p.state,
      addressCountry: "IN",
    },
    amenityFeature: [...p.amenities, ...p.facilities].map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: true,
    })),
    numberOfRooms: p.bedrooms,
    petsAllowed: p.amenities.some((a) => a.slug === "pet-friendly"),
  };

  if (p.startingPrice !== null) {
    schema.priceRange = `From ₹${p.startingPrice}`;
  }

  // aggregateRating is emitted only when a real rating exists. DPR §8.3
  if (p.ratingValue !== null && p.ratingCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.ratingValue,
      reviewCount: p.ratingCount,
    };
  }

  return schema;
}

export function destinationSchema(d: Destination): Json {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: d.name,
    description: d.shortIntro,
    url: canonical(`/destinations/${d.slug}`),
    address: {
      "@type": "PostalAddress",
      addressRegion: d.state,
      addressCountry: "IN",
    },
  };
}

export function articleSchema(s: Story): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: s.title,
    description: s.excerpt,
    url: canonical(`/stories/${s.slug}`),
    datePublished: s.publishedAt,
    author: { "@type": "Organization", name: s.authorName },
    publisher: { "@type": "Organization", name: brand.name },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}
