# StaySutra — handover

Architecture, deployment, restore, secrets and who to call for what.

This document is written to be enough on its own. Any competent Next.js
developer should be able to take the repository and this file and run the site
without speaking to anyone.

Phase 1 (website + technical SEO) is what this document currently covers. The
dashboard sections fill in at the end of Phase 2.

---

## 1. What you own

| Thing | Where | On whose account |
|---|---|---|
| Domain | Registrar | **Client** |
| Server | Hostinger KVM 2, Ubuntu 24.04, Mumbai | **Client** |
| Source code | GitHub — `kedar2812/StaySutra` | Transferred to the client at close |
| Database | Postgres 16, in a container on that server | **Client** |
| Uploaded media | `/var/staysutra/uploads` on that server | **Client** |
| Analytics | Google Analytics 4 | **Client's Google account** |
| Search Console | Google Search Console | **Client's Google account** |

It is standard Next.js and PostgreSQL. There is no proprietary framework and no
licence tied to the developer. Kedar's collaborator access to GitHub, Analytics
and Search Console can be removed at any time without anything breaking.

---

## 2. Architecture

```
                    ┌──────────────────────────────────┐
   Internet ──443──▶│  caddy      automatic TLS,       │
                    │             security headers,    │
                    │             www → apex redirect  │
                    └───────────────┬──────────────────┘
                                    │ :3000
                    ┌───────────────▼──────────────────┐
                    │  app        Next.js 15 standalone│
                    │             React 19, TypeScript │
                    └───────────────┬──────────────────┘
                                    │ :5432
                    ┌───────────────▼──────────────────┐
                    │  db         Postgres 16          │
                    └──────────────────────────────────┘

   /var/staysutra/uploads   bind mount, originals, outside the web root
   /var/staysutra/backups   nightly pg_dump + uploads tarball
```

Three containers on one box. No separate database bill, no object storage bill,
no vendor lock-in. 8 GB RAM handles 50+ properties and this traffic profile
comfortably.

### Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4 + CSS custom properties for the design tokens |
| Animation | Motion (`motion/react`) for springs, Lenis for smooth scroll |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 — migrations committed, `prisma migrate deploy` in the deploy step |
| Validation | Zod on every route handler, `react-hook-form` on the client |
| Fonts | Self-hosted with `next/font/local`. **No Google Fonts CDN request** |
| Hosting | Hostinger KVM 2, Ubuntu 24.04 LTS |
| Process | Docker Compose: `app` + `db` + `caddy` |

### Repository layout

```
staysutra/
├─ app/
│  ├─ (site)/            Public site — every page in DPR §7
│  ├─ api/               enquiry, owner-submission, health
│  ├─ fonts/             Self-hosted woff2
│  ├─ globals.css        ALL design tokens live here
│  ├─ layout.tsx  sitemap.ts  robots.ts  not-found.tsx  error.tsx
├─ components/
│  ├─ primitives/        Button, Chip, Field, Frame, Icon, Plate, Rule, Sheet, Skeleton
│  ├─ site/              Public composites (Header, Footer, cards, forms, gallery)
│  │  └─ home/           The ten homepage sections, one file each
│  └─ motion/            Reveal, Parallax, MaskLines, SmoothScroll
├─ lib/                  content, filters, motion, plate, prose, seo, site, validation
├─ content/              Phase 1 content — JSON + story markdown
├─ prisma/               schema.prisma, migrations/, seed.ts
├─ docs/                 This file, CONTENT-GAPS.md, KEYWORD-MAP.md, the DPR
└─ docker-compose.yml  Caddyfile  Dockerfile  .env.example
```

### Where content comes from, and why it moves

**Phase 1:** the site reads `/content/*.json` through `lib/content.ts`. This is
deliberate — it lets the public site be live and correct before a single admin
screen exists, which is the entire point of the phase order.

**Phase 2:** `prisma/seed.ts` loads exactly those same files into Postgres, and
the dashboard writes back to the same tables. The shapes in `lib/types.ts` and
`prisma/schema.prisma` are deliberately identical, so this is a swap of the data
source, not a rewrite.

---

## 3. Local development

```bash
git clone https://github.com/kedar2812/StaySutra.git
cd StaySutra
npm install
cp .env.example .env          # every value can stay empty for the public site
npm run dev                   # http://localhost:3000
```

