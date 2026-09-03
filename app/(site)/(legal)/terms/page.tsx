import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Prose } from "@/components/site/Prose";
import { parseProse } from "@/lib/prose";
import { pageMeta } from "@/lib/seo";
import { brand, settings } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Terms of use",
  description:
    "The terms on which you use the StaySutra website, submit an enquiry, or submit a property for listing.",
  path: "/terms",
});

/**
 * Structure and page provided; final text is client-supplied and needs their
 * legal review before launch (DPR §7.12, §16). What is here reflects how the
 * site actually behaves — in particular that no booking or payment happens on
 * it — so nothing on the page overstates what a visitor is agreeing to.
 * Flagged in docs/CONTENT-GAPS.md.
 */
const body = `
These terms apply to your use of this website. By using it, submitting an
enquiry, or submitting a property, you accept them.

## What this site does

${brand.name} lists stays and passes your enquiry to the property. **This site
is not a booking engine.** Nothing you do here reserves a room, holds a date, or
takes a payment.

Specifically:

- Prices shown are indicative starting rates, not quotations
- Dates and group sizes you enter narrow the listings; they do not check
  availability
- Availability, the final rate and the terms of your stay are confirmed by us
  directly, normally over WhatsApp, before anything is committed
- No contract for accommodation is formed by submitting a form on this site

## Listing information

We visit the properties we list and describe them as accurately as we can,
including the rider facilities each one does and does not have. Details can
change without our knowledge — a facility withdrawn, a rate revised, a road
closed. Confirm anything that matters to your trip with us before you travel.

Where a rating is shown, it reflects real feedback. Where no rating is shown,
none has been collected. We do not publish invented ratings, reviews or
statistics.

## Your enquiry

When you submit an enquiry you confirm that the contact details you give are
yours and are accurate. We use them to reply to you and for nothing else — see
the [privacy policy](/privacy).

We may decline to act on an enquiry that appears automated, abusive, or made in
bad faith.

## Submitting a property

When you submit a property through the *List your property* form you confirm
that:

- You own the property, or you are authorised by the owner to list it
- The details and photographs you provide are accurate and are yours to share
- The ownership documents you upload are genuine

Submitting a property does not create any obligation on either side. We review
every submission and may decline one without giving a reason. If we proceed, the
commercial terms are set out in a separate written agreement — not by these
terms.

Documents you upload are handled as described in the [privacy
policy](/privacy): stored privately, never published, and deleted after review
unless needed for an active listing.

## Your stay

Your stay is between you and the property. Its house rules, check-in and
check-out times, cancellation terms and conduct policies apply, and we will tell
you what they are before you commit. ${brand.name} is not the provider of the
accommodation.

## Riding

The route notes, road conditions, seasonal advice and distances published on this
site are provided in good faith for planning. Roads change, weather changes, and
conditions on the day are yours to assess. Riding decisions are your own, and
${brand.name} accepts no liability for them. Ride within the law and within your
ability.

## Content on this site

The text, photographs, icons and design on this site belong to ${brand.name} or
to the property owners who supplied them. You may share links freely. You may
not copy the content for commercial use without permission.

## Availability of the site

We try to keep the site up and correct. We do not guarantee it will be available
without interruption, and we may change or remove any part of it.

## Liability

Nothing in these terms limits liability where the law does not allow it to be
limited. Otherwise, our liability arising from your use of this website is
limited to the direct loss you can show, and we are not liable for indirect or
consequential loss.

## Changes to these terms

We may update these terms. The current version is always the one on this page,
with the date below.

## Governing law

These terms are governed by the laws of India, and the courts at Pune,
Maharashtra have jurisdiction.

## Contact

${brand.name}, ${settings.officeLocality}
Email: [${settings.email}](mailto:${settings.email})
Phone: ${settings.phone}
`;

export default function TermsPage() {
  return (
    <>
      <PageHero
        overline="Legal"
        title="Terms of use"
        seed="legal-terms"
        scene="city"
        mood="dusk"
        size="sm"
        trail={[
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms" },
        ]}
      />
      <div className="shell pb-24 lg:pb-32">
        <Prose blocks={parseProse(body)} />
        <p className="t-caption mt-16 max-w-[68ch] border-t border-[color:var(--hairline)] pt-6">
          Last updated 3 September 2026.
        </p>
      </div>
    </>
  );
}
