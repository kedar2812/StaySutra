"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Badge, Button, Card, EmptyState, FadeImage, Field, Input, PageHeader, PhotoBadge, Segmented, Spinner, type Tone } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { Sheet } from "@/components/admin/sheet";
import { cn } from "@/lib/utils";
import { createProperty } from "./actions";

export interface BoardProperty {
  id: string;
  name: string;
  slug: string;
  status: "PUBLISHED" | "DRAFT" | "UNPUBLISHED" | "ARCHIVED";
  featured: boolean;
  riderFriendly: boolean;
  category: string;
  destination: string;
  city: string;
  maxGuests: number;
  bedrooms: number;
  photos: number;
  enquiries: number;
  price: string | null;
  cover: string | null;
  updatedAt: string;
}

const STATUS: Record<BoardProperty["status"], { tone: Tone; label: string }> = {
  PUBLISHED: { tone: "ok", label: "Live" },
  DRAFT: { tone: "neutral", label: "Draft" },
  UNPUBLISHED: { tone: "warn", label: "Offline" },
  ARCHIVED: { tone: "neutral", label: "Archived" },
};

type Filter = "all" | "live" | "drafts";
const VIEW_KEY = "ss.properties.view";

/**
 * Every stay, as the guest will see it first — the cover photo — with what
 * still needs doing written on the card. Search, a filter, and a grid or a
 * compact list, remembered per browser.
 */
export function PropertyBoard({ properties, canCreate, openNew }: { properties: BoardProperty[]; canCreate: boolean; openNew: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState(openNew);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "grid") setView(v);
    } catch {}
  }, []);
  useEffect(() => setCreating(openNew), [openNew]);

  const changeView = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const live = properties.filter((p) => p.status === "PUBLISHED").length;
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return properties.filter(
      (p) =>
        (filter === "all" || (filter === "live" ? p.status === "PUBLISHED" : p.status !== "PUBLISHED")) &&
        (!n || `${p.name} ${p.destination} ${p.city} ${p.category}`.toLowerCase().includes(n)),
    );
  }, [properties, filter, q]);

  const closeNew = () => {
    setCreating(false);
    if (openNew) router.replace("/dashboard/properties", { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Properties"
        description="Everything a guest sees on a stay’s page is edited here."
        actions={
          canCreate && (
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
              New property
            </Button>
          )
        }
      />

      {properties.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Segmented
            id="property-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: properties.length },
              { value: "live", label: "Live", count: live },
              { value: "drafts", label: "Not live", count: properties.length - live },
            ]}
          />
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <div className="flex-1 sm:max-w-72">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search properties" leading={<AdminIcon name="search" size={15} />} aria-label="Search properties" />
            </div>
            <Segmented
              id="property-view"
              value={view}
              onChange={changeView}
              options={[
                { value: "grid", label: "", icon: "grid" },
                { value: "list", label: "", icon: "rows" },
              ]}
            />
          </div>
        </div>
      )}

      {!properties.length ? (
        <Card>
          <EmptyState
            icon="properties"
            title="No properties yet"
            body="Give the first one a name. You can fill in the rest as you go — nothing goes live until you publish it."
            action={canCreate && <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New property</Button>}
          />
        </Card>
      ) : !shown.length ? (
        <Card>
          <EmptyState icon="search" title="Nothing matches" body="Try another word, or clear the filter." action={<Button variant="secondary" onClick={() => { setQ(""); setFilter("all"); }}>Show all</Button>} />
        </Card>
      ) : view === "grid" ? (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {shown.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: "spring", bounce: 0, duration: 0.35, delay: Math.min(i, 8) * 0.03 }}>
                <PropertyCard p={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.id}>
                <PropertyRow p={p} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={creating} onClose={closeNew} title="New property" subtitle="Start with its name — the rest can come later" width={460}>
        {creating && <NewPropertyForm onCancel={closeNew} />}
      </Sheet>
    </>
  );
}

function todo(p: BoardProperty): string | null {
  if (p.status === "PUBLISHED") return null;
  if (!p.photos) return "Add photos";
  if (!p.price) return "Ready to publish once priced";
  return "Ready to publish";
}

