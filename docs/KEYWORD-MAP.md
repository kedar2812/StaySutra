# Keyword map

Primary and secondary keywords per page type, the search intent behind them, and
the title and description **actually shipped** in the build. Required by DPR §8.1.

Titles are rendered through the template in `lib/seo.ts` — the `title` column is
what `generateMetadata` returns, and Next appends ` · StaySutra`. Keep titles
under ~60 characters including the suffix, descriptions under ~155.

**Scope note (DPR §8.7):** this is a one-time technical foundation. It makes the
site fully crawlable, indexable and correctly understood. It does not guarantee
rankings — those come from content, links, reviews and time.

---

## Money pages

| URL | Primary keyword | Secondary | Intent | Title shipped | Description shipped |
|---|---|---|---|---|---|
| `/` | rider friendly stays india | motorcycle friendly hotels, biker stays maharashtra | Navigational + broad commercial | Rider-friendly stays across the Sahyadris and the Konkan | Handpicked stays chosen for covered bike parking, late check-in and hosts who ride. Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa. |
| `/rider-friendly-stays` | rider friendly stays | bike parking hotels, motorcycle friendly accommodation | Commercial, high intent — **this is the page the brand argument lives on** | Rider-friendly stays | Covered bike parking, late check-in, a wash-down tap, tools on site and hosts who ride. What rider-friendly actually means, and every StaySutra property that earns it. |
| `/stays` | villas farmhouses maharashtra | weekend stays near pune, group stays lonavala | Commercial, browsing | Explore stays | Every StaySutra property, filterable by destination, type, group size, price and rider facilities. Covered bike parking, late check-in, hosts who ride. |
| `/list-your-property` | list property with staysutra | property management villas, list farmhouse for rent | Commercial, owner side | List your property | Turn your villa, farmhouse or resort into a professionally managed stay. Photography, marketing, revenue management and end-to-end guest communication. |

`/rider-friendly-stays` gets its own keyword target and the most design attention
of any listing page, per DPR §7.4. It is the only page on the site that competes
on a term nobody else is really serving.

---

## Destination pages — `/destinations/[slug]`

Template: **"Rider-friendly stays in {name}"**, description
**"{shortIntro} Stays, road notes and the best season to ride {name}, {state}."**

| URL | Primary keyword | Secondary | Intent |
|---|---|---|---|
| `/destinations/lonavala` | stays in lonavala | villas in lonavala, lonavala bike trip stay, khandala ghat ride | Commercial, high volume |
| `/destinations/karjat` | stays in karjat | karjat farmhouse, karjat river resort, karjat trek stay | Commercial |
| `/destinations/alibaug` | stays in alibaug | alibaug villa, kihim beach stay, kashid coast road | Commercial |
| `/destinations/pune` | stays near pune | mulshi stay, tamhini ghat ride, pune weekend getaway | Commercial |
| `/destinations/mumbai` | stays near mumbai | panvel stay, mumbai goa ride start, secure bike parking mumbai | Commercial, narrow |
| `/destinations/goa` | stays in goa off the beach | ponda villa, konkan coast road ride, mumbai to goa by road | Commercial, competitive |

**Why the destination template leads on road character:** on every one of these
terms StaySutra is competing with OTAs that have vastly more domain authority.
The differentiator is the ride note, the road note and the season note — content
nobody else on page one publishes. That content is the reason to rank, not a
decoration on it.

`/destinations` (the index) targets **motorcycle destinations maharashtra**,
secondary **weekend rides from pune, weekend rides from mumbai**.

---

## Category pages — `/stays?category=[slug]`

These are **filtered views**, and they canonicalise to `/stays` (DPR §8.1) so a
hundred filter combinations do not become a hundred indexed pages. They exist for
users, not for search.

If the client later wants these to rank in their own right, the fix is a real
route per category (`/stays/villas`) with its own copy and its own canonical —
quoted separately. Do **not** simply remove the canonical: that is how index
bloat starts.

| Filter | Would-be primary keyword | Note |
|---|---|---|
| `?category=villas` | villas for rent maharashtra | High volume, very competitive |
| `?category=farmhouses` | farmhouse on rent near pune | Strong local intent |
| `?category=resorts` | resorts near mumbai | Dominated by OTAs |
| `?category=highway-stays` | highway hotels mumbai pune | **Genuinely under-served — best candidate for promotion to a real route** |
| `?category=homestays` | homestay maharashtra | Moderate |
| `?category=mountain-stays` | hill station stay maharashtra | Seasonal |

---

## Stories — `/stories/[slug]`

Informational intent. These exist to earn links and to answer the questions a
rider asks *before* they start looking for a stay, then hand them to the listing.
Every article carries `Article` + `BreadcrumbList` JSON-LD and links to at least
one destination and one property.

| URL | Primary keyword | Intent |
|---|---|---|
| `/stories/the-old-road-over-khandala` | old mumbai pune highway bike ride | Informational |
| `/stories/what-rider-friendly-actually-means` | what is a rider friendly stay | Informational → commercial |
| `/stories/coast-road-to-kashid` | alibaug to kashid coast road | Informational |
| `/stories/riding-the-sahyadris-in-july` | monsoon bike ride maharashtra tips | Informational, seasonal |
| `/stories/two-days-to-goa-the-slow-way` | mumbai to goa coastal road bike | Informational, high volume |

`/stories` (the index) targets **motorcycle route guides india**.

---

## Supporting pages

| URL | Primary keyword | Intent | Title shipped |
|---|---|---|---|
| `/for-riders` | staysutra rider community | Brand, informational | For riders |
| `/about` | about staysutra | Brand, navigational | About StaySutra |
| `/contact` | staysutra contact | Navigational | Contact |
| `/privacy` | — | Trust signal, not a target | Privacy policy |
| `/terms` | — | Trust signal, not a target | Terms of use |

---

## Structured data shipped (DPR §8.3)

| Schema | Where | Generated by |
|---|---|---|
| `Organization` | Root layout, every page | `organizationSchema()` |
| `WebSite` + `SearchAction` | Root layout | `websiteSchema()` |
| `LodgingBusiness` | Every property page | `lodgingSchema()` |
| `TouristDestination` | Every destination page | `destinationSchema()` |
| `Article` | Every story | `articleSchema()` |
| `BreadcrumbList` | Every nested page | `breadcrumbSchema()` |

All in `lib/seo.ts`, so a property added from the dashboard emits correct schema
with nobody touching a template.

**`aggregateRating` is emitted only when a real rating exists** — see
`lodgingSchema()`. Marking up a rating that is not displayed, or not real, is a
manual-action risk and is prohibited by DPR §4.6.

`FAQPage` is not shipped: there is no genuine FAQ content yet. Add the content
first, then the markup.

---

## Internal linking

Every property is within three clicks of the homepage:

```
Home → Featured Stays → Property
Home → Destinations → Destination → Property
Home → Explore by Category → /stays?category= → Property
```

And the path back out of every property: Property → Destination → Related stays
→ Stories → Listings. Stories link to destinations and to properties, so
informational traffic has somewhere commercial to go.

---

## To verify before handover (DPR §8.2)

- [ ] Search Console property created on the **client's** Google account, verified by DNS TXT
- [ ] `sitemap.xml` submitted, coverage confirmed clean
- [ ] `robots.txt` correct on production, and confirmed **disallow-all on staging**
- [ ] Rich Results Test run against one property, one destination and one story — screenshots in the handover pack
- [ ] `noindex` confirmed absent from production
- [ ] Every URL in this file returns 200
- [ ] GA4 verified live on the client's account, all eight §8.5 events firing
