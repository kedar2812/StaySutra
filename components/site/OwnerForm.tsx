"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/primitives/Button";
import { Checkbox, Field, Honeypot, Select, TextArea } from "@/components/primitives/Field";
import { Chip } from "@/components/primitives/Chip";
import { Icon, iconFor } from "@/components/primitives/Icon";
import { amenities, categories, facilities } from "@/lib/content";
import { ownerStep1, ownerStep2, ownerStep4 } from "@/lib/validation";
import { spring } from "@/lib/motion";
import { track } from "@/lib/analytics";
import { whatsappLink, waMessage } from "@/lib/site";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "staysutra:owner-draft";
const STEPS = ["Property", "Features", "Photos", "Review"] as const;

const MAX_PHOTOS = 12;
const MAX_DOCS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

type Draft = {
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  propertyName: string;
  propertyType: string;
  city: string;
  state: string;
  locality: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  amenityKeys: string[];
  facilityKeys: string[];
  hasBikeParking: boolean;
  parkingCapacity: string;
  expectedPrice: string;
  notes: string;
  consent: boolean;
};

const EMPTY: Draft = {
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  propertyName: "",
  propertyType: "",
  city: "",
  state: "Maharashtra",
  locality: "",
  maxGuests: "",
  bedrooms: "",
  bathrooms: "",
  amenityKeys: [],
  facilityKeys: [],
  hasBikeParking: false,
  parkingCapacity: "",
  expectedPrice: "",
  notes: "",
  consent: false,
};

interface Picked {
  id: string;
  file: File;
  kind: "PHOTO" | "DOCUMENT";
  preview?: string;
}

type Errors = Partial<Record<keyof Draft | "files", string>>;

/**
 * The four-step owner submission.
 *
 * One step per screen, validated per step (you cannot advance with an invalid
 * step), inline on blur, with the draft persisted to localStorage so a phone
 * that rings mid-form does not cost the submission. Files are held in memory and
 * uploaded on submit — the upload endpoint, sharp re-encode and authenticated
 * document route land with the database in P1-12. DPR §7.8
 */
