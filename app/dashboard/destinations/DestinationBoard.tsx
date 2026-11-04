"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, FadeImage, Field, Input, PageHeader, PhotoBadge, SaveButton, Switch, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { Sheet } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { MediaPicker, type Picked } from "@/components/admin/media-picker";
import { archiveDestination, saveDestination } from "./actions";

type Photo = Picked | null;
export interface Dest {
  id: string;
  name: string;
  slug: string;
  state: string;
  shortIntro: string;
  description: string;
  bestSeason: string;
  rideNote: string;
  roadNote: string;
  isFeatured: boolean;
  sortOrder: number;
  tile: Photo;
  hero: Photo;
  stays: number;
}

const BLANK: Omit<Dest, "id" | "stays"> = { name: "", slug: "", state: "Maharashtra", shortIntro: "", description: "", bestSeason: "", rideNote: "", roadNote: "", isFeatured: false, sortOrder: 99, tile: null, hero: null };

/** Each destination is a page on the website — add a place and its page exists. */
export function DestinationBoard({ destinations }: { destinations: Dest[] }) {
  const [editing, setEditing] = useState<Dest | "new" | null>(null);
  return (
    <>
      <PageHeader
        title="Destinations"
        description="Each one is a page on the website. Add a place and its page exists — with its stays, its road notes and its season."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing("new")}>
            New destination
          </Button>
        }
      />
      {destinations.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((d) => (
            <button key={d.id} type="button" onClick={() => setEditing(d)} className="group overflow-hidden rounded-[22px] bg-panel text-left shadow-tile transition-[box-shadow,transform] duration-300 hover:shadow-pop active:scale-[0.985]">
              <div className="relative aspect-[16/10] overflow-hidden bg-fill-2">
                {d.tile && <FadeImage src={d.tile.src} alt={d.tile.alt} fill sizes="(min-width:1280px) 30vw, 45vw" className="object-cover transition-transform duration-[900ms] ease-[var(--ease-emph)] group-hover:scale-[1.05]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute right-3 top-3">
                  <PhotoBadge tone={d.stays ? "ok" : "neutral"} dot>
                    {d.stays ? `${d.stays} live` : "Opening soon"}
                  </PhotoBadge>
                </div>
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <p className="text-footnote font-medium text-white/75">{d.state}</p>
                  <p className="text-title text-white">{d.name}</p>
                </div>
              </div>
              <p className="line-clamp-2 px-4 py-3.5 text-subhead leading-relaxed text-fg-2">{d.shortIntro || "No introduction yet."}</p>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon="map" title="No destinations yet" body="Add a place — its page on the website is created the moment you save." action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>New destination</Button>} />
        </Card>
      )}
      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New destination" : editing?.name}
        subtitle={editing && editing !== "new" ? `staysutra.in/destinations/${editing.slug}` : "Its page is created when you save"}
      >
        {editing && <DestForm key={editing === "new" ? "new" : editing.id} dest={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function DestForm({ dest, onDone }: { dest: Dest | null; onDone: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [d, setD] = useState(dest ?? { ...BLANK, id: "", stays: 0 });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<"tile" | "hero" | null>(null);
  const set = <K extends keyof Dest>(k: K, v: Dest[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const dirty = JSON.stringify(d) !== JSON.stringify(dest ?? { ...BLANK, id: "", stays: 0 });

  const save = async () => {
    setBusy(true);
    const res = await saveDestination({ ...d, id: dest?.id, tileMediaId: d.tile?.id ?? null, heroMediaId: d.hero?.id ?? null });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      return toast({ kind: "error", title: res.error });
    }
    toast({ title: dest ? "Saved" : `${d.name} is live`, body: `staysutra.in/destinations/${res.data.slug}` });
    onDone();
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {(["tile", "hero"] as const).map((k) => (
          <div key={k}>
            <p className="mb-1.5 px-0.5 text-subhead font-medium text-fg-2">{k === "tile" ? "Tile photo" : "Page header photo"}</p>
            <button type="button" onClick={() => setPicking(k)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-fill-2 shadow-[inset_0_0_0_1px_var(--d-line-2)]">
              {d[k] ? (
                <FadeImage src={d[k]!.src} alt="" fill sizes="240px" className="object-cover" />
              ) : (
                <span className="grid size-full place-items-center text-fg-3">
                  <AdminIcon name="imagePlus" size={22} />
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                <span className="rounded-full bg-white/95 px-3 py-1 text-footnote font-semibold text-black">Choose</span>
              </span>
            </button>
            {d[k] && (
              <button type="button" onClick={() => set(k, null)} className="mt-1.5 px-0.5 text-footnote font-semibold text-accent-text hover:opacity-80">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <Input
            value={d.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!dest) set("slug", e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
            }}
          />
        </Field>
        <Field label="State" error={errors.state}>
          <Input value={d.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
      </div>
      <Field label="Web address" hint={`staysutra.in/destinations/${d.slug || "…"}`} error={errors.slug}>
        <Input value={d.slug} onChange={(e) => set("slug", e.target.value)} />
      </Field>
      <Field label="In one sentence" count={d.shortIntro.length} max={200} error={errors.shortIntro}>
        <Textarea value={d.shortIntro} onChange={(e) => set("shortIntro", e.target.value)} className="min-h-[4.5rem]" />
      </Field>
      <Field label="About the place" count={d.description.length} max={3000} error={errors.description}>
        <Textarea value={d.description} onChange={(e) => set("description", e.target.value)} className="min-h-[9rem]" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Best season">
          <Input value={d.bestSeason} onChange={(e) => set("bestSeason", e.target.value)} placeholder="October to February" />
        </Field>
        <Field label="Order on the site">
          <Input type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
        </Field>
      </div>
      <Field label="The road there" count={d.roadNote.length} max={400}>
        <Textarea value={d.roadNote} onChange={(e) => set("roadNote", e.target.value)} className="min-h-[4.5rem]" />
      </Field>
      <Field label="Riding note" count={d.rideNote.length} max={400}>
        <Textarea value={d.rideNote} onChange={(e) => set("rideNote", e.target.value)} className="min-h-[4.5rem]" />
      </Field>
      <Switch checked={d.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" description="Listed first wherever destinations are shown." />

      <div className="flex gap-2 border-t border-line pt-5">
        {dest && (
          <Button
            variant="danger"
            icon="trash"
            onClick={async () => {
              const res = await archiveDestination(dest.id);
              if (!res.ok) return toast({ kind: "error", title: "Not removed", body: res.error });
              onDone();
              router.refresh();
              toast({
                title: `${dest.name} removed`,
                undo: async () => {
                  await archiveDestination(dest.id, true);
                  router.refresh();
                },
              });
            }}
          >
            Remove
          </Button>
        )}
        <SaveButton saving={busy} dirty={dirty || !dest} onClick={save} label={dest ? "Save" : "Create page"} className="flex-1" />
      </div>
      <MediaPicker open={Boolean(picking)} onClose={() => setPicking(null)} onPick={([m]) => m && picking && set(picking, m)} folder="Destinations" />
    </div>
  );
}
