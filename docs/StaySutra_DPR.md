# StaySutra — Detailed Project Report

**Website + Custom Dashboard + One-time Technical SEO**
Plan B — Launch + Cover (₹35,000) · Accepted

| | |
|---|---|
| **Client** | StaySutra — Rider-Focused Stays & Travel |
| **Prepared by** | Kedar Gurav, Web Developer, Pune |
| **Document** | DPR v1.0 |
| **Date** | 03 September 2026 |
| **Supersedes** | StaySutra Website & Dashboard Proposal, 01 September 2026 |
| **Delivery window** | 3–4 weeks from advance payment |

---

## 0. How to use this document

This DPR is the single source of truth for the build. It is written to be handed directly to an AI coding agent (Claude Code) as well as read by the client.

**Rules for the implementing agent:**

1. **Nothing outside this document gets built.** If a requirement is missing or ambiguous, stop and ask. Do not invent features, pages, or copy.
2. **Do not invent content.** No lorem ipsum, no placeholder statistics, no fabricated reviews, no made-up property names beyond the agreed seed set. Where real content is missing, render the empty state defined in §12 and log it in `CONTENT-GAPS.md`.
3. **Phase 1 and Phase 2 share one database and one schema.** The schema in §5 is built in full during Phase 1 even though most admin screens arrive in Phase 2. Phase 2 must be additive — no migrations that drop or rename Phase 1 columns.
4. **Every section of §7 and §10 has an acceptance checklist.** A work package is not done until every box in its checklist passes on a real device.
5. **Design rules in §4 are hard constraints, not suggestions.** The anti-pattern list in §4.6 is a rejection list — anything on it fails review.
6. **Commit per work package** using `feat(scope):` / `fix(scope):` / `chore(scope):`. One work package = one PR into `develop`.
7. **Screenshots in `/design-reference/` are directional, not final.** They came from an AI mock and carry AI-generated design tells. §4.6 lists exactly what to keep and what to replace.

---

## 1. Project summary

StaySutra is a hospitality brand built for motorcycle riders — routes, ghat roads, bonfires, secure bike parking, and the stories that come out of a weekend trip. It is not a hotel chain and must not look like one.

**What is being delivered:**

| # | Deliverable | Phase |
|---|---|---|
| 1 | Custom marketing + listing website, fully responsive | Phase 1 |
| 2 | One-time technical SEO foundation | Phase 1 |
| 3 | Custom admin dashboard / CMS with enquiry CRM | Phase 2 |
| 4 | Server setup, deployment, full ownership handover | Phase 2 |
| 5 | Recorded training walkthrough + written handover doc | Phase 2 |
| 6 | 2 months post-handover support (Plan B) | Post-launch |

**Explicitly NOT in this contract** (quoted separately if wanted later, referred to throughout as **Future Phase**):

- Online booking engine, availability calendar UI, payment gateway
- Rider Passport, route directory, motorcycle trips, rider accounts, community feed, user-submitted reviews
- Photography, videography, stock image licensing
- Content writing / copywriting beyond structural microcopy
- Ongoing SEO, ads, social media management

> **Terminology warning:** the original proposal called the booking engine "Phase 2." In this DPR, **Phase 2 = the dashboard**. The booking engine is the **Future Phase** and is out of scope. The database is still designed to accept it without a rewrite (§5.9).

### 1.1 Commercial terms (for reference)

- Plan B — Launch + Cover: **₹35,000**, 50% on start, 50% on completion and handover.
- No GST — not registered under Section 22 of the CGST Act, 2017.
- Two rounds of design revisions per page during the build. Post-sign-off changes quoted separately.
- Server: Hostinger KVM 2 VPS (2 vCPU, 8 GB RAM, 100 GB NVMe, Mumbai), ~₹22,000 incl. tax on the 24-month term, **bought on the client's own Hostinger account.**
- Domain: already owned by the client.
- Support: 2 months from handover — bug fixes, small changes, priority WhatsApp response, two Search Console health checks, one refresher training call.
- Optional after that: ₹4,999/month retainer, cancel any time, or ad-hoc per request. Neither is required for the site to keep running.

---

## 2. Phase map

### Phase 1 — Website + SEO (Weeks 1 to ~2.5)

Everything the public sees, plus the technical SEO foundation. Content is loaded from the production database via a seed script maintained by the developer during this phase. **The site is fully live and correct before a single admin screen exists.**

**Exit criteria:** public site live on the client's domain, all pages responsive, Lighthouse targets met (§9.6), Search Console verified and sitemap submitted, enquiry emails and WhatsApp handoff working end to end.

### Phase 2 — Dashboard / CRM (Weeks ~2.5 to 4)

The private admin panel that replaces the seed script. Property management, enquiry CRM, owner submission review workflow, stories editor, site content control, media library, accounts and roles.

**Exit criteria:** client's team can add a property, publish a story, add a destination, process an enquiry, and approve an owner submission end to end without developer involvement. Training call recorded. Repo, credentials and env vars transferred.

### Why this order

The website is what earns the client money and what they are judged on. Building it first means the site can go live even if dashboard scope moves, and it means every dashboard screen in Phase 2 is built against real content that already exists rather than against assumptions.

---

## 3. Technical architecture

### 3.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15**, App Router, React 19, TypeScript strict | Server Components by default; `"use client"` only where interaction requires it |
| Styling | **Tailwind CSS v4** + CSS custom properties for design tokens | Tokens in §4.2 are the only source of colour/spacing values. No arbitrary hex in components. |
| Animation | **Motion** (`motion/react`) for springs and layout, **Lenis** for smooth scroll, **GSAP + ScrollTrigger** for scroll-linked timelines only | See §4.5 for the motion contract |
| Database | **PostgreSQL 16** | Single instance on the VPS |
| ORM | **Prisma 6** | Migrations committed; `prisma migrate deploy` in the deploy step |
| Auth (Phase 2) | **Auth.js v5** credentials provider + Argon2id password hashing | Sessions in DB, httpOnly secure cookies, 7-day rolling |
| Validation | **Zod** on every server action and API route; `react-hook-form` on the client | One schema shared by client and server — never validate twice with two definitions |
| Images | `next/image` + **sharp**, originals on disk, derivatives cached | AVIF then WebP then JPEG fallback |
| Email | **Resend** (or Brevo SMTP if the client prefers) with a verified sending domain | SPF + DKIM configured at DNS |
| Spam | Honeypot field + timing check + **Cloudflare Turnstile** on all public forms | |
| Rich text | **Tiptap** (Phase 2, Stories editor) storing sanitised HTML + a plain-text excerpt | |
| Rate limiting | In-process token bucket backed by Postgres for form endpoints | |
| Hosting | Hostinger KVM 2 VPS, Ubuntu 24.04 LTS | |
| Process | **Docker Compose**: `app` (Next standalone) + `db` (Postgres) + `caddy` (TLS + reverse proxy) | Caddy for automatic HTTPS renewal so the client never has to think about certificates |
| Backups | Nightly `pg_dump` + uploads tarball, 14-day rotation on-disk, weekly copy to the client's Google Drive | |
| Analytics | GA4 + Google Search Console, both on the client's own Google account | |

**Justification for a single VPS:** site, dashboard, database and images all sit on one server. No separate database bill, no object storage bill, no vendor lock-in, and the client can hand the whole thing to another developer as one box. 8 GB RAM handles 50+ properties and this traffic profile comfortably.

### 3.2 Repository structure

```
staysutra/
├─ app/
│  ├─ (site)/                     # Phase 1 — public site
│  │  ├─ page.tsx                 # Home
│  │  ├─ stays/                   # Explore Stays + [slug]
│  │  ├─ rider-friendly-stays/
│  │  ├─ destinations/            # index + [slug]
│  │  ├─ for-riders/
│  │  ├─ list-your-property/
│  │  ├─ stories/                 # index + [slug]
│  │  ├─ about/  contact/
│  │  └─ (legal)/privacy/ terms/
│  ├─ (admin)/dashboard/          # Phase 2 — everything behind auth
│  ├─ api/                        # webhooks, uploads, og images
│  ├─ sitemap.ts  robots.ts  not-found.tsx
├─ components/
│  ├─ primitives/                 # Button, Field, Sheet, Dialog, Chip, Rule
│  ├─ site/                       # public composite sections
│  ├─ admin/                      # dashboard composites
│  └─ motion/                     # Reveal, Parallax, SpringLink, PageTransition
├─ lib/                           # db, auth, seo, mail, whatsapp, validation, utils
├─ prisma/                        # schema.prisma, migrations/, seed.ts
├─ content/                       # seed JSON for Phase 1 content
├─ design-reference/              # client mock screenshots (not shipped)
├─ public/                        # icons, fonts, static
├─ docs/                          # HANDOVER.md, CONTENT-GAPS.md, KEYWORD-MAP.md
└─ docker-compose.yml  Caddyfile  .env.example
```

### 3.3 Environments

| Env | Purpose | URL |
|---|---|---|
| Local | Development | `localhost:3000` |
| Staging | Client review, password-protected, `noindex` | `staging.<domain>` |
| Production | Live | `<domain>` |

Staging must send `X-Robots-Tag: noindex, nofollow` and sit behind HTTP basic auth. This is non-negotiable — an indexed staging copy is a duplicate-content problem that takes weeks to unwind.

