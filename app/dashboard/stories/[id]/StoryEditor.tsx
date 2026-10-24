"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ButtonLink, Card, Field, Input, Segmented, Select, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/toast";
import { MediaPicker, type Picked } from "@/components/admin/media-picker";
import { Prose } from "@/components/site/Prose";
import { parseProse } from "@/lib/prose";
import { cn } from "@/lib/utils";
import { deleteStory, saveStory, setStoryStatus } from "../actions";

interface Draft {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  categoryId: string | null;
  destinationSlugs: string[];
  authorName: string;
  cover: Picked | null;
  metaTitle: string;
  metaDescription: string;
}

/**
 * The story editor: plain writing with a small toolbar for the few marks the
 * article template supports, and a live preview drawn by the same component
 * the website uses — so what you see is what readers get. ⌘S saves.
 */
export function StoryEditor({ initial, status: initialStatus, categories, destinations }: { initial: Draft; status: string; categories: { id: string; name: string }[]; destinations: { slug: string; name: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [status, setStatus] = useState(initialStatus);
  const [view, setView] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(d) !== saved;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const blocks = useMemo(() => parseProse(d.body || ""), [d.body]);

  const save = async () => {
    setBusy(true);
    const res = await saveStory({ ...d, coverMediaId: d.cover?.id ?? null });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      return toast({ kind: "error", title: res.error, body: Object.values(res.fields ?? {})[0] });
    }
    setErrors({});
    setSaved(JSON.stringify(d));
    toast({ title: "Saved", body: `${res.data.readMinutes} min read` });
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  /** Wraps the selection, or prefixes the current line, like any writing app. */
  const format = (kind: "h2" | "h3" | "bold" | "italic" | "list" | "quote" | "link") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b);
    let next = value;
    let caret = b;
    if (kind === "bold" || kind === "italic") {
      const m = kind === "bold" ? "**" : "*";
      next = value.slice(0, a) + m + (sel || "text") + m + value.slice(b);
      caret = b + m.length * 2 + (sel ? 0 : 4);
    } else if (kind === "link") {
      next = value.slice(0, a) + `[${sel || "link text"}](https://)` + value.slice(b);
      caret = a + (sel || "link text").length + 3;
    } else {
      const lineStart = value.lastIndexOf("\n", a - 1) + 1;
      const prefix = { h2: "## ", h3: "### ", list: "- ", quote: "> " }[kind];
      next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      caret = b + prefix.length;
    }
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b border-white/[0.06] bg-ink-900/85 px-4 py-3 backdrop-blur-xl sm:top-16 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-[1.25rem] tracking-[-0.02em] text-text-hi sm:text-[1.5rem]" style={{ fontWeight: 800 }}>{d.title || "Untitled"}</h1>
              <Badge tone={status === "PUBLISHED" ? "ok" : "neutral"} dot>{status === "PUBLISHED" ? "Live" : "Draft"}</Badge>
            </div>
            <p className={cn("mt-0.5 text-[0.8125rem]", dirty ? "text-warn" : "text-text-low")}>{dirty ? "Unsaved changes · ⌘S to save" : "All changes saved"}</p>
          </div>
          <div className="flex items-center gap-2">
            {status === "PUBLISHED" && <ButtonLink href={`/stories/${initial.slug}`} external variant="ghost" icon="external">View</ButtonLink>}
            <Button
              onClick={async () => {
                if (dirty) await save();
                const publish = status !== "PUBLISHED";
                const res = await setStoryStatus(d.id, publish);
                if (!res.ok) return toast({ kind: "error", title: res.error });
                setStatus(publish ? "PUBLISHED" : "DRAFT");
                toast({ title: publish ? "Published" : "Moved back to drafts" });
                router.refresh();
              }}
              icon={status === "PUBLISHED" ? undefined : "globe"}
            >
              {status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="primary" onClick={save} loading={busy} disabled={!dirty}>Save</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <Field error={errors.title}>
              <input
                value={d.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Title"
                className="w-full bg-transparent font-display text-[1.75rem] leading-tight tracking-[-0.02em] text-text-hi outline-none placeholder:text-text-dim"
                style={{ fontWeight: 800 }}
              />
            </Field>
            <Field label="Card excerpt" className="mt-4" count={d.excerpt.length} max={240} error={errors.excerpt}>
              <Textarea value={d.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="min-h-[4.5rem]" />
            </Field>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
              <div className="flex items-center gap-0.5">
                {([["h2", "H2"], ["h3", "H3"], ["bold", "B"], ["italic", "I"], ["list", "•"], ["quote", "“"], ["link", "↗"]] as const).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    disabled={view === "preview"}
                    onClick={() => format(k)}
                    title={k}
                    className={cn("grid h-8 min-w-8 place-items-center rounded-[8px] px-2 text-[0.8125rem] text-text-mid hover:bg-white/[0.07] hover:text-text-hi active:scale-90 disabled:opacity-30", k === "bold" && "font-bold", k === "italic" && "italic")}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Segmented id="story-view" value={view} onChange={setView} options={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} />
            </div>
            {view === "write" ? (
              <textarea
                ref={area}
                value={d.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Start writing.\n\n## A heading\n\nParagraphs are separated by a blank line."}
                className="block min-h-[60vh] w-full resize-y bg-transparent px-5 py-5 font-sans text-[1rem] leading-[1.75] text-text-hi outline-none placeholder:text-text-dim sm:px-7"
              />
            ) : (
              <div className="min-h-[60vh] bg-ink-900 px-5 py-8 sm:px-10">
                {blocks.length ? <Prose blocks={blocks} /> : <p className="text-text-low">Nothing to preview yet.</p>}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-[0.8125rem] font-medium text-text-mid">Cover photo</p>
            <button type="button" onClick={() => setPicker(true)} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-[12px] bg-ink-700 ring-1 ring-inset ring-white/[0.08]">
              {d.cover ? <Image src={d.cover.src} alt={d.cover.alt} fill sizes="340px" className="object-cover" /> : <span className="grid size-full place-items-center text-text-dim"><AdminIcon name="media" size={22} /></span>}
              <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"><span className="rounded-full bg-white/90 px-3 py-1 text-[0.75rem] font-medium text-ink-900">Choose</span></span>
            </button>
          </Card>
          <Card>
            <div className="space-y-4">
              <Field label="Category">
                <Select value={d.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Author" error={errors.authorName}><Input value={d.authorName} onChange={(e) => set("authorName", e.target.value)} /></Field>
              <div>
                <p className="mb-2 text-[0.8125rem] font-medium text-text-mid">About these places</p>
                <div className="flex flex-wrap gap-1.5">
                  {destinations.map((x) => {
                    const on = d.destinationSlugs.includes(x.slug);
                    return (
                      <button key={x.slug} type="button" onClick={() => set("destinationSlugs", on ? d.destinationSlugs.filter((s) => s !== x.slug) : [...d.destinationSlugs, x.slug])} className={cn("h-8 rounded-full px-3 text-[0.8125rem] ring-1 ring-inset transition active:scale-95", on ? "bg-gold-500/15 text-gold-400 ring-gold-500/40" : "text-text-low ring-white/[0.1]")}>
                        {x.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Web address" hint={`/stories/${d.slug}`} error={errors.slug}><Input value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></Field>
              <Field label="Search title" count={d.metaTitle.length} max={70}><Input value={d.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} /></Field>
              <Field label="Search description" count={d.metaDescription.length} max={170}><Textarea value={d.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} className="min-h-[4.5rem]" /></Field>
            </div>
          </Card>
          <Button
            variant="ghost"
            icon="trash"
            className="w-full text-[#ff9b93]"
            onClick={async () => {
              const res = await deleteStory(d.id);
              if (!res.ok) return toast({ kind: "error", title: res.error });
              router.push("/dashboard/stories");
              toast({ title: "Story deleted", undo: async () => { await deleteStory(d.id, true); router.refresh(); } });
            }}
          >
            Delete story
          </Button>
        </div>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={([m]) => m && set("cover", m)} folder="Stories" />
    </>
  );
}