export function OwnerForm() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [files, setFiles] = useState<Picked[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  /* Restore, then persist on every change. Files cannot be serialised. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>;
        if (Object.values(saved).some((v) => v && v !== "Maharashtra")) {
          setDraft({ ...EMPTY, ...saved, consent: false });
          setRestored(true);
        }
      }
    } catch {
      /* private mode — carry on without a draft */
    }
    track("owner_submission_start");
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, consent: false }));
    } catch {
      /* nothing we can do, and nothing that should stop the form */
    }
  }, [draft]);

  useEffect(() => {
    // Revoke object URLs so a long session does not leak blobs.
    return () => files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
  }, [files]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggle = (key: "amenityKeys" | "facilityKeys", slug: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(slug) ? d[key].filter((s) => s !== slug) : [...d[key], slug],
    }));

  const validate = useCallback(
    (index: number): boolean => {
      const collect = (issues: { path: (string | number)[]; message: string }[]) => {
        const next: Errors = {};
        for (const issue of issues) {
          const key = issue.path[0];
          if (typeof key === "string") next[key as keyof Draft] = issue.message;
        }
        setErrors(next);
        return Object.keys(next).length === 0;
      };

      if (index === 0) {
        const r = ownerStep1.safeParse(draft);
        return r.success ? (setErrors({}), true) : collect(r.error.issues);
      }
      if (index === 1) {
        const r = ownerStep2.safeParse({
          ...draft,
          maxGuests: draft.maxGuests || undefined,
          bedrooms: draft.bedrooms || 0,
          bathrooms: draft.bathrooms || 0,
          parkingCapacity: draft.parkingCapacity || undefined,
          expectedPrice: draft.expectedPrice || undefined,
        });
        return r.success ? (setErrors({}), true) : collect(r.error.issues);
      }
      if (index === 2) {
        const photos = files.filter((f) => f.kind === "PHOTO");
        if (photos.length === 0) {
          setErrors({ files: "Add at least one photo of the property" });
          return false;
        }
        setErrors({});
        return true;
      }
      const r = ownerStep4.safeParse({ notes: draft.notes, consent: draft.consent });
      return r.success ? (setErrors({}), true) : collect(r.error.issues);
    },
    [draft, files],
  );

  const go = (next: number) => {
    if (next > step && !validate(step)) return;
    setStep(next);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const addFiles = (incoming: FileList | null, kind: Picked["kind"]) => {
    if (!incoming) return;
    const limit = kind === "PHOTO" ? MAX_PHOTOS : MAX_DOCS;
    const maxBytes = kind === "PHOTO" ? MAX_PHOTO_BYTES : MAX_DOC_BYTES;
    const allowed = kind === "PHOTO" ? PHOTO_TYPES : DOC_TYPES;
    const existing = files.filter((f) => f.kind === kind);

    const accepted: Picked[] = [];
    let problem: string | undefined;

    for (const file of Array.from(incoming)) {
      if (existing.length + accepted.length >= limit) {
        problem = `That is the maximum of ${limit} ${kind === "PHOTO" ? "photos" : "documents"}.`;
        break;
      }
      if (!allowed.includes(file.type)) {
        problem = `${file.name} is not a supported format.`;
        continue;
      }
      if (file.size > maxBytes) {
        problem = `${file.name} is over ${Math.round(maxBytes / 1024 / 1024)} MB.`;
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind,
        preview: kind === "PHOTO" ? URL.createObjectURL(file) : undefined,
      });
    }

    setFiles((prev) => [...prev, ...accepted]);
    setErrors((e) => ({ ...e, files: problem }));
  };

  const removeFile = (id: string) =>
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });

  const submit = async () => {
    if (!validate(3)) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set(
        "submission",
        JSON.stringify({
          ...draft,
          maxGuests: Number(draft.maxGuests) || null,
          bedrooms: Number(draft.bedrooms) || 0,
          bathrooms: Number(draft.bathrooms) || 0,
          parkingCapacity: draft.parkingCapacity ? Number(draft.parkingCapacity) : null,
          expectedPrice: draft.expectedPrice ? Number(draft.expectedPrice) : null,
          startedAt,
          pageUrl: window.location.href,
        }),
      );
      for (const f of files) {
        body.append(f.kind === "PHOTO" ? "photos" : "documents", f.file, f.file.name);
      }

      const res = await fetch("/api/owner-submission", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { refCode: string };

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to clean up */
      }
      track("owner_submission_complete");
      setRef(data.refCode);
    } catch {
      setErrors({ files: "The upload did not complete. Your details are saved — try again." });
    } finally {
      setBusy(false);
    }
  };

  if (ref) return <Success refCode={ref} />;

  const photos = files.filter((f) => f.kind === "PHOTO");
  const docs = files.filter((f) => f.kind === "DOCUMENT");

  return (
    <div ref={topRef} className="scroll-mt-28">
      <Honeypot value="" onChange={() => {}} />

      {/* Progress — persistent, and each visited step is a link back. */}
      <nav aria-label="Form progress">
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => {
            const state = i === step ? "current" : i < step ? "done" : "todo";
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => i < step && go(i)}
                  disabled={i > step}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "block w-full text-left",
                    i < step ? "press-sm cursor-pointer" : "cursor-default",
                  )}
                >
                  {/* Only the step you are on is gold; done steps read as solid. */}
                  <span
                    className={cn(
                      "block h-0.5 w-full rounded-pill transition-colors duration-300",
                      state === "current"
                        ? "bg-gold-500"
                        : state === "done"
                          ? "bg-[var(--hairline-str)]"
                          : "bg-[var(--hairline)]",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors",
                      state === "current"
                        ? "text-text-hi"
                        : state === "done"
                          ? "text-text-low"
                          : "text-text-low",
                    )}
                  >
                    <span className="tabular-nums">{i + 1}</span>
                    <span className="ml-1.5 hidden sm:inline">{label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {restored && step === 0 && (
        <p className="mt-6 flex items-start gap-2 rounded-card border border-[color:var(--hairline)] bg-ink-800/60 px-4 py-3 text-[0.8125rem] text-text-mid">
          <Icon name="check" size={15} className="mt-0.5 shrink-0 text-gold-500" />
          We kept what you had typed before. Photos need adding again.
        </p>
      )}

      <div className="relative mt-10 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={reduced ? { duration: 0.18 } : spring.ui}
          >
            {step === 0 && <StepOne draft={draft} set={set} errors={errors} />}
            {step === 1 && (
              <StepTwo draft={draft} set={set} toggle={toggle} errors={errors} />
            )}
            {step === 2 && (
              <StepThree
                photos={photos}
                docs={docs}
                onAdd={addFiles}
                onRemove={removeFile}
                error={errors.files}
              />
            )}
            {step === 3 && (
              <StepFour
                draft={draft}
                set={set}
                errors={errors}
                photoCount={photos.length}
                docCount={docs.length}
                onEdit={go}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 flex items-center gap-3 border-t border-[color:var(--hairline)] pt-6">
        {step > 0 && (
          <Button variant="quiet" onClick={() => go(step - 1)} icon="arrowLeft" iconAfter={false}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={() => go(step + 1)} size="lg" icon="arrowRight" className="ml-auto">
            Continue
          </Button>
        ) : (
          <Button onClick={submit} size="lg" disabled={busy} icon="arrowRight" className="ml-auto">
            {busy ? "Submitting…" : "Submit property"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* — Steps ————————————————————————————————————————————————— */

type SetFn = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

function StepOne({ draft, set, errors }: { draft: Draft; set: SetFn; errors: Errors }) {
  return (
    <Fieldset
      legend="Tell us about the property"
      note="Who you are, where it is, and what kind of place it is."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          required
          autoComplete="name"
          value={draft.ownerName}
          onChange={(e) => set("ownerName", e.target.value)}
          error={errors.ownerName}
        />
        <Field
          label="Mobile"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="10-digit number"
          value={draft.ownerPhone}
          onChange={(e) => set("ownerPhone", e.target.value)}
          error={errors.ownerPhone}
        />
      </div>

      <Field
        label="Email"
        required
        type="email"
        autoComplete="email"
        hint="We send the confirmation and the review outcome here."
        value={draft.ownerEmail}
        onChange={(e) => set("ownerEmail", e.target.value)}
        error={errors.ownerEmail}
      />

      <Field
        label="Property name"
        required
        placeholder="What it is called, or what you would call it"
        value={draft.propertyName}
        onChange={(e) => set("propertyName", e.target.value)}
        error={errors.propertyName}
      />

      <Select
        label="Property type"
        required
        value={draft.propertyType}
        onChange={(e) => set("propertyType", e.target.value)}
        error={errors.propertyType}
      >
        <option value="">Pick the closest</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug} className="bg-ink-800">
            {c.name}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="City or town"
          required
          value={draft.city}
          onChange={(e) => set("city", e.target.value)}
          error={errors.city}
        />
        <Field
          label="State"
          required
          value={draft.state}
          onChange={(e) => set("state", e.target.value)}
          error={errors.state}
        />
        <Field
          label="Locality"
          placeholder="Optional"
          value={draft.locality}
          onChange={(e) => set("locality", e.target.value)}
          error={errors.locality}
        />
      </div>
    </Fieldset>
  );
}

function StepTwo({
  draft,
  set,
  toggle,
  errors,
}: {
  draft: Draft;
  set: SetFn;
  toggle: (key: "amenityKeys" | "facilityKeys", slug: string) => void;
  errors: Errors;
}) {
  return (
    <Fieldset
      legend="What it offers"
      note="Capacity, amenities and — the part that matters here — what you have for the bikes."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Sleeps"
          required
          type="number"
          min={1}
          inputMode="numeric"
          value={draft.maxGuests}
          onChange={(e) => set("maxGuests", e.target.value)}
          error={errors.maxGuests}
        />
        <Field
          label="Bedrooms"
          required
          type="number"
          min={0}
          inputMode="numeric"
          value={draft.bedrooms}
          onChange={(e) => set("bedrooms", e.target.value)}
          error={errors.bedrooms}
        />
        <Field
          label="Bathrooms"
          required
          type="number"
          min={0}
          inputMode="numeric"
          value={draft.bathrooms}
          onChange={(e) => set("bathrooms", e.target.value)}
          error={errors.bathrooms}
        />
      </div>

      <PickList
        legend="Amenities"
        items={amenities}
        selected={draft.amenityKeys}
        onToggle={(slug) => toggle("amenityKeys", slug)}
      />

      <PickList
        legend="Rider facilities"
        hint="Be honest — a no here is not a problem. A wrong yes is."
        items={facilities}
        selected={draft.facilityKeys}
        onToggle={(slug) => toggle("facilityKeys", slug)}
      />

      <div className="rounded-card border border-[color:var(--hairline)] bg-ink-800/50 p-5">
        <Checkbox
          label="There is somewhere on the property to park motorcycles"
          checked={draft.hasBikeParking}
          onChange={(e) => set("hasBikeParking", e.target.checked)}
        />
        {draft.hasBikeParking && (
          <Field
            label="How many bikes"
            type="number"
            min={0}
            inputMode="numeric"
            className="mt-5 max-w-40"
            value={draft.parkingCapacity}
            onChange={(e) => set("parkingCapacity", e.target.value)}
            error={errors.parkingCapacity}
          />
        )}
      </div>

      <Field
        label="Expected nightly rate"
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="₹ per night"
        hint="A rough figure. We come back with pricing guidance for your area."
        className="max-w-64"
        value={draft.expectedPrice}
        onChange={(e) => set("expectedPrice", e.target.value)}
        error={errors.expectedPrice}
      />
    </Fieldset>
  );
}

function StepThree({
  photos,
  docs,
  onAdd,
  onRemove,
  error,
}: {
  photos: Picked[];
  docs: Picked[];
  onAdd: (files: FileList | null, kind: Picked["kind"]) => void;
  onRemove: (id: string) => void;
  error?: string;
}) {
  return (
    <Fieldset
      legend="Photos and documents"
      note="Pictures of the place, plus something showing you are entitled to list it."
    >
      <DropZone
        label="Photos"
        hint={`Up to ${MAX_PHOTOS} images, 10 MB each. JPEG, PNG or WebP. Wide shots of each room, the outside, and the parking.`}
        accept={PHOTO_TYPES.join(",")}
        count={photos.length}
        max={MAX_PHOTOS}
        onPick={(f) => onAdd(f, "PHOTO")}
      />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((f) => (
            <li key={f.id} className="group relative">
              <div className="aspect-square overflow-hidden rounded-card bg-ink-700">
                {/* A local blob preview; next/image would add no value here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="size-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`Remove ${f.file.name}`}
                className="press absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-pill bg-ink-900/85 text-text-hi"
              >
                <Icon name="close" size={15} />
              </button>
              <p className="t-caption mt-1.5 truncate">{f.file.name}</p>
            </li>
          ))}
        </ul>
      )}

      <DropZone
        label="Ownership documents"
        hint={`Up to ${MAX_DOCS} files, 20 MB each. PDF, JPEG or PNG. A property tax receipt, electricity bill or registration extract — enough to show the property is yours to list. Documents are stored privately and are never published.`}
        accept={DOC_TYPES.join(",")}
        count={docs.length}
        max={MAX_DOCS}
        onPick={(f) => onAdd(f, "DOCUMENT")}
      />

      {docs.length > 0 && (
        <ul>
          {docs.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 border-t border-[color:var(--hairline)] py-3 last:border-b"
            >
              <Icon name="book" size={19} className="shrink-0 text-text-low" />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-text-mid">
                {f.file.name}
              </span>
              <span className="t-caption shrink-0 tabular-nums">
                {(f.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`Remove ${f.file.name}`}
                className="press grid size-9 shrink-0 place-items-center rounded-pill text-text-low hover:text-text-hi"
              >
                <Icon name="close" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--color-err)]">
          {error}
        </p>
      )}
    </Fieldset>
  );
}

function StepFour({
  draft,
  set,
  errors,
  photoCount,
  docCount,
  onEdit,
}: {
  draft: Draft;
  set: SetFn;
  errors: Errors;
  photoCount: number;
  docCount: number;
  onEdit: (step: number) => void;
}) {
  const type = categories.find((c) => c.slug === draft.propertyType);

  return (
    <Fieldset legend="Review and submit" note="Check it over, then send it to us.">
      <Summary
        step={0}
        onEdit={onEdit}
        title="Property"
        rows={[
          ["Owner", draft.ownerName],
          ["Mobile", draft.ownerPhone],
          ["Email", draft.ownerEmail],
          ["Property", draft.propertyName],
          ["Type", type?.name ?? draft.propertyType],
          [
            "Where",
            [draft.locality, draft.city, draft.state].filter(Boolean).join(", "),
          ],
        ]}
      />

      <Summary
        step={1}
        onEdit={onEdit}
        title="Features"
        rows={[
          ["Sleeps", draft.maxGuests],
          ["Bedrooms", draft.bedrooms],
          ["Bathrooms", draft.bathrooms],
          ["Amenities", draft.amenityKeys.length ? `${draft.amenityKeys.length} selected` : "None"],
          [
            "Rider facilities",
            draft.facilityKeys.length ? `${draft.facilityKeys.length} selected` : "None",
          ],
          [
            "Bike parking",
            draft.hasBikeParking
              ? draft.parkingCapacity
                ? `Yes, for ${draft.parkingCapacity}`
                : "Yes"
              : "No",
          ],
          ["Expected rate", draft.expectedPrice ? `₹${draft.expectedPrice} / night` : "Not given"],
        ]}
      />

      <Summary
        step={2}
        onEdit={onEdit}
        title="Files"
        rows={[
          ["Photos", String(photoCount)],
          ["Documents", String(docCount)],
        ]}
      />

      <TextArea
        label="Anything else"
        rows={4}
        placeholder="What makes the place worth a detour, and anything we should know."
        value={draft.notes}
        onChange={(e) => set("notes", e.target.value)}
        error={errors.notes}
      />

      <div className="rounded-card border border-[color:var(--hairline-str)] bg-ink-800/60 p-5">
        <Checkbox
          label={
            <>
              I own this property or am authorised to list it, and I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-gold-500 underline underline-offset-4"
              >
                terms
              </a>
              .
            </>
          }
          checked={draft.consent}
          onChange={(e) => set("consent", e.target.checked)}
          error={errors.consent}
        />
      </div>

      {errors.files && (
        <p role="alert" className="text-[0.8125rem] text-[color:var(--color-err)]">
          {errors.files}
        </p>
      )}
    </Fieldset>
  );
}

/* — Pieces ————————————————————————————————————————————————— */

function Fieldset({
  legend,
  note,
  children,
}: {
  legend: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="mb-6">
        <span
          className="block font-display text-xl uppercase leading-tight tracking-[-0.01em] text-text-hi lg:text-2xl"
          style={{ fontWeight: 800 }}
        >
          {legend}
        </span>
        <span className="mt-2.5 block max-w-[48ch] text-[0.9375rem] leading-relaxed text-text-low">
          {note}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

function PickList({
  legend,
  hint,
  items,
  selected,
  onToggle,
}: {
  legend: string;
  hint?: string;
  items: { slug: string; name: string; iconKey: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low">
        {legend}
      </legend>
      {hint && <p className="t-caption mt-1.5">{hint}</p>}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => onToggle(item.slug)}
            aria-pressed={selected.includes(item.slug)}
            className="press"
          >
            <Chip
              icon={iconFor(item.iconKey)}
              tone={selected.includes(item.slug) ? "gold" : "outline"}
              className="px-3.5 py-2.5"
            >
              {item.name}
            </Chip>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function DropZone({
  label,
  hint,
  accept,
  count,
  max,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  count: number;
  max: number;
  onPick: (files: FileList | null) => void;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const full = count >= max;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-low">
          {label}
        </span>
        <span className="t-caption tabular-nums">
          {count} / {max}
        </span>
      </div>

      <button
        type="button"
        disabled={full}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!full) onPick(e.dataTransfer.files);
        }}
        className={cn(
          "press flex w-full flex-col items-center gap-2 rounded-card border border-dashed px-6 py-9 text-center transition-colors",
          over
            ? "border-gold-500 bg-gold-500/5"
            : "border-[color:var(--hairline-str)] hover:border-white/25",
          full && "cursor-not-allowed opacity-50",
        )}
      >
        <Icon name="upload" size={24} className="text-text-low" />
        <span className="text-[0.9375rem] font-medium text-text-hi">
          {full ? "Maximum reached" : "Tap to choose, or drag files here"}
        </span>
        <span className="t-caption max-w-[52ch]">{hint}</span>
      </button>

      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Summary({
  title,
  rows,
  step,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  step: number;
  onEdit: (step: number) => void;
}) {
  return (
    <section className="rounded-card border border-[color:var(--hairline)] bg-ink-800/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="t-caption uppercase tracking-[0.18em] text-text-hi">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="press-sm text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-text-low underline underline-offset-4 transition-colors hover:text-text-hi"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3">
        {rows.map(([term, value]) => (
          <div
            key={term}
            className="flex items-baseline justify-between gap-6 border-t border-[color:var(--hairline)] py-2.5"
          >
            <dt className="t-caption shrink-0">{term}</dt>
            <dd className="min-w-0 truncate text-right text-[0.9375rem] text-text-hi">
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Success({ refCode }: { refCode: string }) {
  return (
    <div
      role="status"
      className="rounded-surface border border-[color:var(--hairline-str)] bg-ink-800 p-8 text-center lg:p-12"
    >
      <Icon name="check" size={30} className="mx-auto text-gold-500" />
      <h2 className="t-display-m mt-6">Submitted</h2>
      <p className="mx-auto mt-4 max-w-[44ch] text-[1.0625rem] leading-relaxed text-text-mid">
        Your reference is{" "}
        <span className="t-num text-text-hi" style={{ fontWeight: 800 }}>
          {refCode}
        </span>
        . We read every submission ourselves and come back within two working days,
        by email and on WhatsApp.
      </p>

      <ol className="mx-auto mt-10 max-w-md text-left">
        {[
          "We review the details and the photos.",
          "We call you to talk through pricing and what we would change.",
          "If it is a fit, we produce the listing and it goes live.",
        ].map((line, i) => (
          <li
            key={line}
            className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-[color:var(--hairline)] py-4"
          >
            <span className="t-num text-sm text-text-low">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[0.9375rem] leading-relaxed text-text-mid">{line}</span>
          </li>
        ))}
      </ol>

      <a
        href={whatsappLink(`${waMessage.owner()} Ref: ${refCode}`)}
        target="_blank"
        rel="noreferrer noopener"
        className="press mt-10 inline-flex items-center gap-2 rounded-pill bg-gold-500 px-8 py-4 text-[0.8125rem] font-semibold uppercase tracking-[0.09em] text-gold-ink"
      >
        <Icon name="whatsapp" size={17} />
        Continue on WhatsApp
      </a>
    </div>
  );
}
