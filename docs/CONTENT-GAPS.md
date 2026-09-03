# Content gaps

Everything on this site that is **not** the client's own final content, and what
is needed to close it. Required by DPR §0 rule 2: where real content is missing,
the empty state ships and the gap is logged here rather than invented.

Nothing in this file blocks the build. Several items block **launch**.

Last updated: 3 September 2026 · Kedar Gurav

---

## Blocks launch

### 1. Property photography — all 9 listings

**Status:** no client photography received.
**Currently rendering:** a generated brand plate (`lib/plate.ts`) — a deterministic
duotone navy/gold landscape drawn as inline SVG. It is honest (nothing pretends
to be a photograph of a real property), consistent across mixed sources, costs no
network request, and is replaced automatically the moment a real `Media` row
exists — `components/primitives/Frame.tsx` prefers real media whenever it is
present.
**Needed:** per DPR §4.7 — hero 2400×1350 (16:9), cards 1200×900 (4:3), gallery
2000×1333, destination tiles 1200×1600 (3:4), story covers 1600×900. Alt text is
mandatory at upload.
**Why it blocks launch:** the properties are meant to be the loudest thing on the
page. Generated plates are a correct placeholder, not a substitute.

### 2. Property details — all 9 listings are developer-drafted

**Status:** every record in `content/properties.json` carries `"placeholder": true`.
**Currently rendering:** plausible, internally consistent listings written to
exercise every field and every edge case — including one property with no rider
facilities (`sea-line-resort-alibaug`), one with the shortest viable description,
and a spread of image counts from 4 to 9.
**Needed:** real property names, real addresses, real capacity, real rates, real
rider facilities, and confirmation of what each host actually offers. The eight
rider-facility answers in particular must come from the host, not from us — a
wrong "yes" on covered parking is the one failure this brand cannot absorb.
**Note:** `startingPrice` values currently in the seed are illustrative. Do not
publish them.

### 3. Ratings and review counts — deliberately absent everywhere

**Status:** `ratingValue` and `ratingCount` are `null` on every record, in the
JSON seed and in `prisma/seed.ts`.
**Currently rendering:** nothing. The rating element does not render at all — no
"0.0", no placeholder stars, no `aggregateRating` in the JSON-LD.
**Needed:** nothing, until real reviews exist. The review section on the property
page (`app/(site)/stays/[slug]/page.tsx` item 13) is built and hidden, and
appears on its own the moment a real value is set.
**Do not** ask for these to be filled in to make the page look busier. DPR §4.6
and §19 item 4 both prohibit it.

### 4. Privacy Policy and Terms — need the client's legal review

**Status:** both pages written and live, at `/privacy` and `/terms`.
**Currently rendering:** full text describing what this build actually does with
personal data — which forms collect what, where uploaded documents are stored,
which third parties are involved, retention, and how to request deletion. It is
accurate as of this build and lawful to launch behind, but it is developer-drafted.
**Needed:** the client's own review, and their decision on retention periods.
Search Console trust signals and the contact data collected through the forms
both depend on Privacy being present and correct.

### 5. Logo asset — the badge mark

**Status:** the type lockup is built (`components/site/Wordmark.tsx`), matched to
StaySutra's own mark: an inscriptional serif (Cinzel), STAY in white, SUTRA in
gold, over a wide-tracked "WHERE STAYS MEET STORIES" line. Verified against
instagram.com/staysutra.in on 3 September 2026.
**Not available:** the circular badge logo — rider, ghat road, cabin, mountains
and compass rose. Only a 150×150 raster is publicly reachable, which is far too
small to use.
**Needed:** the original vector (SVG or AI/EPS). Once supplied it becomes the
favicon, the compact header mark on mobile, the OG image mark, and the branded
fallback watermark. `Monogram` in `Wordmark.tsx` stands in for it meanwhile.
**Also needed:** confirmation of which lockup is primary. Both are in active use
on their Instagram — the badge reads **RIDE. STAY. REPEAT.** while the post
watermark reads **Where Stays Meet Stories**. This build uses the latter as the
lockup and the former in the final CTA. Confirm or correct.

---

## Blocks a specific page or feature

### 6. Homepage statistics block — decision required (DPR §7.2 ⑧)

