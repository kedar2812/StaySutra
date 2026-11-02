# Multi-stage build producing a Next standalone server on a distroless-ish base.
# DPR §3.1, §14.1

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ── build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Next inlines NEXT_PUBLIC_* at build time, so they must exist here, not only
# at runtime. Without NEXT_PUBLIC_SITE_URL, robots.txt disallows the whole site.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=""
ARG NEXT_PUBLIC_GA4_ID=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID
RUN npx prisma generate
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations, the schema and the seed travel with the image so `prisma migrate
# deploy` in the deploy script has everything it needs.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Story bodies are read from disk at request time.
COPY --from=builder /app/content ./content

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
