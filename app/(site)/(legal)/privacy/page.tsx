import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { Prose } from "@/components/site/Prose";
import { parseProse } from "@/lib/prose";
import { pageMeta } from "@/lib/seo";
import { brand, settings } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description:
    "What personal data StaySutra collects through this website, why, how long it is kept, and how to have it removed.",
  path: "/privacy",
});

/**
 * Structure and page provided; the client supplies the final text (DPR §7.12,
 * §16). What is here describes what this build actually does with personal data
 * — the forms, the retention, the third parties — so the page is accurate and
 * lawful from launch rather than a placeholder. Flagged in docs/CONTENT-GAPS.md
 * for the client's legal review.
 */
const body = `
This policy explains what personal information ${brand.name} collects through
this website, why we collect it, and what you can ask us to do with it. It is
written to describe what the site actually does. If anything here does not match
your experience, write to us and we will correct it.

## What we collect

We only collect what a form asks for:

- **Enquiry forms** (on a stay, a destination, or the contact page): your name,
  mobile number, and optionally your email address, your dates, your group size
  and your message.
- **Property submissions** (the *List your property* form): your name, mobile
  number, email address, the property's details, the photographs you upload and
  the ownership documents you upload.
- **Interest forms** for features that are not live yet: your name and mobile
  number.

Alongside each submission we store the page it came from, the referral
parameters in the link you arrived by, your browser's user-agent string and your
IP address. These are used to answer support questions and to detect abuse of
the forms.

We do not ask for payment details anywhere on this site, and there is no way to
enter them.

## Why we collect it

To reply to you, and for nothing else. Specifically:

- To answer your enquiry and confirm availability, usually over WhatsApp
- To review a property submission and come back to you about it
- To tell you once when a feature you asked about goes live
- To keep the forms working and free of automated abuse

We do not sell personal information, and we do not share it with advertisers.

## Uploaded documents

Ownership documents submitted through the *List your property* form are stored
outside the public area of the server and are never published, indexed or shared.
They are visible only to ${brand.name} staff reviewing the submission, and are
deleted once the review is complete or on your request.

## Cookies and analytics

This site sets no advertising cookies and shows no third-party ad tags.

Your shortlist (the heart control on a stay) is stored in your own browser using
local storage. It never reaches our servers and is not linked to you.

Where Google Analytics is enabled, it records anonymous usage of the site —
pages viewed, and which pages produce enquiries. It is configured without
advertising features. Your browser's *Do Not Track* and any content blocker will
prevent it loading.

## Who else sees your data

Only the services required to run the site:

- **Our own server**, where the site and the database live
- **Our email provider**, to deliver the notification and confirmation emails
- **Cloudflare Turnstile**, which checks that a form submission is not automated
- **Google Analytics**, if enabled, for anonymous usage statistics
- **WhatsApp**, when you choose to continue a conversation there — that
  conversation is governed by WhatsApp's own terms, not this policy

## How long we keep it

Enquiries are kept for as long as they are commercially useful and reviewed
periodically. Property submissions are kept while the listing relationship
lasts. Uploaded documents are deleted after review unless we need them for an
active listing.

## Your rights

Write to [${settings.email}](mailto:${settings.email}) and we will, without
charge:

- Tell you what we hold about you
- Correct anything that is wrong
- Delete it, unless we are required to keep it
- Send you a copy in a portable format

We reply to these requests within thirty days, usually much sooner.

## Children

This site is not intended for anyone under 18, and we do not knowingly collect
information from children.

## Changes

If this policy changes we will update this page and the date below. Material
changes will be flagged on the site.

## Contact

${brand.name}, ${settings.officeLocality}
Email: [${settings.email}](mailto:${settings.email})
Phone: ${settings.phone}
`;

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        overline="Legal"
        title="Privacy policy"
        seed="legal-privacy"
        scene="city"
        mood="night"
        size="sm"
        trail={[
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
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
