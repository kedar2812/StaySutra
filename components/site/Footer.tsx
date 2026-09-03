import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { Icon } from "@/components/primitives/Icon";
import { Rule } from "@/components/primitives/Rule";
import { destinations, siteContent, countIn } from "@/lib/content";
import { settings, brand } from "@/lib/site";

/**
 * Four columns: brand, then three link groups, with Destinations generated from
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
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-sm">
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
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="press-sm inline-block py-1 text-[0.9375rem] text-text-low transition-colors hover:text-text-hi"
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
          <ul className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/destinations/${d.slug}`}
                  className="press-sm group inline-flex items-baseline gap-2 text-[0.9375rem] text-text-low transition-colors hover:text-text-hi"
                >
                  {d.name}
                  <span className="t-caption tabular-nums text-text-low">
                    {countIn(d.slug)}
                  </span>
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
          <ul className="flex items-center gap-6">
            {siteContent.footer.legal.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="t-caption transition-colors hover:text-text-hi"
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
