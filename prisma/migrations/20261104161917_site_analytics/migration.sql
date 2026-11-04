-- CreateEnum
CREATE TYPE "HitKind" AS ENUM ('PAGEVIEW', 'WHATSAPP', 'ENQUIRY');

-- CreateTable
CREATE TABLE "SiteHit" (
    "id" TEXT NOT NULL,
    "kind" "HitKind" NOT NULL DEFAULT 'PAGEVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "propertyId" TEXT,
    "destination" TEXT,
    "source" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "device" TEXT NOT NULL,
    "browser" TEXT,
    "os" TEXT,
    "seconds" INTEGER,

    CONSTRAINT "SiteHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteHit_createdAt_idx" ON "SiteHit"("createdAt");

-- CreateIndex
CREATE INDEX "SiteHit_kind_createdAt_idx" ON "SiteHit"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SiteHit_visitor_createdAt_idx" ON "SiteHit"("visitor", "createdAt");

-- CreateIndex
CREATE INDEX "SiteHit_propertyId_createdAt_idx" ON "SiteHit"("propertyId", "createdAt");
