"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Badge, Button, Card, FadeImage, Field, Input, Menu, IconButton, ModKey, SaveButton, Segmented, Select, Textarea, useLargeTitle } from "@/components/admin/ui";
import { AdminIcon, type AdminIconName } from "@/components/admin/icons";
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

const TOOLS: { k: "h2" | "h3" | "bold" | "italic" | "list" | "quote" | "link"; label: string; title: string; icon?: AdminIconName }[] = [
  { k: "h2", label: "H2", title: "Heading" },
  { k: "h3", label: "H3", title: "Subheading" },
  { k: "bold", label: "B", title: "Bold" },
  { k: "italic", label: "I", title: "Italic" },
  { k: "list", label: "", title: "List", icon: "lists" },
  { k: "quote", label: "“", title: "Quote" },
  { k: "link", label: "", title: "Link", icon: "link" },
];

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
  const [publishing, setPublishing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useLargeTitle(titleRef, d.title || "Untitled");
  const dirty = JSON.stringify(d) !== saved;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const blocks = useMemo(() => parseProse(d.body || ""), [d.body]);
  const words = useMemo(() => (d.body.trim() ? d.body.trim().split(/\s+/).length : 0), [d.body]);

  const save = async () => {
    setBusy(true);
    const res = await saveStory({ ...d, coverMediaId: d.cover?.id ?? null });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      toast({ kind: "error", title: res.error, body: Object.values(res.fields ?? {})[0] });
      return false;
    }
    setErrors({});
    setSaved(JSON.stringify(d));
    toast({ title: "Saved", body: `${res.data.readMinutes} min read` });
    router.refresh();
    return true;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !busy) save();
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
  const format = (kind: (typeof TOOLS)[number]["k"]) => {
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

  const togglePublish = async () => {
    setPublishing(true);
    if (dirty && !(await save())) return setPublishing(false);
    const publish = status !== "PUBLISHED";
    const res = await setStoryStatus(d.id, publish);
    setPublishing(false);
    if (!res.ok) return toast({ kind: "error", title: res.error });
    setStatus(publish ? "PUBLISHED" : "DRAFT");
    toast({ title: publish ? "Published" : "Moved back to drafts", body: publish ? "It is on the website and in the sitemap." : undefined });
    router.refresh();
  };

  return (
    <>
      <div className="sticky top-[52px] z-20 -mx-4 mb-5 bg-pane/85 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-14 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
            <div className="flex items-center gap-2.5">
              <h1 ref={titleRef} className="truncate text-title text-fg sm:text-[1.75rem] sm:tracking-[-0.024em]">
                {d.title || "Untitled"}
              </h1>
              <Badge tone={status === "PUBLISHED" ? "ok" : "neutral"} dot>
                {status === "PUBLISHED" ? "Live" : "Draft"}
              </Badge>
            </div>
            <p className={cn("mt-0.5 flex items-center gap-1.5 text-subhead", dirty ? "font-medium text-caution-text" : "text-fg-3")}>
              {dirty ? (
                <>
                  <span className="size-1.5 rounded-full bg-caution" /> Unsaved changes
                  <span className="hidden sm:inline">
                    · <ModKey />S to save
                  </span>
                </>
              ) : (
                <>
                  <AdminIcon name="checkCircle" size={14} className="text-pos-text" /> All changes saved
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Menu
              items={[
                ...(status === "PUBLISHED" ? [{ label: "View on the website", icon: "external" as const, href: `/stories/${initial.slug}`, external: true }, "separator" as const] : []),
                {
                  label: "Delete story",
                  icon: "trash",
                  destructive: true,
                  onSelect: async () => {
                    const res = await deleteStory(d.id);
                    if (!res.ok) return toast({ kind: "error", title: res.error });
                    router.push("/dashboard/stories");
                    toast({
                      title: "Story deleted",
                      undo: async () => {
                        await deleteStory(d.id, true);
                        router.refresh();
                      },
                    });
                  },
                },
              ]}
              trigger={({ toggle, ref }) => <IconButton ref={ref} icon="more" label="More actions" tone="filled" onClick={toggle} />}
            />
            <Button variant={status === "PUBLISHED" ? "secondary" : "tinted"} icon={status === "PUBLISHED" ? "eyeOff" : "globe"} loading={publishing} onClick={togglePublish}>
              {status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </Button>
            <SaveButton saving={busy} dirty={dirty} onClick={save} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <Card>
            <Field error={errors.title}>
              <input
                value={d.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Title"
                aria-label="Title"
                className="w-full bg-transparent text-[1.875rem] font-bold leading-tight tracking-[-0.026em] text-fg outline-none placeholder:text-fg-4"
              />
            </Field>
            <Field label="Card excerpt" className="mt-4" count={d.excerpt.length} max={240} error={errors.excerpt}>
              <Textarea value={d.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="min-h-[4.5rem]" />
            </Field>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-2.5 py-2">
              <div className="flex items-center gap-0.5">
                {TOOLS.map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    disabled={view === "preview"}
                    onClick={() => format(t.k)}
                    title={t.title}
                    aria-label={t.title}
                    className={cn("grid h-8 min-w-8 place-items-center rounded-[9px] px-2 text-subhead text-fg-2 transition-colors hover:bg-fill hover:text-fg active:scale-90 disabled:opacity-30", t.k === "bold" && "font-bold", t.k === "italic" && "font-serif italic")}
                  >
                    {t.icon ? <AdminIcon name={t.icon} size={16} /> : t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-footnote tabular-nums text-fg-3 sm:inline">{words.toLocaleString("en-IN")} words · {Math.max(1, Math.round(words / 220))} min</span>
                <Segmented size="sm" id="story-view" value={view} onChange={setView} options={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} />
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {view === "write" ? (
                <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <textarea
                    ref={area}
                    value={d.body}
                    onChange={(e) => set("body", e.target.value)}
                    placeholder={"Start writing.\n\n## A heading\n\nParagraphs are separated by a blank line."}
                    aria-label="Story"
                    className="block min-h-[62vh] w-full resize-y bg-transparent px-5 py-5 text-[1.0625rem] leading-[1.75] text-fg outline-none placeholder:text-fg-4 sm:px-8"
                  />
                </motion.div>
              ) : (
                <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="min-h-[62vh] bg-[#070e1a] px-5 py-8 text-[#c3cedc] sm:px-10">
                  <p className="mb-6 text-[0.6875rem] font-semibold tracking-[0.04em] text-white/40">As it appears on the website</p>
                  {blocks.length ? <Prose blocks={blocks} /> : <p className="text-white/50">Nothing to preview yet.</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-subhead font-medium text-fg-2">Cover photo</p>
            <button type="button" onClick={() => setPicker(true)} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-[14px] bg-fill-2 shadow-[inset_0_0_0_1px_var(--d-line-2)]">
              {d.cover ? (
                <FadeImage src={d.cover.src} alt={d.cover.alt} fill sizes="340px" className="object-cover" />
              ) : (
                <span className="grid size-full place-items-center text-fg-3">
                  <AdminIcon name="imagePlus" size={24} />
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                <span className="rounded-full bg-white/95 px-3 py-1 text-footnote font-semibold text-black">Choose</span>
              </span>
            </button>
          </Card>
          <Card>
            <div className="space-y-4">
              <Field label="Category">
                <Select value={d.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Author" error={errors.authorName}>
                <Input value={d.authorName} onChange={(e) => set("authorName", e.target.value)} />
              </Field>
              <div>
                <p className="mb-2 px-0.5 text-subhead font-medium text-fg-2">About these places</p>
                <div className="flex flex-wrap gap-1.5">
                  {destinations.map((x) => {
                    const on = d.destinationSlugs.includes(x.slug);
                    return (
                      <button
                        key={x.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("destinationSlugs", on ? d.destinationSlugs.filter((s) => s !== x.slug) : [...d.destinationSlugs, x.slug])}
                        className={cn("h-8 rounded-full px-3 text-subhead font-medium transition active:scale-95", on ? "bg-accent/18 text-accent-text shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--d-accent)_55%,transparent)]" : "bg-fill text-fg-2 hover:bg-fill-2")}
                      >
                        {x.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Web address" hint={`/stories/${d.slug}`} error={errors.slug}>
                <Input value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
              </Field>
            </div>
          </Card>
          <Card>
            <p className="mb-3 text-subhead font-semibold text-fg">In Google</p>
            <div className="mb-4 rounded-[14px] bg-white p-3.5 shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
              <p className="truncate text-[0.75rem] text-[#4d5156]">staysutra.in › stories › {d.slug}</p>
              <p className="mt-0.5 line-clamp-1 text-[1rem] text-[#1a0dab]">{d.metaTitle || d.title || "Untitled"}</p>
              <p className="mt-0.5 line-clamp-2 text-[0.75rem] leading-snug text-[#4d5156]">{d.metaDescription || d.excerpt}</p>
            </div>
            <div className="space-y-4">
              <Field label="Search title" count={d.metaTitle.length} max={70}>
                <Input value={d.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
              </Field>
              <Field label="Search description" count={d.metaDescription.length} max={170}>
                <Textarea value={d.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} className="min-h-[4.5rem]" />
              </Field>
            </div>
          </Card>
        </div>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={([m]) => m && set("cover", m)} folder="Stories" />
    </>
  );
}