The site runs with no database and no environment variables at all. Enquiries
are written to `.data/enquiries.jsonl` instead of Postgres until `DATABASE_URL`
exists.

```bash
npm run typecheck   # tsc --noEmit, zero errors expected
npm run lint        # eslint, clean expected
npm run build       # production build
```

---

## 4. Environment variables

Every value is handed over in the separate credentials document. Nothing is
hardcoded; nothing is committed. `.env.example` in the repo carries the shape
with empty values.

| Variable | What it is | Needed for |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Everything, from P1-02 |
| `NEXTAUTH_SECRET` | 32+ random bytes. `openssl rand -base64 32` | Dashboard login |
| `NEXTAUTH_URL` | Full origin, e.g. `https://staysutra.in` | Dashboard login |
| `UPLOAD_DIR` | `/var/staysutra/uploads` | Media, submissions |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, **no trailing slash** | Canonicals, sitemap, OG. **Also gates robots.txt — see §8** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Country code, no `+` or spaces: `918805895066` | Every WhatsApp deep link |
| `RESEND_API_KEY` | Resend API key | Notification email |
| `ENQUIRY_NOTIFY_EMAIL` | Where enquiries land | Notification email |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | Form spam protection |
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | Analytics. **Omit and GA4 does not load at all** |

Compose additionally needs `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
`DOMAIN`, `STAGING_DOMAIN`, `ACME_EMAIL`, `STAGING_USER`,
`STAGING_PASSWORD_HASH`.

### Rotating a secret

1. Change it in `/opt/staysutra/.env` on the server
2. `docker compose up -d --force-recreate app`
3. Update the credentials document

Rotating `NEXTAUTH_SECRET` logs everyone out of the dashboard. That is the
intended behaviour and is how you evict a compromised session.

---

## 5. Server setup (one time)

```bash
# As root, immediately after provisioning
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Harden SSH: PasswordAuthentication no, PermitRootLogin no
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

ufw default deny incoming && ufw default allow outgoing
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

apt update && apt install -y fail2ban unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades

curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

mkdir -p /var/staysutra/{uploads,backups} && chown -R deploy:deploy /var/staysutra
```

Then, as `deploy`:

```bash
git clone https://github.com/kedar2812/StaySutra.git /opt/staysutra
cd /opt/staysutra
cp .env.example .env && nano .env          # fill in every value
docker compose run --rm caddy caddy hash-password   # for STAGING_PASSWORD_HASH
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

---

## 6. Deploying a change

```bash
cd /opt/staysutra && ./deploy.sh
```

`deploy.sh` pulls, builds, runs `prisma migrate deploy`, restarts, waits for
`/api/health`, and **rolls back to the previous image if the health check
fails**. Read it before you run it — it is thirty lines and it is the whole
deployment story.

Manual equivalent:

```bash
git pull
docker compose build app
docker compose up -d app
docker compose exec app npx prisma migrate deploy
curl -f https://<domain>/api/health
```

### Adding a migration

```bash
# Locally, against a local Postgres
npx prisma migrate dev --name what_changed
git add prisma/migrations && git commit && git push
# Then deploy — deploy.sh runs `migrate deploy` for you
```

**Never** run `prisma migrate dev` or `prisma db push` against production.
`migrate dev` can drop data. `deploy.sh` uses `migrate deploy`, which only
applies committed migrations and never resets.

**Phase 2 rule (DPR §0.3):** Phase 2 migrations must be additive. No migration
may drop or rename a Phase 1 column.

---

## 7. Backups, and restoring one

A nightly cron writes a `pg_dump` and an uploads tarball to
`/var/staysutra/backups`, keeps 14 days on disk, and copies weekly to the
client's Google Drive.

```cron
0 3 * * * /opt/staysutra/scripts/backup.sh >> /var/log/staysutra-backup.log 2>&1
```

### Restoring

```bash
cd /opt/staysutra
docker compose stop app                       # stop writes first

gunzip -c /var/staysutra/backups/db-2026-09-03.sql.gz \
  | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

tar -xzf /var/staysutra/backups/uploads-2026-09-03.tar.gz -C /

docker compose start app
curl -f https://<domain>/api/health
```

**An untested backup is not a backup.** A restore is performed and verified once
before handover, and the result is in the handover pack. Repeat it once a quarter.

---

## 8. Staging vs production

