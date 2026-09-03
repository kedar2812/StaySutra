import Link from "next/link";
import { PropertyCard } from "./PropertyCard";
import { EmptyState } from "./EmptyState";
import { Icon } from "@/components/primitives/Icon";
import { ButtonLink } from "@/components/primitives/Button";
import { applyFilters, loosenSuggestions, PER_PAGE, toQuery, type Filters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import type { PropertyView } from "@/lib/types";

/**
 * The result grid. Server-rendered on first load and on every filter change, so
 * a filtered view is crawlable and the back button is correct. DPR §6.3
 */
export function PropertyResults({
  filters,
  pool,
  basePath = "/stays",
  heading = "Search results",
}: {
  filters: Filters;
  pool?: PropertyView[];
  basePath?: string;
  /** Names the region for assistive tech and keeps the heading outline whole. */
  heading?: string;
}) {
  const all = applyFilters(filters, pool);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(filters.page, pages);
  const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!all.length) {
    const loosen = loosenSuggestions(filters);
    return (
      <EmptyState
        className="mt-10"
        title="No stays match all of those yet"
        body={
          loosen.length
            ? `Try loosening ${loosen.map((l) => l.label).join(" or ")} — we are onboarding new properties every week.`
            : "We are onboarding new properties every week. Tell us what you are after and we will find it."
        }
        waMessage="Hi StaySutra, I'm looking for a stay and the filters came up empty. Can you help?"
        actions={
          <ButtonLink href={basePath} variant="quiet">
            Clear all filters
          </ButtonLink>
        }
      />
    );
  }

  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading" className="sr-only">
        {heading}
      </h2>
      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <PropertyCard key={p.slug} property={p} priority={i < 3} />
        ))}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
          <PageLink
            basePath={basePath}
            filters={filters}
            page={page - 1}
            disabled={page === 1}
            label="Previous page"
            icon="arrowLeft"
          />
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href(basePath, filters, n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "press grid size-11 place-items-center rounded-pill text-[0.9375rem] tabular-nums transition-colors",
                n === page
                  ? "bg-gold-500 text-gold-ink"
                  : "border border-[color:var(--hairline)] text-text-mid hover:text-text-hi",
              )}
            >
              {n}
            </Link>
          ))}
          <PageLink
            basePath={basePath}
            filters={filters}
            page={page + 1}
            disabled={page === pages}
            label="Next page"
            icon="arrowRight"
          />
        </nav>
      )}
    </section>
  );
}

function href(basePath: string, filters: Filters, page: number): string {
  const q = toQuery({ ...filters, page });
  return q ? `${basePath}?${q}` : basePath;
}

function PageLink({
  basePath,
  filters,
  page,
  disabled,
  label,
  icon,
}: {
  basePath: string;
  filters: Filters;
  page: number;
  disabled: boolean;
  label: string;
  icon: "arrowLeft" | "arrowRight";
}) {
  if (disabled) {
    return (
      <span
        aria-hidden
        className="grid size-11 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-low opacity-40"
      >
        <Icon name={icon} size={17} />
      </span>
    );
  }
  return (
    <Link
      href={href(basePath, filters, page)}
      aria-label={label}
      rel={icon === "arrowRight" ? "next" : "prev"}
      className="press grid size-11 place-items-center rounded-pill border border-[color:var(--hairline)] text-text-mid transition-colors hover:text-text-hi"
    >
      <Icon name={icon} size={17} />
    </Link>
  );
}