### 3.4 Environment variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
UPLOAD_DIR=/var/staysutra/uploads
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
RESEND_API_KEY=
ENQUIRY_NOTIFY_EMAIL=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_GA4_ID=
```

Every value handed over at close in a written credentials document. Nothing hardcoded, nothing committed.

---

## 4. Design system

The mock screenshots in `/design-reference/` set the **direction**: dark navy, gold accents, bold uppercase display type, full-bleed cinematic imagery, rider-first language. They do **not** set the standard. What follows is the standard.

### 4.1 Design intent

One sentence to design against: **a rider's road film, not a booking portal.**

The emotion is *anticipation* — the night before a ride. Confident, dark, warm, a little cinematic. Every decision either serves that or gets cut.

Concretely that means: photography given room to breathe, type large enough to feel printed, gold used like a highlighter and never like paint, motion that feels physical rather than decorative, and enough restraint that the properties are the loudest thing on the page.

### 4.2 Colour tokens

Defined once in `app/globals.css` as CSS custom properties. **No component may use a raw hex value.**

```css
:root {
  /* Base — cool navy, not black */
  --ink-900:  #070E1A;   /* page background, deepest */
  --ink-800:  #0A1628;   /* default section background */
  --ink-700:  #0E1E33;   /* raised surface / card */
  --ink-600:  #13263D;   /* elevated surface / hover */
  --ink-500:  #1B3251;   /* borders on solid surfaces */

  /* Gold — the single accent */
  --gold-400: #F2C75C;   /* hover / highlight */
  --gold-500: #E9B93C;   /* primary accent, CTAs, active states */
  --gold-600: #C99A2E;   /* pressed */
  --gold-ink: #1A1204;   /* text on gold — never pure black */

  /* Text */
  --text-hi:  #FFFFFF;
  --text-mid: #C3CEDC;   /* body on dark */
  --text-low: #8395AB;   /* captions, meta */
  --text-dim: #5D6E84;   /* disabled */

  /* Lines & materials */
  --hairline:      rgba(255,255,255,0.09);
  --hairline-str:  rgba(255,255,255,0.16);
  --glass-bg:      rgba(12,26,45,0.55);
  --glass-edge:    rgba(255,255,255,0.16);   /* top edge highlight */
  --glass-blur:    24px;
  --glass-sat:     165%;

  /* Semantic — dashboard only */
  --ok:    #3FBF87;
  --warn:  #E0A63A;
  --err:   #E2685F;
  --info:  #5B9BD5;
}
```

**Gold discipline:** gold appears on a maximum of **three elements per viewport**. Primary CTA, one active/label state, one data highlight. If a fourth wants gold, one of the three is wrong. This single rule is most of what separates the built site from the mock.

**Light mode:** not built. The brand is dark. The dashboard is dark too, tuned for legibility (§10.2).

### 4.3 Typography

Same faces as the proposal document. Self-hosted with `next/font/local` — **no Google Fonts CDN request**, for both privacy and LCP.

- **Montserrat** — display and headings. Weights 700, 800, 900. Uppercase for display.
- **Inter** — body, UI, dashboard. Weights 400, 500, 600. `font-optical-sizing: auto`.

Tracking is size-specific. A single global `letter-spacing` is wrong somewhere by definition.

| Role | Face / weight | Size (mobile → desktop) | Line-height | Tracking |
|---|---|---|---|---|
| Display XL (hero) | Montserrat 900, uppercase | `clamp(2.75rem, 9vw, 6.5rem)` | 0.92 | `-0.03em` |
| Display L (section) | Montserrat 800, uppercase | `clamp(2rem, 5vw, 3.5rem)` | 1.0 | `-0.02em` |
| Heading M | Montserrat 700 | `clamp(1.25rem, 2.4vw, 1.75rem)` | 1.15 | `-0.01em` |
| Overline / eyebrow | Inter 600, uppercase | `0.75rem` | 1.2 | `+0.18em` |
| Body L (lede) | Inter 400 | `clamp(1.0625rem, 1.4vw, 1.25rem)` | 1.6 | `0` |
| Body | Inter 400 | `1rem` | 1.65 | `0` |
| Caption / meta | Inter 500 | `0.8125rem` | 1.45 | `+0.01em` |
| Numeric / stats | Montserrat 800, `font-variant-numeric: tabular-nums` | contextual | 1.0 | `-0.02em` |

All spacing in `rem`/`em` so a user's larger text setting scales the layout instead of breaking it. Minimum body size on mobile is 16px — never shrink body copy to fit a layout; change the layout.

### 4.4 Materials, depth and glass

Liquid glass and frosted surfaces are approved — used as a **functional floating layer**, never as decoration.

**Where glass is allowed:**

1. Sticky site header — content scrolls *underneath* it, not around a solid bar.
2. The hero search widget.
3. Filter bar on Explore Stays (sticky on scroll), and the mobile filter sheet.
4. Floating WhatsApp button and the sticky Book/Enquire bar on the property page.
5. Dashboard top bar, command palette, modals and drawers.

**Glass recipe:**

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  border-top: 1px solid var(--glass-edge);   /* light catching the material's edge */
  border-bottom: 1px solid rgba(0,0,0,0.25);
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.55);
}
```

**Hard rules:**

- **Never stack glass on glass.** A glass modal on a glass header means one of them becomes solid.
- Bigger surface reads as thicker: a full-width sheet uses blur 32px and a deeper shadow; a small chip uses blur 12px and almost no shadow.
- Text on glass uses `--text-hi` at weight 500+, never a flat grey at 400 — vibrancy over a moving backdrop demands more contrast, not less.
- Colour goes on a solid layer behind the glass, never on the translucent foreground.
- Where a floating element overlaps scrolling content, use a **scroll-edge gradient mask** (a 24px fade), not a 1px divider.
- Glass *materialises*: on enter, animate `backdrop-filter` blur radius and `scale` together (0.96 → 1.0), so it reads as a real surface arriving rather than an opacity fade.
- Honour `prefers-reduced-transparency: reduce` — raise the background to near-solid and drop the blur entirely.

**Shadows** are contextual: heavier over busy photography for separation, lighter over flat navy. Two tokens only — `--shadow-card` and `--shadow-float`. No third.

### 4.5 Motion contract

Motion is designed with the visuals, not layered on after. The through-line: **an interface feels alive when motion starts from the current on-screen value, inherits the user's velocity, projects momentum forward, and can be grabbed and reversed at any instant.**

**Spring defaults (Motion `spring`):**

| Interaction | Bounce | Duration | Use |
|---|---|---|---|
| Default UI (menus, reveals, hovers, layout) | `0` (critically damped) | `0.35s` | Everything by default |
| Momentum interactions (flick, drag release, carousel throw) | `0.2` | `0.4s` | **Only** when a gesture carried momentum into it |
| Sheets / drawers | `0.2` | `0.3s` | Mobile filter sheet, gallery sheet |

Overshoot on something the user flicked feels right. Overshoot on a menu that just faded in feels wrong. Do not bounce by default.

**Non-negotiables:**

1. **Feedback on pointer-down, not on release.** `:active { transform: scale(0.97); transition: transform 100ms ease-out; }` on every button, card and chip. Waiting for `click` feels dead.
2. **No animation locks input.** Every transition is interruptible and reversible mid-flight.
3. **Always animate from the presentation (live) value**, never the target value — read the on-screen transform on interrupt, otherwise you get a visible jump.
4. **Drag tracks 1:1** with `setPointerCapture`, respecting the grab offset. Never snap to the element's centre on grab.
5. **Velocity handoff:** the release velocity of a gesture becomes the spring's initial velocity. This is the seam that separates "fluid" from "fine."
6. **Momentum projection** for snap targets — project where the flick is *going*, then snap to the nearest point to that projection:
   ```js
   const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
   const target = nearestSnap(current + project(releaseVelocity));
   ```
7. **Rubber-band at boundaries**, never hard-stop: `(overshoot * dim * 0.55) / (dim + 0.55 * |overshoot|)`.
8. **Spatial consistency:** what slides in from the right dismisses to the right. Popovers and sheets scale from their trigger's `transform-origin`, not from centre.
9. **Compositor properties only** — `transform` and `opacity`. `will-change` applied just before motion and removed after. No animating `top`, `height`, `filter` on scroll.
10. **Decompose 2D motion into independent X and Y springs.**

**Scroll system:**

- **Lenis** smooth scroll, `lerp: 0.09`, `duration: 1.1`. Disabled entirely under `prefers-reduced-motion`. Native scrollbars preserved.
- **Section reveal:** `translateY(28px) → 0` + `opacity 0 → 1`, spring bounce 0 / 0.4s, triggered at 15% viewport entry, `once: true`. **Applied at section and group level — not to every element.** Ten staggered reveals per screen is the single most common way a site announces it was generated rather than designed.
- **Stagger** children at 60ms, capped at 6 items. Beyond that, reveal as a block.
- **Parallax:** hero image and destination cards only. Maximum 8% travel. rAF-driven, transform-only.
- **Hero headline:** per-line mask reveal (`clip-path: inset(100% 0 0 0)` → `inset(0)`), 90ms line stagger, running *with* a background scale from 1.06 → 1.0 over 1.2s. One cinematic moment on the site. Not repeated elsewhere.
- **Sticky/pinned moments:** exactly two on the whole site — the "Made for the Road" pillars (pinned while pillars cross-fade) and the property page gallery (image column pins while details scroll). More than two makes the site feel like a scroll-jacking demo.
- **Page transitions:** View Transitions API where supported, with the property card image as the shared element into the property page. Graceful instant fallback elsewhere.

**Reduced motion / accessibility:** under `prefers-reduced-motion: reduce`, all slides, springs, parallax and pinning are replaced by 200ms opacity cross-fades; Lenis is off; the hero mask reveal becomes a static frame. Feedback is not removed — it is made non-vestibular.