function PropertyCard({ p }: { p: BoardProperty }) {
  const s = STATUS[p.status];
  const next = todo(p);
  return (
    <Link href={`/dashboard/properties/${p.id}`} className="group block overflow-hidden rounded-[22px] bg-panel shadow-tile transition-[box-shadow,transform] duration-300 ease-out hover:shadow-pop active:scale-[0.985]">
      <div className="relative aspect-[3/2] overflow-hidden bg-fill-2">
        {p.cover ? (
          <FadeImage src={p.cover} alt="" fill sizes="(min-width:1280px) 30vw, (min-width:640px) 45vw, 100vw" className="object-cover transition-transform duration-[900ms] ease-[var(--ease-emph)] group-hover:scale-[1.04]" />
        ) : (
          <div className="grid size-full place-items-center text-fg-4">
            <AdminIcon name="image" size={32} strokeWidth={1.3} />
          </div>
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <PhotoBadge tone={s.tone} dot>
            {s.label}
          </PhotoBadge>
          {p.featured && (
            <PhotoBadge tone="gold">
              <AdminIcon name="star" size={11} strokeWidth={2.2} /> Featured
            </PhotoBadge>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-headline text-fg">{p.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-subhead text-fg-3">
              <AdminIcon name="pin" size={13} className="shrink-0" />
              <span className="truncate">{p.destination}</span>
              <span className="text-fg-4">—</span>
              <span className="truncate">{p.category}</span>
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-callout font-semibold text-fg">{p.price ?? "—"}</span>
            <span className="block text-caption text-fg-3">{p.price ? "per night" : "No price"}</span>
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-footnote font-medium text-fg-3">
          <Fact icon="users" value={p.maxGuests} label="guests" />
          <Fact icon="image" value={p.photos} label="photos" />
          <Fact icon="inbox" value={p.enquiries} label="enquiries" />
          {next && (
            <span className="ml-auto flex items-center gap-1 truncate text-accent-text">
              <AdminIcon name="sparkle" size={12} />
              {next}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Fact({ icon, value, label }: { icon: "users" | "image" | "inbox"; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1 tabular-nums" title={`${value} ${label}`}>
      <AdminIcon name={icon} size={14} />
      {value}
    </span>
  );
}

function PropertyRow({ p }: { p: BoardProperty }) {
  const s = STATUS[p.status];
  return (
    <Link href={`/dashboard/properties/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-fill sm:px-5">
      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[10px] bg-fill-2">
        {p.cover && <FadeImage src={p.cover} alt="" fill sizes="64px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-callout font-semibold text-fg">{p.name}</span>
        <span className="block truncate text-subhead text-fg-3">
          {p.destination} — {p.category}
        </span>
      </span>
      <span className="hidden w-24 text-right text-subhead tabular-nums text-fg-2 md:block">{p.price ?? "No price"}</span>
      <span className="hidden w-28 text-right text-subhead tabular-nums text-fg-3 lg:block">
        {p.photos} photos · {p.maxGuests} guests
      </span>
      <span className="w-20 text-right">
        <Badge tone={s.tone} dot>
          {s.label}
        </Badge>
      </span>
      <AdminIcon name="chevronRight" size={16} className="shrink-0 text-fg-4" />
    </Link>
  );
}

function NewPropertyForm({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <form action={createProperty} className="space-y-5">
      <Field label="Name" hint="As guests will see it — you can change it any time." count={name.length} max={80}>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kashele Farmhouse" autoFocus maxLength={80} />
      </Field>
      <div className="rounded-[16px] bg-fill p-4 text-subhead leading-relaxed text-fg-2">
        It starts as a draft. Add photos, a description and a price, then publish it from its page — nothing reaches the website before that.
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <CreateButton disabled={!name.trim()} />
      </div>
    </form>
  );
}

function CreateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className={cn("flex-1")} disabled={disabled || pending}>
      {pending ? <Spinner size={15} /> : null}
      {pending ? "Creating" : "Create and edit"}
    </Button>
  );
}
