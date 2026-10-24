"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented, Switch, Textarea } from "@/components/admin/ui";
import { AdminIcon } from "@/components/admin/icons";
import { ConfirmDialog, Sheet } from "@/components/admin/sheet";
import { useToast } from "@/components/admin/toast";
import { DropZone, UploadTiles, useUploader } from "@/components/admin/media-picker";
import { cn } from "@/lib/utils";
import { deleteMedia, updateMedia, type MediaItem } from "./actions";

type Filter = "all" | "missing" | "unused" | string;

/**
 * The media library. Every photo the site can use, with what it is used by,
 * and a nudge — never a block — towards describing each one. A description is
 * required only at the point a photo goes onto a live page. DPR §10.3
 */
export function MediaLibrary({ initial, initialFilter }: { initial: MediaItem[]; initialFilter: Filter }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<MediaItem | null>(null);

  const onUploaded = useCallback(() => router.refresh(), [router]);
  const { uploads, start, dismiss } = useUploader(null, onUploaded);

  const folders = useMemo(() => [...new Set(items.map((i) => i.folder).filter((f): f is string => Boolean(f)))].sort(), [items]);
  const missing = items.filter((i) => !i.alt && !i.isDecorative).length;

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filter === "missing" && (m.alt || m.isDecorative)) return false;
      if (filter === "unused" && m.uses > 0) return false;
      if (!["all", "missing", "unused"].includes(filter) && m.folder !== filter) return false;
      return !n || `${m.alt} ${m.originalName}`.toLowerCase().includes(n);
    });
  }, [items, filter, q]);

  // A server refresh (after an upload) brings the new list.
  useEffect(() => setItems(initial), [initial]);

  return (
    <>
      <PageHeader title="Media" description={`${items.length} photos. Uploads are resized, turned upright and stripped of location data automatically.`} />

      <DropZone onFiles={start} />

      <div className="mb-4 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="media-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: items.length },
            { value: "missing", label: "Needs description", count: missing },
            { value: "unused", label: "Unused" },
            ...folders.map((f) => ({ value: f, label: f })),
          ]}
        />
        <div className="lg:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" leading={<AdminIcon name="search" size={15} />} />
        </div>
      </div>

      {shown.length || uploads.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          <UploadTiles uploads={uploads} onDismiss={dismiss} />
          {shown.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => setOpen(m)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.02, type: "spring", bounce: 0, duration: 0.35 }}
              className="group text-left"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-ink-700 ring-1 ring-inset ring-white/[0.06]">
                <Image src={m.src} alt={m.alt} fill sizes="(min-width:1536px) 18vw, (min-width:1024px) 23vw, 45vw" className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]" />
                <div className="absolute inset-x-2 top-2 flex justify-between">
                  {!m.alt && !m.isDecorative ? <Badge tone="warn" className="bg-ink-900/80 backdrop-blur">No description</Badge> : <span />}
                  {m.uses > 0 && <Badge className="bg-ink-900/80 backdrop-blur">In use</Badge>}
                </div>
              </div>
              <p className={cn("mt-2 line-clamp-2 px-0.5 text-[0.8125rem] leading-snug", m.alt ? "text-text-mid" : "text-text-dim")}>{m.alt || m.originalName}</p>
            </motion.button>
          ))}
        </div>
      ) : (
        <Card><EmptyState icon="media" title="Nothing here" body="Try another filter, or drop photos above." /></Card>
      )}

      <MediaSheet
        item={open}
        folders={folders}
        onClose={() => setOpen(null)}
        onChange={(next) => {
          setItems((all) => all.map((x) => (x.id === next.id ? next : x)));
          setOpen(next);
        }}
        onDeleted={(id) => {
          setItems((all) => all.filter((x) => x.id !== id));
          setOpen(null);
        }}
      />
    </>
  );
}

function MediaSheet({ item, folders, onClose, onChange, onDeleted }: { item: MediaItem | null; folders: string[]; onClose: () => void; onChange: (m: MediaItem) => void; onDeleted: (id: string) => void }) {
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title={item?.originalName} subtitle={item ? `${item.width} × ${item.height} · ${(item.sizeBytes / 1024).toFixed(0)} KB` : ""} width={560}>
      {item && <MediaForm key={item.id} item={item} folders={folders} onChange={onChange} onDeleted={onDeleted} />}
    </Sheet>
  );
}

function MediaForm({ item, folders, onChange, onDeleted }: { item: MediaItem; folders: string[]; onChange: (m: MediaItem) => void; onDeleted: (id: string) => void }) {
  const toast = useToast();
  const [alt, setAlt] = useState(item.alt);
  const [decorative, setDecorative] = useState(item.isDecorative);
  const [folder, setFolder] = useState(item.folder ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dirty = alt !== item.alt || decorative !== item.isDecorative || folder !== (item.folder ?? "");

  return (
    <div className="space-y-5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-black">
        <Image src={item.src} alt={item.alt} fill sizes="520px" className="object-contain" />
      </div>
      <Field label="Description" hint="What a person would see. Used by Google and by screen readers." count={alt.length} max={200}>
        <Textarea value={alt} onChange={(e) => setAlt(e.target.value)} className="min-h-[5rem]" placeholder="The private pool at dusk, with string lights over the lawn" />
      </Field>
      <Switch checked={decorative} onChange={setDecorative} label="Decorative" description="Only for photos that add mood and no information." />
      <Field label="Folder" hint={folders.length ? `Existing: ${folders.join(", ")}` : undefined}>
        <Input value={folder} onChange={(e) => setFolder(e.target.value)} list="media-folders" />
        <datalist id="media-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
      </Field>
      <p className="text-[0.8125rem] text-text-low">{item.uses ? `Used in ${item.uses} ${item.uses === 1 ? "place" : "places"} on the website.` : "Not used anywhere yet."}</p>
      <div className="flex gap-2 border-t border-white/[0.06] pt-5">
        <Button variant="danger" icon="trash" onClick={() => setConfirm(true)}>Delete</Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={!dirty}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const res = await updateMedia({ id: item.id, alt, isDecorative: decorative, folder });
            setBusy(false);
            if (!res.ok) return toast({ kind: "error", title: res.error });
            onChange({ ...item, alt, isDecorative: decorative, folder: folder || null });
            toast({ title: "Saved" });
          }}
        >
          Save
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this photo?"
        body="It is removed from the library for good. Photos still used on the website cannot be deleted."
        confirmLabel="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          const res = await deleteMedia(item.id);
          setConfirm(false);
          if (!res.ok) return toast({ kind: "error", title: "Not deleted", body: res.error });
          toast({ title: "Photo deleted" });
          onDeleted(item.id);
        }}
      />
    </div>
  );
}