Staging sits at `staging.<domain>` behind HTTP basic auth and sends
`X-Robots-Tag: noindex, nofollow` on every response. Both guards are in the
`Caddyfile` and both are non-negotiable — an indexed staging copy is a
duplicate-content problem that takes weeks to unwind.

There is a **third** guard in code. `app/robots.ts` returns `Disallow: /` unless
`NEXT_PUBLIC_SITE_URL` is set and contains neither `staging.` nor `localhost`.
Consequence worth knowing: **if you forget `NEXT_PUBLIC_SITE_URL` in production,
the whole site is disallowed from crawling.** That failure is deliberate — it is
the safe direction to fail in. Check `https://<domain>/robots.txt` after any
deploy that touched environment variables.

---

## 9. Common tasks

### Add a property (before the dashboard exists)

Edit `content/properties.json`, then commit and deploy. After Phase 2, use the
dashboard instead — do not edit the JSON once the database is authoritative.

Ratings: leave `ratingValue` and `ratingCount` as `null` unless you have a real
value. The UI hides the element entirely when they are null, and the JSON-LD
omits `aggregateRating`. Publishing an invented rating is a manual-action risk
with Google and is prohibited by the DPR.

### Change the WhatsApp number

`NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env`, then recreate the app container. Every
deep link on the site is generated from it.

### Change a colour, a font size, or the spacing rhythm

`app/globals.css`. Every token is defined there once and nowhere else. **No
component uses a raw hex value** — keep it that way, or the design system stops
being a system.

### Turn the announcement bar on

Phase 2, from Site Settings. It is off by default.

### Check what content is still a placeholder

`docs/CONTENT-GAPS.md`. Every developer-drafted record is listed with what is
needed to close it.

---

## 10. Design and motion rules that are load-bearing

Read `docs/StaySutra_DPR.md` §4 before changing anything visual. In particular:

- **Gold appears on at most three elements per viewport.** Primary CTA, one
  active state, one data highlight. A fourth means one of the three is wrong.
- **Never stack glass on glass.** A glass modal over the glass header means one
  of them becomes solid.
- **Feedback on pointer-down, not on release.** Every button and card carries
  the `.press` class for this reason.
- **Two pinned scroll moments on the whole site** — the homepage "Made for the
  Road" pillars and the property gallery. More reads as a scroll-jacking demo.
- **Reveals are applied at section and group level, never per element.** Ten
  staggered reveals per screen is the single most common way a site announces it
  was generated rather than designed.
- **`prefers-reduced-motion`, `prefers-reduced-transparency` and
  `prefers-contrast` are all honoured** and are tested as part of QA. Reduced
  motion is not "no feedback" — it is a gentler, non-vestibular equivalent.
- **No emoji as icons, ever.** One SVG set, `components/primitives/Icon.tsx`,
  24px grid, 1.5px stroke.

If an animation costs a performance budget, **the budget wins**.

---

## 11. Performance budgets

Enforced on mobile, throttled 4G, Moto G-class device.

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
| Largest single image | < 250 KB |

Check the homepage JS figure in the `next build` output before every release.

---

## 12. Troubleshooting

| Symptom | Look here |
|---|---|
| Site down | `docker compose ps`, `docker compose logs app --tail 100` |
| 502 from Caddy | The app container is unhealthy. `docker compose logs app` |
| TLS certificate not renewing | `docker compose logs caddy`. Ports 80 and 443 must be open — Let's Encrypt validates over 80 |
| Deploy failed | `deploy.sh` rolled back. Check its output, fix, re-run |
| Enquiries not arriving by email | Check `RESEND_API_KEY` and the SPF/DKIM records. **The enquiry is still saved** — email failure never fails a submission |
| Images not loading | `ls -la /var/staysutra/uploads`, and check the bind mount in `docker-compose.yml` |
| Disk full | `docker system prune -a`, and check `/var/staysutra/backups` rotation |
| Everything deindexed | `curl https://<domain>/robots.txt` — see §8 |

---

## 13. Support

Two months from handover sign-off, per Plan B: bug fixes, small changes,
priority WhatsApp response, two Search Console health checks, one refresher
training call.

After that, optional and never required for the site to keep running: ₹4,999/month
retainer, cancel any time, or ad-hoc per request.

**Kedar Gurav** — Web Developer
+91 88058 95066 · kgurav678@gmail.com · Viman Nagar, Pune