The reference mock showed **1000+ stays / 25K+ riders / 50+ destinations / 4.8★**
and labelled two of them "Target stays" and "Target rating" in the mock itself.

**Shipped:** DPR default option (b), an honest reframe. The block now shows one
number computed live from the database — the destination count — with the line
"destinations live at launch, across Maharashtra and Goa." No target is presented
as an achievement.

**Client decides:** (a) real verified numbers, (b) keep the honest reframe as
shipped, or (c) replace with two named owner quotes. Option (c) needs two owners
willing to be quoted by name.

### 7. Footer links with no page — resolved by omission (DPR §7.1)

The reference footer linked **Careers**, **Resources**, **Partner Program** and
**Owner Login**. None of these exist in this contract, and Owner Login is not
built at all.

**Shipped:** they are omitted rather than faked. The footer now has three real
columns (Company, Stay, For owners) plus a Destinations list generated from the
database. Every link resolves.

**Client confirms:** either that omitting them is correct, or supplies the pages.
Dead-end links are a trust and SEO problem, which is why they are not shipped
pointing nowhere.

### 8. About page — brand story is developer-drafted

**Status:** `content/site.json` → `about`, plus the prose in
`app/(site)/about/page.tsx`.
**Currently rendering:** a story built from StaySutra's own positioning and the
eight-question rider checklist. It is true to the brand and reads as intended,
but the founding story is ours, not theirs.
**Needed:** the client's own account of why StaySutra exists, and a team block if
they want one.

### 9. Destination copy — developer-drafted, factually researched

**Status:** all six records in `content/destinations.json` carry
`"placeholder": true`.
**Currently rendering:** real geography, real road notes, real seasonal advice
for Lonavala, Karjat, Alibaug, Pune, Mumbai and Goa. The facts are accurate; the
voice is ours.
**Needed:** the client's review, and their own imagery per DPR §16.

### 10. Stories — five articles, developer-written

**Status:** all five in `content/stories.json` carry `"placeholder": true`;
bodies live in `content/stories/*.md`.
**Currently rendering:** genuinely useful road notes (the old Khandala road, the
Kashid coast road, monsoon riding, the Konkan route to Goa) plus one brand piece
explaining what rider-friendly means.
**Needed:** the client's decision — keep them as StaySutra's own content, rewrite
in their voice, or replace. They are written to be publishable as-is if the
client is happy to own them.

### 11. Newsletter field — omitted

DPR §7.1 says the newsletter field ships only if the client confirms a mailing
tool. None confirmed, so it is not built. Say the word and it takes an hour.

---

## Waiting on infrastructure, not content

These are wired to the point the environment allows and finish in their own work
packages. Listed so nothing looks finished that is not.

| Item | State now | Finishes in |
|---|---|---|
| `DATABASE_URL` / Postgres | Site reads `/content` through `lib/content.ts`; schema and seed are complete and ready to run | P1-02, once the VPS exists |
| Enquiry persistence | `POST /api/enquiry` validates, rate-limits, checks honeypot and fill time, and appends to a JSON-lines write-ahead log so nothing a visitor sends is lost. Replayed into `Enquiry` once the DB is up | P1-11 |
| Cloudflare Turnstile | Env vars declared; honeypot + 3-second timing check + IP/phone rate limiting are live | P1-11 |
| Notification email (Resend) | Not sending. Needs a verified sending domain with SPF and DKIM | P1-11 |
| Owner-submission uploads | `POST /api/owner-submission` validates, sniffs MIME against a whitelist, caps sizes, writes with randomised keys under `UPLOAD_DIR` outside the web root, documents in their own subtree | P1-12 |
| sharp re-encode | Not running. Required to strip EXIF and any embedded payload | P1-12 |
| GA4 | Loads only when `NEXT_PUBLIC_GA4_ID` is set. All eight §8.5 events are wired at their call sites | P1-14, on the client's Google account |
| Search Console | Needs DNS TXT verification on the client's account | P1-14 |
| Dynamic OG images | Static metadata is correct on every route; `next/og` route pending the logo vector (item 5) | P1-14 |

---

## How to close a gap

1. Drop the real content into `content/*.json` (or the dashboard, from Phase 2).
2. Remove that record's `"placeholder": true`.
3. Delete its row from this file.

The site needs no code change for any of it.
