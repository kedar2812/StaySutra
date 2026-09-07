# StaySutra

India's rider-friendly stay network — marketing site, listings and enquiry flow.

Built to the specification in [`docs/StaySutra_DPR.md`](docs/StaySutra_DPR.md).
That document is the single source of truth: if something here and something
there disagree, the DPR wins.

**Phase 1 (this build):** public website + one-time technical SEO foundation.
**Phase 2:** admin dashboard and enquiry CRM, built on the same schema.

---

## Quick start

```bash
npm install
cp .env.example .env      # every value can stay empty for the public site
npm run dev               # http://localhost:3000
```

The site runs with **no database and no environment variables**. Content is read
from `/content` through `lib/content.ts`, and enquiries are appended to
`.data/enquiries.jsonl` until `DATABASE_URL` exists. That is deliberate: the
public site has to be live and correct before a single admin screen is written.

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run build
npm run db:seed      # loads /content into Postgres (needs DATABASE_URL)
```

---

## Stack

Next.js 15 (App Router, React 19, TypeScript strict) · Tailwind CSS v4 ·
Motion + Lenis · PostgreSQL 16 + Prisma 6 · Zod + react-hook-form ·
Docker Compose (app + db + Caddy) on a single Hostinger VPS.

Fonts are self-hosted — there is no Google Fonts CDN request, for privacy and
for LCP.

---

## Layout

```
app/
  (site)/       Public pages
  api/          enquiry, owner-submission, health
  globals.css   Every design token, defined once
components/
  primitives/   Button, Chip, Field, Frame, Icon, Plate, Rule, Sheet, Skeleton
  site/         Public composites — header, footer, cards, forms, gallery
    home/       The twelve homepage sections, one file each
  motion/       Reveal, Parallax, MaskLines, SmoothScroll
lib/            content, filters, motion, plate, prose, seo, site, validation
content/        Phase 1 content — JSON + story markdown
prisma/         schema.prisma, seed.ts
docs/           DPR, HANDOVER, CONTENT-GAPS, KEYWORD-MAP
```

---

## Rules that are load-bearing

Break these and the site stops looking designed.

- **No raw hex in a component.** Every colour, radius and spacing step is a
  token in `app/globals.css`.
- **Gold appears on at most three elements per viewport.** Primary CTA, one
  active state, one data highlight. A fourth means one of the three is wrong.
- **No emoji as icons.** One SVG set in `components/primitives/Icon.tsx` — 24px
  grid, 1.5px stroke, `currentColor`.
- **Never stack glass on glass.** One of the two becomes solid.
- **Feedback on pointer-down, not on release.** That is what `.press` is for.
- **Reveals go on sections and groups, never on every element.**
- **Two pinned scroll moments on the whole site.** No more.
- **No fabricated statistic, rating, review or testimonial** — anywhere, in the
  markup or in the database. Rating fields render only when a real value exists,
  and the JSON-LD omits `aggregateRating` when it does not.
- **Nothing implies instant booking.** There is no inventory behind this site.
  Confirmation is a person on WhatsApp, every CTA says so, and the word "book"
  never appears on a button.
- **No filter, chip or category leads to an empty page.** A category with no
  listings says "Onboarding"; a story category with nothing published is not
  offered. An empty result is the loudest "this is a demo" signal there is.
- **If an animation costs a performance budget, the budget wins.**

Full design system: DPR §4. The anti-pattern list in §4.6 is a rejection list.

---

## Content

Content that has not arrived from the client yet is flagged `"placeholder": true`
in `/content` and tracked in [`docs/CONTENT-GAPS.md`](docs/CONTENT-GAPS.md).

Image slots with no real media render a generated brand plate (`lib/plate.ts`) —
a deterministic duotone SVG landscape. It is honest, costs no network request,
and `Frame` prefers real media the instant a `Media` row exists.

To close a gap: drop the real content in, remove the `placeholder` flag, delete
the row from `CONTENT-GAPS.md`. No code change is needed for any of it.

---

## Deploying

See [`docs/HANDOVER.md`](docs/HANDOVER.md) for server setup, the deploy script,
backups and restore, secret rotation, and troubleshooting.

```bash
cd /opt/staysutra && ./deploy.sh
```

Pulls, builds, migrates, restarts, health-checks, and **rolls back if the health
check fails.**

---

## Performance budgets

Mobile, throttled 4G, Moto G-class device. Checked before every release.

| Metric | Target |
|---|---|
| Lighthouse Performance / A11y / Best Practices / SEO | ≥ 90 / ≥ 95 / 100 / 100 |
| LCP · CLS · INP | < 2.0s · < 0.05 · < 200ms |
| Homepage JS | < 200 KB gzipped |

---

**Kedar Gurav** — Web Developer · Pune
