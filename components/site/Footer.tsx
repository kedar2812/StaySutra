import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { destinations, siteContent } from "@/lib/content";
import { settings, brand } from "@/lib/site";

/**
 * Brand, then the link groups (now four — Ride was split out when the Rider
 * Passport got its own page), with Destinations generated from
 * content rather than hardcoded — a seventh destination added in Phase 2 appears
 * here on its own. Every link goes somewhere real; the reference's Careers,
 * Owner Login, Resources and Partner Program are omitted rather than faked.
 * DPR §7.1 (flagged in docs/CONTENT-GAPS.md).
 */
export function Footer() {
  const columns = siteContent.footer.columns;

  return (
    <footer className="relative border-t border-[color:var(--hairline)] bg-ink-900">
      <div className="shell py-16 lg:py-24">
        {/* Two link columns side by side on a phone — stacked one per row, the
            footer alone ran a screen and a half. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div className="col-span-2 max-w-sm lg:col-span-1">
            <Wordmark size="md" />
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-text-low">
              {brand.positioning}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <a
                href={settings.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${brand.name} on Instagram`}
                className="press grid size-11 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low transition-colors hover:border-[color:var(--hairline-str)] hover:text-text-hi"
              >
                <Icon name="instagram" size={18} />
              </a>
              <a
                href={`mailto:${settings.email}`}
                aria-label={`Email ${brand.name}`}
                className="press grid size-11 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low transition-colors hover:border-[color:var(--hairline-str)] hover:text-text-hi"
              >
                <Icon name="mail" size={18} />
              </a>
              <a
                href={`tel:${settings.phone.replace(/\s/g, "")}`}
                aria-label={`Call ${brand.name}`}
                className="press grid size-11 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low transition-colors hover:border-[color:var(--hairline-str)] hover:text-text-hi"
              >
                <Icon name="phone" size={18} />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="t-caption uppercase tracking-[0.2em] text-text-hi">
                {col.title}
              </h2>
              <Rule className="mt-4" />
              <ul className="mt-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="press-sm inline-flex min-h-11 items-center text-[0.9375rem] text-text-mid transition-colors hover:text-text-hi"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="t-caption uppercase tracking-[0.2em] text-text-hi">
            Destinations
          </h2>
          <Rule className="mt-4" />
          <ul className="mt-2 flex flex-wrap gap-x-7">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/destinations/${d.slug}`}
                  className="press-sm inline-flex min-h-11 items-center text-[0.9375rem] text-text-mid transition-colors hover:text-text-hi"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[color:var(--hairline)]">
        <div className="shell flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-caption">
            © {new Date().getFullYear()} {brand.name}. {settings.officeLocality}.
          </p>
          <ul className="-my-3 flex items-center gap-6">
            {siteContent.footer.legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="t-caption inline-flex min-h-11 items-center transition-colors hover:text-text-hi"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