### 4.6 Anti-slop rules — the rejection list

The reference screenshots were AI-generated and carry visible tells. Anything on this list fails review regardless of how good it looks in isolation.

**Banned outright:**

| ✗ Banned | ✓ Instead |
|---|---|
| Emoji as icons (🏍️ 🔥 ☕ in the mock's amenity chips and feature strip) | A custom 20-icon SVG set, 1.5px stroke, 24px grid, single weight |
| The four-stat grid with round invented numbers (1000+ / 25K+ / 50+ / 4.8★) | Either real verified numbers, or replace the block with three named property owners and one real line each |
| Identical rounded-rectangle cards in a uniform grid | Editorial mixed-scale grid — one lead card at 2× with the others stepping down |
| Everything centred | Asymmetric 12-column grid; display type flush-left, deliberate wide margins |
| Purple/blue gradient washes, glowing borders, neon accents | Flat navy fields, photography, one gold accent |
| Drop shadows on text over images | Real gradient scrims (`linear-gradient` to `--ink-900` at 85%) or a duotone treatment on the image |
| Three-icon three-column "feature" strips | Prose + one strong image, or a numbered editorial list |
| Section headline + subhead + 3 cards, repeated down the page | Vary section architecture — no two consecutive sections share a layout skeleton |
| Generic stock hero of a person on a bike at sunset | Client's own photography; if unavailable, a tighter crop with heavy duotone so it reads as brand, not stock |
| "Elevate your journey" style filler copy | Short, concrete, rider-specific lines. If real copy is missing, ship the empty state and log the gap. |
| Fake ratings and review counts (`4.8 (128)`) | Rating fields exist in the schema, render only when a real value is present |

**Required to feel designed rather than generated:**

- **Film grain** overlay at 3–4% opacity across dark sections, `mix-blend-mode: overlay`, tiled 128px PNG. Kills the flat digital gradient look immediately.
- **Duotone treatment** on secondary photography — navy shadow, warm highlight — so mixed-source images read as one brand. Featured property photos stay full-colour.
- **Hairline rules** at `--hairline`, used as an editorial device: above overlines, between list rows, along the grid.
- **Oversized type as image.** Let a display headline crop or overlap the photograph behind it. This is the single highest-leverage move on the whole site.
- **Deliberate empty space.** At least one section per page that does far less than it could.
- **Numbers set in tabular figures**, aligned on their decimals.
- **One idea per section.** If a section needs two headlines, it is two sections.

### 4.7 Iconography and imagery

- **Icons:** one set, drawn or curated (Lucide as a base, customised), 24px grid, 1.5px stroke, rounded caps, monochrome `currentColor`. Amenity, rider-facility and category icons all come from this set. No emoji. No mixed sets.
- **Imagery specs:** hero 2400×1350 (16:9), property cards 1200×900 (4:3), property gallery 2000×1333, destination tiles 1200×1600 (3:4), story covers 1600×900.
- Every image ships AVIF + WebP + fallback, `sizes` set correctly, `priority` only on the hero, everything else lazy.
- **Alt text is mandatory at upload** (§10.3) — the field cannot be skipped, and empty alt is only permitted with an explicit "decorative" checkbox.

### 4.8 Grid, spacing and responsive

- 12-column grid, max content width **1320px**, gutters 24px mobile / 40px tablet / 64px desktop.
- Spacing scale (4px base): `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160`. Section vertical rhythm: 96px mobile, 160px desktop.
- Breakpoints: `sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.
- Radii: `4` chips · `12` cards · `20` large surfaces · `999` pills. Never mix more than two radii in one component.
- **Mobile is the primary design target** — the client and most of the audience will see this on a phone first. Every layout is designed at 390px before it is designed at 1440px.
- Touch targets minimum 44×44px with 10px hit padding beyond the visual bounds.

---

## 5. Data model

Built in full during **Phase 1**. Phase 2 adds admin screens on top of it, not new foundations. Reserved tables are created but unused until the Future Phase — this is deliberate, so booking becomes an addition rather than a rebuild.

All tables: `id` (cuid), `createdAt`, `updatedAt`. Soft delete via `deletedAt` on Property, Story, Destination and Enquiry — nothing the client can click is ever hard-deleted.

### 5.1 Property

```prisma
model Property {
  id              String    @id @default(cuid())
  slug            String    @unique          // seo-safe, editable, immutable after publish without a redirect
  name            String
  tagline         String?                    // one line, shown on cards
  description      String   @db.Text         // rich text
  status          PropertyStatus             // DRAFT | PUBLISHED | UNPUBLISHED | ARCHIVED
  featured        Boolean   @default(false)  // homepage Featured Stays
  featureOrder    Int?

  categoryId      String                     // Villa, Farmhouse, Resort, Highway Stay, Homestay, Mountain Stay
  destinationId   String

  // Location
  addressLine     String?
  locality        String?
  city            String
  state           String
  latitude        Float?
  longitude       Float?
  mapEmbedNote    String?

  // Capacity
  maxGuests       Int
  bedrooms        Int
  bathrooms       Int
  beds            Int?
  checkInTime     String?                    // "14:00"
  checkOutTime    String?
  minNights       Int?      @default(1)

  // Pricing (display only in Phase 1/2 — no transactions)
  startingPrice   Int?                       // ₹ per night, integer paise-free
  priceNote       String?                    // "per night, 2 guests, weekdays"
  availability    AvailabilityStatus         // AVAILABLE | ON_REQUEST | SOLD_OUT

  // Rider positioning
  isRiderFriendly Boolean   @default(false)  // drives /rider-friendly-stays
  riderNote       String?                    // "Covered parking for 6 bikes, tools on site"

  // Ratings — render only when present. NEVER seed a fake value.
  ratingValue     Decimal?  @db.Decimal(2,1)
  ratingCount     Int?

  // SEO overrides
  metaTitle       String?
  metaDescription String?
  ogImageId       String?

  images          PropertyImage[]
  amenities       PropertyAmenity[]
  facilities      PropertyFacility[]
  experiences     PropertyExperience[]
  nearbyRoutes    NearbyRoute[]
  nearbyPlaces    NearbyPlace[]
  enquiries       Enquiry[]
  viewCount       Int       @default(0)      // simple counter for the dashboard snapshot
  deletedAt       DateTime?

  @@index([status, featured])
  @@index([destinationId, status])
  @@index([categoryId, status])
}
```

`PropertyImage`: `propertyId, mediaId, alt, caption?, sortOrder, isCover`.
`NearbyRoute`: `propertyId, title, distanceKm?, note?, sortOrder` — text only in this contract; links to the route directory in the Future Phase.
`NearbyPlace`: `propertyId, title, distanceKm?, type?, sortOrder`.

### 5.2 Taxonomies

```prisma
model Category    { id, slug @unique, name, description?, iconKey, sortOrder, isActive }
model Destination { id, slug @unique, name, state, shortIntro, description @db.Text,
                    heroMediaId?, tileMediaId?, latitude?, longitude?,
                    bestSeason?, rideNote?, metaTitle?, metaDescription?,
                    isFeatured, sortOrder, deletedAt? }
model Amenity     { id, slug @unique, name, iconKey, group, sortOrder, isActive }
model Facility    { id, slug @unique, name, iconKey, sortOrder, isActive }   // rider-friendly facilities
model Experience  { id, slug @unique, name, iconKey, description?, sortOrder, isActive }
```

Amenity / Facility / Experience are **managed lists** — the client adds to them from the dashboard, they are not free text on the property form. This is what keeps filters working and icons consistent two years from now.

Launch destinations: Mumbai, Lonavala, Karjat, Alibag, Pune, Goa. Adding a seventh from the dashboard must build its page with zero developer involvement.

### 5.3 Enquiry (the CRM core)

```prisma
model Enquiry {
  id           String   @id @default(cuid())
  refCode      String   @unique              // "SS-2609-0143" — quotable on WhatsApp
  source       EnquirySource                 // PROPERTY | DESTINATION | CONTACT | GENERAL | WHATSAPP_CLICK
  propertyId   String?
  destinationId String?

  name         String
  phone        String
  email        String?
  checkIn      DateTime?
  checkOut     DateTime?
  guests       Int?
  message      String?  @db.Text

  status       EnquiryStatus @default(NEW)   // NEW | CONTACTED | CONVERTED | CLOSED_LOST
  assignedToId String?
  notes        EnquiryNote[]                 // internal, timestamped, authored
  pageUrl      String?
  utmSource    String?  utmMedium String?  utmCampaign String?
  userAgent    String?
  createdAt    DateTime @default(now())
  deletedAt    DateTime?

  @@index([status, createdAt])
  @@index([propertyId])
}
```

Status is a strict four-state machine. `NEW → CONTACTED → CONVERTED | CLOSED_LOST`, with reopen allowed from either terminal state back to `CONTACTED`. Every transition is written to `ActivityLog` with the actor.

### 5.4 Owner submission

```prisma
model OwnerSubmission {
  id, refCode @unique,
  // Step 1 — owner + property basics
  ownerName, ownerPhone, ownerEmail, propertyName, propertyType, city, state, locality?,
  // Step 2 — features
  maxGuests?, bedrooms?, bathrooms?, amenityKeys String[], facilityKeys String[],
  hasBikeParking Boolean, parkingCapacity?, expectedPrice?,
  // Step 3 — assets
  assets SubmissionAsset[],       // photos + ownership documents
  // Step 4 — review + consent
  notes?, consentAt DateTime,
  status SubmissionStatus,         // PENDING | UNDER_REVIEW | APPROVED | REJECTED
  reviewNote?, reviewedById?, reviewedAt?,
  convertedPropertyId?             // set when approved → draft Property created
}
```

`SubmissionAsset`: `submissionId, mediaId, kind (PHOTO | DOCUMENT), originalName`. Documents are stored **outside the public web root** and served only through an authenticated route — see §11.

### 5.5 Story / Journal

```prisma
model Story {
  id, slug @unique, title, excerpt, coverMediaId?,
  bodyHtml @db.Text, bodyText @db.Text,     // sanitised HTML + plain text for search/excerpts
  categoryId?, destinationIds String[],      // cross-link stories to destinations
  authorName, readMinutes Int,
  status (DRAFT | PUBLISHED), publishedAt?,
  metaTitle?, metaDescription?, deletedAt?
}
model StoryCategory { id, slug @unique, name, sortOrder }
```

### 5.6 Site content

```prisma
model SiteSection { id, key @unique, label, fields Json, updatedById }
model SiteSetting { id, key @unique, value Json }
```

`SiteSection.fields` is a typed JSON blob per section, validated by a Zod schema keyed on `key`. This is what lets the client edit homepage headlines, section text and CTA labels without a deploy — and the Zod schema is what stops them from breaking the layout with a 400-character headline. Every text field has a documented max length enforced in the dashboard.

`SiteSetting` covers: WhatsApp number, contact email, phone, office address, social URLs, footer text, global announcement bar (on/off + text + link), default OG image.

### 5.7 Media

```prisma
model Media {
  id, storageKey, originalName, mimeType, width, height, sizeBytes,
  alt String,                       // required unless isDecorative
  isDecorative Boolean @default(false),
  caption?, credit?, folder?, uploadedById, createdAt
}
```

Originals on disk at `UPLOAD_DIR`, derivatives generated by sharp and cached. Deleting a Media record that is referenced anywhere is blocked with a clear message naming what uses it.

### 5.8 Accounts and audit

```prisma
model User      { id, email @unique, name, passwordHash, role, isActive, lastLoginAt }
model Session   { id, userId, expiresAt, ip?, userAgent? }
model ActivityLog { id, userId, action, entity, entityId, summary, meta Json, createdAt }
enum Role { OWNER | MANAGER | EDITOR }
```

**Permission matrix:**

| Capability | OWNER | MANAGER | EDITOR |
|---|:--:|:--:|:--:|
| Properties — create / edit / publish | ✓ | ✓ | ✓ (edit only, no publish) |
| Properties — delete / archive | ✓ | ✓ | — |
| Enquiries — view, update status, add notes | ✓ | ✓ | — |
| Enquiries — export CSV | ✓ | ✓ | — |
| Owner submissions — review, approve, reject | ✓ | ✓ | — |
| Stories — write and publish | ✓ | ✓ | ✓ |
| Destinations, categories, managed lists | ✓ | ✓ | — |
| Homepage content, featured stays, settings | ✓ | ✓ | — |
| Users, roles, activity log | ✓ | — | — |

### 5.9 Reserved for the Future Phase — created, not used

`RoomType`, `RatePlan`, `AvailabilityDay (propertyId, date, isAvailable, price, minNights)`, `Booking`, `BookingGuest`, `Payment`, `Coupon`, `Review`, `Route`, `Trip`, `RiderProfile`.

These are migrated in Phase 1 with correct relations and indexes, and left with no admin UI. That is the whole reason the client will not need a rewrite: property → room → rate → date-availability already exists, so a booking engine plugs in against a schema that was designed for it. **The dashboard must not surface these tables in Phase 2** — an empty screen the client cannot use is worse than no screen.

---

## 6. Cross-cutting behaviour

### 6.1 Enquiry flow (end to end)

1. User submits a Book / Enquire form on a property, destination or contact page.
2. Client-side: `react-hook-form` + Zod, **inline validation on blur — never only on submit.** Errors are specific ("Enter a 10-digit mobile number"), never "Invalid input."
3. Submit button enters a pending state on pointer-down; the form is never double-submittable.
4. Server action re-validates with the same Zod schema, checks Turnstile, honeypot and a 3-second minimum fill time, applies rate limiting (5/hour per IP, 20/hour per phone).
5. Enquiry row written with `refCode`, source, page URL and UTM parameters.
6. Notification email to `ENQUIRY_NOTIFY_EMAIL` with property name, contact details, dates and a direct dashboard link. Sent async — email failure must never fail the user's submission; failures queue and retry three times, then log.
7. Success state replaces the form in place (no page reload) with the ref code and a **"Continue on WhatsApp"** button carrying the pre-filled message.
8. GA4 event `enquiry_submit` with `property_slug` and `source`.

### 6.2 WhatsApp integration

- Floating button on every public page: bottom-right on desktop, above the sticky CTA bar on mobile, glass surface, 56px, never overlapping a form field or the footer CTA.
- Deep link: `https://wa.me/<NEXT_PUBLIC_WHATSAPP_NUMBER>?text=<encoded>`.
- Pre-filled message templates, each carrying context:
  - Property: `Hi StaySutra, I'm interested in {property.name} in {destination.name}. Ref: {url}`
  - Destination: `Hi StaySutra, I'm looking for a rider-friendly stay in {destination.name}.`
  - General: `Hi StaySutra, I'd like help planning a ride.`
- Every click fires GA4 `whatsapp_click` with the source page. Optionally logged as an `EnquirySource.WHATSAPP_CLICK` row so the dashboard shows WhatsApp interest even when the conversation happens off-site.

### 6.3 Search and filtering (Explore Stays)

- Filters: destination, category, guest capacity, rider-friendly toggle, amenities (multi), price band, availability status.
- **URL is the state.** Every filter is a query parameter, so a filtered view is shareable, bookmarkable and back-button-correct. Server-rendered on first load.
- Filter changes are optimistic: the result count updates immediately, the grid cross-fades to the new set (no spinner-and-blank-page), and the URL updates with `replace` so back doesn't walk through every toggle.
- Empty result state is a real designed state: "No stays match all of those yet" + the two filters most worth loosening + a WhatsApp CTA. Not a blank grid.
- Sorting: Recommended (featured desc, then rating, then newest), Price low→high, Price high→low, Newest.
- Pagination: 12 per page, load-more on mobile with the URL still tracking the page for SEO.

### 6.4 Error handling and states

Every list, card grid and form has four defined states: **loading** (skeletons matching the final layout's shape, never a centred spinner), **empty**, **error** (with a retry that actually retries), **success**. Skeletons must not cause layout shift — reserve the exact final dimensions.

`error.tsx` and `not-found.tsx` are branded pages, not framework defaults. The 404 offers: Explore Stays, Destinations, WhatsApp.

### 6.5 Accessibility (target: WCAG 2.2 AA)

- Contrast: body text ≥ 4.5:1, large display ≥ 3:1 — verified on the actual navy, not assumed. Gold on navy passes; **navy text on gold is used for CTA labels and must be checked at every weight.**
- Full keyboard operability: visible focus rings (2px `--gold-500` at 2px offset), logical tab order, skip-to-content link, focus trapped in modals/sheets and returned to the trigger on close.
- Semantic landmarks, one `h1` per page, correct heading order with no skipped levels.
- All interactive elements have accessible names; icon-only buttons carry `aria-label`.
- Carousels: arrow-key navigable, pause on hover/focus, never auto-advance without a visible pause control.
- Video/animation: nothing flashes more than 3× per second.
- `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast` all honoured (§4.5).

---

# PHASE 1 — WEBSITE + TECHNICAL SEO

## 7. Page specifications

Every page below is fully responsive across mobile, tablet and desktop, server-rendered, and carries its own metadata, JSON-LD and OG image.

### 7.1 Global chrome

**Header.** Glass, translucent, content scrolls underneath. Logo (STAYSUTRA wordmark + "WHERE STAYS MEET STORIES" lockup) left. Nav: Home · Stays · Experiences · For Riders · For Owners · About · Contact. `List Your Property` as an outlined gold button, right. On scroll-down the header retracts with a spring; on scroll-up it returns immediately (velocity-aware, not timer-based). A scroll-edge gradient mask where it meets content — no border. Mobile: hamburger opening a full-height panel that slides from the right and dismisses to the right, staggered nav items at 40ms, focus trapped, body scroll locked.

**Footer.** Four columns per the reference: brand block (wordmark, one-line positioning, socials) · Company (About, Careers, Blog, Contact) · For Owners (List Your Property, Owner Login, Resources, Partner Program) · Destinations (live list, generated from the Destination table, not hardcoded). Bottom bar: copyright, Privacy, Terms. Newsletter field only if the client confirms a mailing tool — otherwise omitted rather than faked.

> **Flag for the client:** the reference footer links "Careers", "Resources", "Partner Program" and "Owner Login". Owner Login does not exist in this contract. Either these link to real pages or they come out of the footer. Broken or dead-end links are a trust and SEO problem. Confirm before build.

**Floating WhatsApp button** (§6.2) and a **global announcement bar** (off by default, controlled from Phase 2).

---

### 7.2 Homepage

Ten sections, in order. No two consecutive sections share a layout skeleton.

**① Hero — "BUILT FOR RIDERS. MADE FOR STORIES."**
Full-bleed cinematic image (rider, road, low sun) with a bottom-weighted gradient scrim to `--ink-900`. Eyebrow `#RIDE · STAY · EXPLORE` in gold. Display XL headline, two lines, "MADE FOR STORIES." in gold. Lede paragraph. Two CTAs: `EXPLORE STAYS →` (gold, solid) and `FOR RIDERS` (outlined). Below them the four-item trust strip: Rider Friendly Stays · Easy Check-in (late arrivals) · Secure Parking (for bikes) · Local Support (24×7) — custom icons, hairline separators, **not emoji, not boxed cards**.
*Improvement over the reference:* the headline crops and overlaps the rider image rather than sitting in a safe left column, and the trust strip is a single hairline-separated row rather than four floating chips.
**Motion:** per-line mask reveal (90ms stagger) + background scale 1.06 → 1.0 over 1.2s + 6% parallax on scroll. Hero image is `priority`, everything else lazy — this element *is* the LCP and is budgeted accordingly.

**② Search widget.** Glass card overlapping the hero's lower edge (desktop) / stacked directly beneath (mobile). Fields: Where to? (destination + property typeahead), Check-in, Check-out, Guests, `SEARCH STAYS` (gold). Submits to `/stays` with query parameters. Date pickers are custom, dark, keyboard-accessible; guest stepper responds on pointer-down. On mobile the widget opens as a drag-dismissible sheet with rubber-banding and velocity projection — not a cramped inline form.
*Note:* dates and guests filter listings; they do **not** check live availability, because there is no booking engine in this contract. Microcopy makes that honest: "We'll confirm availability on WhatsApp."

**③ Made for the Road** (the "It's not just a stay. It's part of the ride." block). Section headline, lede, four pillars: Curated Routes (by riders) · Local Experiences (off the map) · Community (ride & connect) · Stories (from the road). Editorial numbered list on a full-bleed image, **not** a four-card grid.
**Motion:** the one pinned section on the homepage — the image column pins while the four pillars cross-fade through, then releases. Disabled under reduced motion (becomes a simple stacked list).

**④ Featured Stays.** Overline `HANDPICKED FOR RIDERS`, Display L "Featured Stays", `VIEW ALL STAYS →` right-aligned on the same baseline. Cards: cover image, `RIDER FAVOURITE` badge (only when the flag is true), name, destination, rating (only when a real value exists), three amenity chips, save/heart control. Desktop: a lead card at 2× with three stepping down — not four identical tiles. Mobile: horizontal snap carousel with momentum projection and edge peek so it is obvious more exist.
**Motion:** card hover = image `scale(1.04)` over 400ms + a gold hairline wipe under the name. Press = `scale(0.97)` on pointer-down. Tap → View Transition carrying the card image into the property page.

**⑤ Explore by Category.** Villas · Farmhouses · Resorts · Highway Stays · Homestays · Mountain Stays. Tall 3:4 tiles, duotone imagery, type overlapping the image. Links to `/stays?category=<slug>`.

**⑥ Destinations.** Mumbai, Lonavala, Karjat, Alibag, Pune, Goa. Asymmetric mosaic — one large tile, the rest smaller. Property count per destination is computed live. New destinations added from the dashboard appear here automatically, ordered by `sortOrder`.
**Motion:** 8% parallax on tile imagery, transform-only.

**⑦ For the Riders.** Presents the ecosystem — Rider Passport, Epic Routes, Motorcycle Trips, Rider Stories, Community — as an editorial preview, links to `/for-riders`. **Informational only.** Every item that does not exist yet is labelled `COMING SOON` in a muted chip. No dead links, no fake feature promises.

**⑧ List Your Property.** The owner-acquisition block: image band, `FOR PROPERTY OWNERS` overline, "Partner with StaySutra. Grow with the Rider Community.", four benefit lines (quality bookings from verified guests · marketing, listing and guest communication handled · visibility across platforms · hassle-free property management), gold CTA to `/list-your-property`.
> **The stats block from the reference (1000+ stays / 25K+ riders / 50+ destinations / 4.8★) is not shipped as-is.** The mock itself labels them "Target stays" and "Target rating." Publishing target numbers as achievements is a claim the client would have to defend. Options: (a) real verified numbers, (b) reframe honestly ("Launching across 6 destinations"), (c) replace with two owner quotes. **Client decides before build; default is (b).**

**⑨ Stories from the Road.** `#STAYSUTRARIDERS` overline, "Stories from the road", `@STAYSUTRA.IN` handle. Five-image band pulling the latest published Stories (cover images), horizontally scrollable on mobile. If the Instagram feed is wanted later it is a separate integration — this band uses Stories, which the client controls.

**⑩ Final CTA.** Full-bleed, minimal, big type: "FIND THE ROAD. FIND THE STAY. CREATE THE STORY." One gold CTA and one WhatsApp CTA. Maximum whitespace — this is the page's deliberate breathing room.

**Acceptance:** all ten sections present and content-editable in Phase 2 · LCP element is the hero image · no fabricated statistics · zero emoji icons · CLS < 0.05 through the full scroll · every CTA lands on a real page.

---

### 7.3 Explore Stays — `/stays`

Listing page with working filters (§6.3). Sticky glass filter bar on desktop; on mobile a `FILTERS (3)` pill opening a drag-dismissible sheet with snap points at 50% and 92%. Result count always visible. Card grid at 3-up desktop / 2-up tablet / 1-up mobile. Active filters shown as removable chips above the grid. Skeletons match final card dimensions exactly.

Also supports `?destination=`, `?category=`, `?riderFriendly=true`, `?guests=`, `?minPrice=`, `?maxPrice=`, `?amenities=a,b,c`, `?sort=`, `?page=`.

**Acceptance:** filters work server-side and are shareable via URL · back button restores the previous filter state · empty state is designed · no layout shift on filter change · pagination is crawlable.

### 7.4 Rider-Friendly Stays — `/rider-friendly-stays`

A positioning page, not just a filtered listing. Editorial top section explaining what "rider-friendly" actually means at StaySutra (secure covered parking, late check-in, wash-down area, tools, drying space, early breakfast, route advice), a facilities legend using the icon set, then the filtered listing of properties where `isRiderFriendly = true`. This page is the brand's whole argument — it gets the most design attention of any listing page and its own keyword target.

### 7.5 Destinations — `/destinations` and `/destinations/[slug]`

**Index:** mosaic grid of destination tiles with live property counts, short intro per destination.

**Detail template:** hero with destination imagery · short intro and long description · "Why riders come here" block (ride note, best season, road character) · stays in this destination (card grid, links through to `/stays?destination=`) · nearby destinations · related stories · destination enquiry form + WhatsApp CTA · breadcrumbs.

**Acceptance:** a destination created in the dashboard renders a complete page with no code change · `LocalBusiness`/`Place` + `BreadcrumbList` JSON-LD present · empty sections hide rather than render blank headings.

### 7.6 Property page — `/stays/[slug]`

The most important template on the site. Order:

1. **Gallery** — hero image with a "View all N photos" control opening a full-screen lightbox (keyboard navigable, swipe with 1:1 tracking and velocity-projected snapping, pinch-zoom on touch, `Esc` to close, focus returned to the trigger).
2. **Header block** — name, destination, category chip, rating (only if real), `RIDER FAVOURITE` badge (only if flagged), save control.
3. **Two-column body (desktop):** left scrolls, right is a sticky glass **Book / Enquire** card. Mobile: body scrolls, a glass CTA bar docks to the bottom (price + `ENQUIRE` + WhatsApp icon), and it must never cover the last line of content — add matching bottom padding.
4. **Quick facts strip** — guests, bedrooms, bathrooms, beds, check-in/out, min nights.
5. **About this stay** — description.
6. **Amenities** — grouped, icon set, "Show all" expanding in place with a height spring (measured, not `auto` guessed).
7. **Rider-friendly facilities** — visually distinct block with the rider note. This is the differentiator; give it real estate.
8. **Experiences** — bonfire, trek, kayaking, local food, etc.
9. **Pricing** — starting price and price note, with honest microcopy that final pricing is confirmed on enquiry.
10. **Location** — static map image with a "Open in Maps" link (a static map keeps the interactive-map JS off the critical path), locality description, nearby places.
11. **Nearby riding routes** — text list with distances. Links reserved for the Future Phase.
12. **Similar stays** — same destination or category, 4 cards, excluding the current property.
13. **Review section structure** — built and hidden. Renders when reviews exist; **not** stubbed with fake ones.
14. **Enquiry form** — inline at the bottom in addition to the sticky CTA.

**Motion:** on desktop the gallery column pins while details scroll (the second and last pinned moment on the site) · sticky card enters with a spring when the hero scrolls past · lightbox materialises (blur radius + scale together) rather than fading.

**Acceptance:** `LodgingBusiness` JSON-LD with real values only · gallery is fully keyboard operable · sticky CTA never obscures content · enquiry carries the property to the dashboard · page renders correctly with only the minimum fields filled (name, city, one image, capacity).

### 7.7 For Riders — `/for-riders`

Editorial page presenting Rider Passport, Epic Routes, Motorcycle Trips, Rider Stories and Community as the ecosystem. Informational for this contract; each block that is not yet live carries a `COMING SOON` chip and, where the client wants it, an interest-capture field (name + phone → Enquiry with `source = GENERAL`). Routes get reserved URL structure (`/routes/[slug]`) but no pages in this contract.

### 7.8 List Your Property — `/list-your-property`

**Sell section:** why list with StaySutra, what the owner gets, how the process works (4 steps), what StaySutra handles.

**The 4-step submission form** — one step per screen, a persistent progress indicator, forward/back with state preserved, and **draft persistence in `localStorage`** so a phone that rings mid-form doesn't cost the submission:

1. **Property details** — owner name, phone, email, property name, type, city/state, locality.
2. **Features** — capacity, bedrooms, bathrooms, amenities (multi-select from managed list), rider facilities, bike parking capacity, expected price band.
3. **Photos & documents** — drag-and-drop or tap to select. Photos: max 12, 10 MB each, JPEG/PNG/WebP, client-side compressed before upload. Documents: max 5, 20 MB each, PDF/JPEG/PNG. Live per-file progress, thumbnail previews, individual remove, and a clear note about what documents are needed and why.
4. **Review & submit** — everything shown back for confirmation, edit-any-step links, explicit consent checkbox with a link to Terms, then submit.

Validation is per-step (you cannot advance with an invalid step) and inline on blur. Success page shows the reference code and what happens next, with expected response time. Confirmation email to the owner; notification email to StaySutra.

**Acceptance:** a submission with 12 photos and 3 documents completes on a mid-range Android on 4G in under 90 seconds · uploads resume gracefully after a dropped field connection or fail with a clear retry · documents are never publicly reachable by URL · the submission appears in Phase 2's review queue with all assets intact.

### 7.9 Stories — `/stories` and `/stories/[slug]`

**Index:** featured story lead, category filter, card grid, pagination.
**Article:** cover image, title, meta (author, date, read time), body with proper typographic rhythm (max 68 characters per line, real blockquotes, captioned images), share row, related stories, related property/destination cards, CTA to the relevant listing.
**Acceptance:** `Article` + `BreadcrumbList` JSON-LD · reading measure respected · body renders correctly for headings, lists, quotes, images and links.

### 7.10 About — `/about`

Brand story, the rider positioning, what StaySutra does for guests and for owners, team block if the client provides it. Editorial layout, generous whitespace, one strong full-bleed image.

### 7.11 Contact — `/contact`

Enquiry form (name, phone, email, subject, message), WhatsApp CTA, phone/email, office locality, response-time expectation, optional static map. Spam-protected per §6.1.

### 7.12 Utility pages

Branded 404, `error.tsx`, Privacy Policy and Terms (client-supplied text; structure and page provided). Privacy is required for Search Console trust signals and for lawful handling of the contact data collected through the forms.

---

## 8. Technical SEO — one-time setup

Everything here is completed inside Phase 1 and verified before handover.

### 8.1 Structure and on-page

- Clean URL structure: `/stays/[slug]`, `/destinations/[slug]`, `/stories/[slug]`, `/rider-friendly-stays`. No IDs, no query strings in canonical URLs, lowercase, hyphenated.
- Metadata via Next's `generateMetadata` on every route. Title and description **templates** per page type, with per-page overrides editable from the dashboard in Phase 2.
- One `h1` per page, correct descending hierarchy, no heading used for styling.
- Canonical tag on every page. Self-referencing by default; filtered listing views canonicalise to the clean listing URL to prevent index bloat from filter combinations.
- Internal linking structure: property → destination → related stays → stories → back to listings. Every property is reachable within three clicks of the homepage.
- Custom 404 that offers routes onward rather than dead-ending.
- **Keyword map** for destination and category pages delivered as a sheet in `docs/KEYWORD-MAP.md` — primary keyword, secondary keywords, intent, target URL, and the title/description actually shipped.

### 8.2 Indexing and tools

- `app/sitemap.ts` generating dynamically from the database — properties, destinations, stories, static pages — with `lastModified` from `updatedAt`. Drafts and unpublished content excluded automatically.
- `app/robots.ts` allowing crawl, disallowing `/dashboard`, `/api`, and upload paths, and pointing to the sitemap.
- Google Search Console: property created **under the client's own Google account**, domain verified via DNS TXT, sitemap submitted, coverage confirmed clean.
- Google Analytics 4 installed, verified, with the events in §8.5 firing. Also under the client's own account.
- Kedar is added as a collaborator on both and can be removed at any time.

### 8.3 Structured data (JSON-LD)

| Schema | Where |
|---|---|
| `Organization` + `LocalBusiness` | Site-wide, in the root layout |
| `WebSite` + `SearchAction` | Homepage |
| `LodgingBusiness` / `Accommodation` | Every property page — name, image, address, geo, amenities, price range; `aggregateRating` **only when real ratings exist** |
| `Place` / `TouristDestination` | Destination pages |
| `Article` | Story pages |
| `BreadcrumbList` | Every nested page |
| `FAQPage` | Where genuine FAQ content exists |

Generated by typed helpers in `lib/seo/schema.ts` so new properties added from the dashboard emit correct schema automatically. **Validated against Google's Rich Results Test before handover** — screenshots included in the handover pack.

### 8.4 Performance and technical health

- AVIF/WebP with responsive `sizes`, lazy loading everywhere except the hero.
- Alt text enforced at upload; a decorative image must be explicitly marked as such.
- Font subsetting, `font-display: swap`, preloaded display weight only.
- Route-level code splitting; heavy client components (lightbox, date picker, filter sheet, Tiptap) dynamically imported.
- Caching: static pages statically generated, dynamic listing routes with `revalidate`, and on-demand revalidation triggered by dashboard publishes in Phase 2.
- Open Graph and Twitter cards on every page, with dynamic OG images generated via `next/og` (property name + destination + cover image), so a WhatsApp share of any stay looks intentional.
- `security.txt`, correct `X-Robots-Tag` behaviour, HTTPS enforced, HSTS, `www` → apex (or the reverse, per the client's preference) with a single 301.

### 8.5 Analytics events

`enquiry_submit` · `whatsapp_click` · `property_view` · `filter_apply` · `owner_submission_start` · `owner_submission_complete` · `search_submit` · `story_read`. Each with the parameters needed to answer "which destination and which property produce enquiries."

### 8.6 Performance budgets (mobile, throttled 4G, Moto G-class device)

| Metric | Target |
|---|---|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| LCP | < 2.0s |
| CLS | < 0.05 |
| INP | < 200ms |
| Total JS on homepage | < 200 KB gzipped |
| Largest single image payload | < 250 KB |

If an animation costs a budget, the budget wins. A Lighthouse report is shared at handover.

### 8.7 Honest scope statement on SEO

This is a **one-time technical foundation**, done once at launch, so the site is fully crawlable, indexable and correctly understood by Google. It does not guarantee rankings — rankings come from content, backlinks, reviews and time. Ongoing SEO and content work is a separate engagement and entirely the client's call. Nothing in this build depends on it.

---

# PHASE 2 — DASHBOARD / CRM

## 9. Dashboard overview

This is the client's CMS — a private admin panel built specifically for StaySutra, not a plugin and not an adapted template. The client runs the entire site from here without touching code or calling a developer.

**The test the dashboard has to pass:** a non-technical team member, on a phone, can add a property with eight photos, publish it, and see it live — in under ten minutes, on their first day, without asking anyone.

### 9.1 Structure

```
/dashboard
├─ /                      Overview
├─ /properties            list · /new · /[id]/edit
├─ /enquiries             list · /[id]
├─ /submissions           list · /[id] (review)
├─ /destinations          list · /new · /[id]/edit
├─ /stories               list · /new · /[id]/edit
├─ /lists                 amenities · facilities · experiences · categories
├─ /media                 media library
├─ /content               homepage sections, featured stays, announcement
├─ /settings              contact details, WhatsApp, socials, SEO defaults
└─ /users                 accounts, roles, activity log     (OWNER only)
```

### 9.2 Dashboard design language

Same brand, different job. The site sells; the dashboard has to be *used*, sometimes for an hour at a stretch, sometimes one-handed on a phone.

- Dark navy surfaces (`--ink-800` canvas, `--ink-700` panels), gold reserved for the primary action and the active nav item **only**. A dashboard where five things are gold has no primary action.
- **Inter throughout**, 14–15px base. Montserrat only for page titles. Dense but not cramped: 8px rhythm, 44px row height, tabular numerals in every table.
- Glass used functionally: sticky top bar, command palette, modals, the mobile action sheet. Never glass-on-glass, never glass behind a data table.
- Layout: collapsible left sidebar (icon-only when collapsed, state remembered), sticky top bar with breadcrumb + search + user menu, content max-width 1440px.
- **Mobile:** bottom tab bar (Overview · Properties · Enquiries · More), full-screen forms, drag-dismissible action sheets, thumb-reachable primary actions. The client will approve listings from their phone — this is a first-class layout, not a squeeze.
- Motion is restrained and functional: 200–250ms springs, bounce 0. Row expansion, sheet entry, toast entry. No decorative scroll animation anywhere in the admin.
- **Agency and forgiveness:** every destructive action is undoable via a 6-second toast rather than blocked behind a confirmation dialog. Confirmation dialogs are reserved for genuinely irreversible actions (deleting a user, permanently purging archived content). Overusing them trains people to click through.
- **Feedback in four kinds:** status (autosave indicator), completion (toast), warning (unpublished changes banner), error (inline, specific). Validate inline as they type, never only on save.
- Optimistic updates everywhere, with rollback and a clear error if the server rejects.
- Keyboard: `⌘/Ctrl + K` command palette (jump to any property, enquiry or page), `⌘/Ctrl + S` save, `Esc` close. Full tab operability.

## 10. Dashboard modules

### 10.1 Overview

Simple activity snapshot — not a vanity analytics dashboard. Enquiries this month with a change indicator · new enquiries needing action (the primary call to action) · pending owner submissions · most-viewed properties (last 30 days) · published vs draft property counts · recent activity feed. Every card links to the filtered list behind it.

### 10.2 Property management

**List:** searchable, filterable table (status, destination, category, featured, rider-friendly), sortable columns, bulk select for publish/unpublish/feature, thumbnail + name + destination + price + status pill + updated date. Row click opens the editor; a quick-actions menu handles publish, duplicate, view live, archive.

**Editor** — a tabbed form with a persistent sticky header showing status, `Save draft`, `Publish`, `View live`:

| Tab | Fields |
|---|---|
| Basics | Name, slug (auto-generated, editable, uniqueness-checked live), tagline, category, destination, status, featured toggle + order |
| Description | Rich text (constrained toolbar: bold, italic, H3, lists, link — nothing that can break the page) |
| Location | Address, locality, city, state, lat/long with a map picker, nearby places (repeatable rows) |
| Capacity & rules | Max guests, bedrooms, beds, bathrooms, check-in/out times, minimum nights |
| Pricing | Starting price, price note, availability status |
| Amenities | Multi-select chips from the managed list, grouped |
| Rider-friendly | Toggle + facility multi-select + rider note |
| Experiences | Multi-select from the managed list |
| Routes | Repeatable rows: title, distance, note |
| Gallery | Upload, drag-to-reorder (1:1 pointer tracking, not a click-to-move-up widget), set cover, alt text per image, delete |
| SEO | Meta title, meta description (with live character counters and a Google-style preview), OG image override |

**Behaviour:** autosave draft every 20 seconds and on blur, with a visible "Saved · 10:42" indicator. Unsaved-changes guard on navigate. Publish is blocked with a specific checklist if required fields are missing ("Add a cover image and at least one destination"). Slug changes on a published property automatically create a 301 redirect — the client must never be able to silently break a live URL. Duplicate creates a draft copy for near-identical listings.

**Acceptance:** creating and publishing a complete property takes under 10 minutes on a phone · reordering 12 gallery images is smooth on a mid-range Android · publishing revalidates the live page within 10 seconds · unpublishing removes it from listings, sitemap and search results, and its URL returns 404 (or 410) rather than a broken page.

### 10.3 Media library

Grid view with folders, search by filename/alt, filter by usage. Upload via drag-and-drop or file picker, multi-file with per-file progress. Sharp pipeline generates derivatives on upload. **Alt text is a required field** — the save is blocked without it unless "decorative" is ticked. Each item shows dimensions, size, and where it is used; deletion is blocked with a list of referencing entities. Bulk delete for unused assets only.

### 10.4 Enquiries — the CRM

**Inbox:** one list for every enquiry, newest first, with an unmistakable unread treatment. Columns: ref code, name, phone (tap-to-call and tap-to-WhatsApp on mobile), property, dates, source, status, age. Filters: status, source, property, destination, date range. Search across name, phone, email and ref code. Saved views: New, Contacted, This week, Converted.

**Detail:** full submission, the property it came from (with a link to the live page), page URL and UTM source, status control, assignee, and a timestamped internal note thread with the author's name. A `WhatsApp this guest` button opens the chat with a pre-filled greeting that includes their name and the property. Every status change is logged.

**Export:** CSV of the current filtered view, with all fields and a documented column order.

**Notifications:** email on arrival to the configured address. Optional daily digest of open enquiries. Both toggleable in settings.

**Acceptance:** an enquiry submitted on the live site appears in the inbox within 5 seconds and triggers an email within 60 · statuses are enforced (no arbitrary transitions) · export opens cleanly in Excel and Google Sheets with UTF-8 intact.

### 10.5 Owner submissions

Review queue with `PENDING → UNDER_REVIEW → APPROVED | REJECTED`. Detail view shows every submitted field, a photo gallery, and documents opened through an **authenticated** route (never a public URL). Reviewer can add an internal note and a decision reason.

**Approve → create draft property:** the core workflow. Approval creates a `Property` in `DRAFT` with owner-supplied name, type, location, capacity, amenities and photos already mapped into the gallery, then opens the property editor so the client edits and publishes. The submission is linked to the created property both ways.

Reject sends an optional templated email to the owner. Both actions are logged.

**Acceptance:** approving a submission with 10 photos produces a draft property with all 10 in the gallery, in order, with alt-text prompts pending · documents are unreachable by direct URL when logged out · a rejected submission is retained (not deleted) for the record.

### 10.6 Destinations, categories and managed lists

CRUD for destinations (name, slug, state, intro, description, hero and tile images, coordinates, best season, ride note, featured flag, sort order, SEO fields). **Creating a destination builds its page automatically** — this is stated in the proposal and is a hard acceptance criterion.

Managed lists (amenities, rider facilities, experiences, categories): name, slug, icon picker limited to the shipped icon set, group, sort order, active toggle. Deactivating a list item hides it from new forms but preserves it on properties already using it. Deleting is blocked while in use, with a count and links.

### 10.7 Stories / Journal

List with status and category filters. Editor: title, slug, excerpt, cover image, category, related destinations, author, body (Tiptap — headings, bold, italic, lists, quote, link, image with alt and caption, embed), read time auto-calculated with a manual override, SEO fields, publish/schedule. Autosave, revision snapshots for the last 10 saves with one-click restore, live preview of the article layout.

### 10.8 Site content control

Section-by-section editor for the homepage and key pages, driven by `SiteSection` (§5.6). Each field shows its character limit and a live count; the form refuses to save copy that would break the layout. Editable: hero eyebrow/headline/lede/CTA labels, all section headlines and intros, the "Made for the Road" pillars, the owner-acquisition benefit lines, the final CTA, the announcement bar, and the footer blurb.

**Featured Stays:** drag-to-reorder picker (1:1 pointer tracking), maximum 8, with a live preview of what the homepage row will look like.

**Settings:** WhatsApp number, contact email and phone, address, social URLs, notification recipients, default meta title/description templates, default OG image, GA4 ID.

### 10.9 Users, roles and activity

Invite by email with a set-password link, roles per §5.8, deactivate without deleting, force logout of all sessions. Activity log: filterable by user, entity and date, showing actor, action, entity, timestamp and a human-readable summary ("Rhea published *The Biker's Den*"). OWNER only.

### 10.10 Dashboard acceptance summary

Owner and staff accounts work with the permission matrix enforced **server-side** on every action, not just hidden in the UI · every module is usable on a 390px screen · no action loses unsaved work without warning · every destructive action is undoable or confirmed · publishing anywhere revalidates the affected public pages · the client completes all five core workflows unaided during the recorded training call.

---

## 11. Security

- Argon2id password hashing, minimum 12-character passwords, rate-limited login (5 attempts per 15 minutes per IP and per account), generic failure messages that don't reveal whether an email exists.
- DB-backed sessions, httpOnly + secure + SameSite=Lax cookies, 7-day rolling expiry, "log out everywhere" available.
- **Authorisation checked server-side on every mutation.** Hiding a button is not access control.
- Zod validation on every server action and route handler; Prisma parameterised queries throughout; no raw SQL with interpolation.
- Uploads: MIME sniffing (not extension trust), size caps, image re-encoding through sharp to strip EXIF and any embedded payload, randomised storage keys, `UPLOAD_DIR` outside the web root.
- Owner-submission documents served only through an authenticated streaming route with a short-lived signed token.
- CSRF protection on state-changing requests; CSP, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` headers set in Caddy.
- Secrets only in `.env` on the server; `.env.example` in the repo with empty values.
- `npm audit` clean of high/critical at handover.
- Personal data collected (name, phone, email, message) is minimised, retained deliberately, exportable and deletable from the dashboard, and covered by the Privacy Policy.
- Nightly automated backups (§3.1) with a **restore actually tested once** before handover — an untested backup is not a backup.

## 12. Empty and edge states

Defined, designed and built — not left to render blank:

| Situation | Behaviour |
|---|---|
| No properties in a destination yet | "Stays here are being onboarded" + WhatsApp CTA + link to nearby destinations |
| Filter combination returns nothing | The two filters most worth loosening, one tap to clear, WhatsApp CTA |
| Property has no rating | Rating element does not render at all — no "0.0", no placeholder stars |
| Property has one image | Gallery adapts to a single-image layout instead of an empty grid |
| No stories published | Homepage stories band hides entirely; `/stories` shows a designed empty state |
| Missing hero/cover image | Branded fallback (navy field + wordmark watermark), never a broken image icon |
| Enquiry email service down | Enquiry still saves; failure is queued, retried, and surfaced as a dashboard warning |
| Long content (60-char property name, 400-char description) | Truncation with ellipsis and full text on the detail page — verified, not assumed |
| Slow network | Skeletons matching final dimensions; no layout shift on arrival |
| JS disabled / failed | Core content and navigation still readable; forms degrade to a visible WhatsApp/phone fallback |

Seed the staging database with deliberately awkward content — the longest plausible name, the shortest description, a property with one photo, a destination with zero stays — and review every page against it.

## 13. QA and testing

**Device matrix (real devices or BrowserStack, not just DevTools):** iPhone SE (small), iPhone 14/15 (Safari iOS), a mid-range Android on Chrome (the majority case here), iPad, Chrome/Edge/Firefox/Safari desktop at 1280 and 1920.

**Checklist per page:** responsive at 320/390/768/1024/1440/1920 · keyboard-only pass · screen-reader pass on the critical paths (home → property → enquiry) · reduced-motion pass · reduced-transparency pass · slow-3G pass · forms with valid, invalid, empty and hostile input · back/forward behaviour · deep links · 404 for a deleted property · print stylesheet sanity on the property page.

**Automated:** TypeScript strict with zero errors · ESLint clean · Playwright smoke tests for the five critical paths (enquiry submit, owner submission, admin login, publish property, filter listing) · Lighthouse CI against the §8.6 budgets.

**Two rounds of design revisions per page** are included during the build, per the accepted proposal. Changes requested after page sign-off are quoted separately.

## 14. Deployment, launch and handover

### 14.1 Deployment

Ubuntu 24.04 on the Hostinger KVM 2 (Mumbai). Non-root deploy user, SSH keys only, password auth disabled, UFW allowing 22/80/443 only, fail2ban, unattended security upgrades. Docker Compose: `app` (Next standalone), `db` (Postgres 16 with a named volume), `caddy` (auto-TLS, reverse proxy, security headers). Uploads on a bind-mounted host volume included in backups. Deploy is a single documented script: pull, build, `prisma migrate deploy`, restart, health check, rollback on failure.

### 14.2 Launch sequence

Staging sign-off → DNS cutover with lowered TTL → TLS verified → production smoke test of all five critical paths → GA4 and Search Console verified live → sitemap submitted → `noindex` confirmed absent from production → backup job confirmed running → 48-hour watch window.

### 14.3 Handover pack

1. Live website and dashboard on the client's domain.
2. **GitHub repository transferred to the client's account** — full source, full history.
3. All admin credentials and environment variables in a written credentials document.
4. `docs/HANDOVER.md`: architecture overview, how to deploy, how to restore a backup, how to rotate secrets, where everything lives, who to call for what.
5. Recorded training walkthrough covering all five core workflows.
6. Analytics, Search Console and Lighthouse reports; Rich Results validation screenshots.
7. `docs/KEYWORD-MAP.md`.
8. Confirmation that hosting, Analytics and Search Console sit on the client's own accounts and payment methods, and that Kedar's collaborator access can be removed at any time.

**Ownership, stated plainly:** the client owns the domain, the hosting, the source code, the database, the CMS, the Analytics and Search Console properties, and the content. It is standard Next.js and PostgreSQL — no proprietary framework, no licence tied to Kedar. Any competent developer can take over from the repository and the handover document.

## 15. Timeline

| Week | Phase | Work |
|---|---|---|
| **1** | Phase 1 | Discovery, brand assets and content collection, design direction for homepage and property page approved, design system built, database schema and migrations, project scaffold, VPS provisioned |
| **2** | Phase 1 | All public pages built and made responsive, motion system implemented, enquiry and WhatsApp flows wired, first review round, staging up |
| **3** | Phase 1 → 2 | Phase 1 revisions and sign-off, technical SEO completed, then dashboard: auth, property CRUD, media library, enquiry inbox |
| **4** | Phase 2 | Owner submissions workflow, stories, destinations, site content control, users and roles, full QA pass, deployment, training walkthrough, handover |

**The one thing that can stretch this is content** — property photos, descriptions and details arriving late. The build does not wait for content: pages are built against seeded placeholders and real content is dropped in, but launch cannot happen without it.

## 16. What is needed from the client

| Input | Needed by | Blocks |
|---|---|---|
| Logo files (SVG preferred), brand assets, existing prototype | Day 1 | Design system |
| Property photos, descriptions, pricing, facilities for launch listings | Day 5 | Content population, launch |
| Destination copy and imagery for the six launch destinations | Day 5 | Destination pages |
| Brand story / About copy | Week 2 | About page |
| Privacy Policy and Terms text | Week 3 | Legal pages, GSC |
| DNS access for the existing domain | Week 3 | Launch |
| Google account for Analytics and Search Console | Week 3 | SEO setup |
| Hostinger VPS purchased on the client's account | Week 1 | Staging, deployment |
| WhatsApp business number and notification email | Week 2 | Enquiry flow |
| Decision on the homepage statistics block (§7.2 ⑧) | Week 1 | Homepage build |
| Decision on footer links that have no page (§7.1) | Week 1 | Footer |
| One point of contact for approvals | Day 1 | Everything |

## 17. Risks and how they are handled

| Risk | Impact | Handling |
|---|---|---|
| Content arrives late | Launch slips | Build against seeds; weekly written content chase; launch date tied to content date in writing |
| Scope creep toward booking/rider accounts | Timeline and cost | Future Phase is explicitly out of scope in §1; anything new is quoted before it is built |
| Heavy photography hurts Core Web Vitals | Rankings and bounce | Budgets in §8.6 are enforced; images re-encoded on upload; budget wins over animation |
| Client edits break a layout | Visual damage | Character limits enforced in the dashboard with live counters; managed lists instead of free text |
| Slug changed on a live property | Broken URLs, lost rankings | Automatic 301 on slug change |
| Single VPS failure | Downtime | Nightly tested backups, documented restore, container restart policies, uptime monitoring |
| Fake stats or reviews shipped | Client's credibility | §4.6 rejection list; rating fields render only with real values |
| More than two revision rounds requested | Timeline | Two rounds per page included; further changes quoted, per the accepted proposal |

## 18. Build order — work packages

Each package is one PR into `develop`, with its own acceptance checklist from the sections referenced.

**Phase 1**

| # | Package | Depends on | Ref |
|---|---|---|---|
| P1-01 | Repo scaffold, TypeScript strict, Tailwind v4, tokens, self-hosted fonts, lint/format, CI | — | §3, §4.2, §4.3 |
| P1-02 | Prisma schema (full, including reserved tables), migrations, seed script, DB on VPS | P1-01 | §5 |
| P1-03 | Primitives: Button, Chip, Field, Select, Sheet, Dialog, Rule, Skeleton, Icon set | P1-01 | §4.4, §4.7 |
| P1-04 | Motion layer: Lenis, Reveal, Parallax, spring presets, reduced-motion handling | P1-03 | §4.5 |
| P1-05 | Global chrome: header, mobile nav, footer, WhatsApp button, announcement bar | P1-03 | §7.1 |
| P1-06 | Homepage sections ①–⑤ | P1-04, P1-05 | §7.2 |
| P1-07 | Homepage sections ⑥–⑩ | P1-06 | §7.2 |
| P1-08 | Property card component + Explore Stays with URL-state filters | P1-02, P1-03 | §6.3, §7.3 |
| P1-09 | Property page template, gallery lightbox, sticky enquire | P1-08 | §7.6 |
| P1-10 | Destinations index + detail; Rider-Friendly Stays page | P1-08 | §7.4, §7.5 |
| P1-11 | Enquiry system: forms, validation, Turnstile, rate limiting, email, WhatsApp handoff | P1-02 | §6.1, §6.2 |
| P1-12 | List Your Property — 4-step form, uploads, draft persistence | P1-11 | §7.8 |
| P1-13 | Stories index + article; For Riders; About; Contact; legal; 404/error | P1-05 | §7.7, §7.9–7.12 |
| P1-14 | SEO: metadata, sitemap, robots, JSON-LD, OG images, GSC + GA4, keyword map | P1-13 | §8 |
| P1-15 | Performance pass, accessibility pass, device matrix, Lighthouse to budget | P1-14 | §8.6, §13 |
| P1-16 | Staging deploy, client review round 1 and 2, Phase 1 sign-off | P1-15 | §14 |

**Phase 2**

| # | Package | Depends on | Ref |
|---|---|---|---|
| P2-01 | Auth: login, sessions, roles, server-side authorisation, rate limiting | P1-02 | §5.8, §11 |
| P2-02 | Admin shell: sidebar, top bar, mobile tabs, command palette, toasts, undo | P2-01 | §9.2 |
| P2-03 | Media library + sharp pipeline + alt-text enforcement | P2-02 | §10.3 |
| P2-04 | Property list + editor (all tabs), autosave, publish gates, slug redirects | P2-03 | §10.2 |
| P2-05 | Enquiry inbox, detail, notes, statuses, CSV export, notifications | P2-02 | §10.4 |
| P2-06 | Owner submissions review + approve-to-draft-property conversion | P2-04 | §10.5 |
| P2-07 | Destinations, categories, managed lists | P2-03 | §10.6 |
| P2-08 | Stories editor with Tiptap, revisions, scheduling | P2-03 | §10.7 |
| P2-09 | Site content control, featured stays picker, settings | P2-04 | §10.8 |
| P2-10 | Users, roles, activity log | P2-01 | §10.9 |
| P2-11 | On-demand revalidation wiring from every publish action | P2-04 | §8.4 |
| P2-12 | Dashboard QA: permissions, mobile, edge cases, Playwright critical paths | all | §13 |
| P2-13 | Production deploy, DNS cutover, backups tested, launch sequence | P2-12 | §14 |
| P2-14 | Handover pack, repo transfer, recorded training, documentation | P2-13 | §14.3 |

---

## 19. Definition of done

The project is complete when:

1. Every page in §7 is live, responsive and meets the §8.6 budgets on a real mid-range Android.
2. Every dashboard module in §10 passes its acceptance criteria with permissions enforced server-side.
3. Nothing on the anti-slop rejection list (§4.6) appears anywhere in the shipped site.
4. No fabricated statistic, rating, review or testimonial exists in the database or the markup.
5. Search Console and GA4 are verified on the client's own accounts and reporting real data.
6. A backup has been restored successfully in a test.
7. The repository, credentials, environment variables and handover documentation are in the client's possession.
8. The client's team has completed all five core workflows unaided during the recorded training call.
9. Two months of support (Plan B) begins from the date of handover sign-off.

---

**Kedar Gurav** — Web Developer
+91 88058 95066 · kgurav678@gmail.com · Viman Nagar, Pune

*StaySutra — Website & Dashboard · Detailed Project Report v1.0 · 03 September 2026*
