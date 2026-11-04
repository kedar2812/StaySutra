import { Skeleton as S } from "./ui";
import { cn } from "@/lib/utils";

/*
 * Loading states, one per screen, drawn in the shape of what is coming so the
 * page does not jump when it arrives. They fade in after a short beat
 * (.d-skel-wrap), so a fast navigation never flashes grey.
 */

function Wrap({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="d-skel-wrap" role="status" aria-label={label} aria-busy>
      {children}
    </div>
  );
}

function Header({ actions = 1, wide }: { actions?: number; wide?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <S className="h-9 w-48 rounded-[10px] sm:h-10" />
        <S className={cn("mt-3 h-4 rounded-full", wide ? "w-[26rem] max-w-full" : "w-72 max-w-full")} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <S key={i} className="h-9 w-32 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function Panel({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("rounded-[20px] bg-panel p-5 shadow-tile sm:p-6", className)}>{children}</div>;
}

function Lines({ n = 3, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: n }, (_, i) => (
        <S key={i} className="h-3.5 rounded-full" style={{ width: `${92 - ((i * 23) % 40)}%` }} />
      ))}
    </div>
  );
}

function Rows({ n = 5, avatar = true }: { n?: number; avatar?: boolean }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
          {avatar && <S className="size-10 shrink-0 rounded-full" />}
          <div className="flex-1">
            <S className="h-3.5 rounded-full" style={{ width: `${45 + ((i * 17) % 30)}%` }} />
            <S className="mt-2 h-3 rounded-full" style={{ width: `${30 + ((i * 11) % 25)}%` }} />
          </div>
          <S className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <Wrap label="Loading the overview">
      <S className="mb-2 h-4 w-40 rounded-full" />
      <Header actions={1} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Panel key={i} className="flex min-h-[9.5rem] flex-col p-4 sm:p-5">
            <S className="h-3.5 w-24 rounded-full" />
            <S className="mt-auto h-9 w-16 rounded-[10px]" />
            <S className="mt-2.5 h-3 w-28 rounded-full" />
          </Panel>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          <Panel>
            <S className="h-4 w-40 rounded-full" />
            <S className="mt-2 h-3 w-56 rounded-full" />
            <S className="mt-6 h-8 w-full rounded-[9px]" />
            <S className="mt-2.5 h-8 w-full rounded-[9px]" />
          </Panel>
          <Panel>
            <S className="h-4 w-28 rounded-full" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <S className="h-12 w-11 rounded-[11px]" />
                  <Lines n={2} className="flex-1" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="space-y-4 lg:space-y-5">
          <Panel>
            <div className="flex items-center gap-4">
              <S className="size-14 rounded-full" />
              <Lines n={2} className="flex-1" />
            </div>
            <Lines n={5} className="mt-6" />
          </Panel>
          <Panel>
            <Lines n={6} />
          </Panel>
        </div>
      </div>
    </Wrap>
  );
}

export function AnalyticsSkeleton() {
  return (
    <Wrap label="Loading analytics">
      <Header actions={1} wide />
      <S className="mb-5 h-10 w-64 rounded-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Panel key={i} className="flex min-h-[8.5rem] flex-col p-4 sm:p-5">
            <S className="h-3.5 w-20 rounded-full" />
            <S className="mt-auto h-8 w-16 rounded-[10px]" />
            <S className="mt-2.5 h-3 w-24 rounded-full" />
          </Panel>
        ))}
      </div>
      <Panel className="mt-4 lg:mt-5">
        <S className="h-4 w-24 rounded-full" />
        <S className="mt-6 h-[17rem] w-full rounded-[14px]" />
      </Panel>
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2 lg:gap-5">
        <Panel>
          <Lines n={7} />
        </Panel>
        <Panel>
          <Lines n={7} />
        </Panel>
      </div>
    </Wrap>
  );
}

export function GridSkeleton({ label, tiles = 6, aspect = "aspect-[3/2]", filters = true }: { label: string; tiles?: number; aspect?: string; filters?: boolean }) {
  return (
    <Wrap label={label}>
      <Header />
      {filters && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <S className="h-9 w-64 rounded-full" />
          <S className="h-10 w-full rounded-[11px] sm:ml-auto sm:w-72" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[22px] bg-panel shadow-tile">
            <S className={cn("w-full rounded-none", aspect)} />
            <div className="p-4 sm:p-5">
              <S className="h-4 w-2/3 rounded-full" />
              <S className="mt-2.5 h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

export function MediaSkeleton() {
  return (
    <Wrap label="Loading the media library">
      <Header />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <S className="h-9 w-80 max-w-full rounded-full" />
        <S className="h-10 w-full rounded-[11px] lg:ml-auto lg:w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i}>
            <S className="aspect-[4/3] w-full rounded-[16px]" />
            <S className="mt-2 h-3 w-3/4 rounded-full" />
          </div>
        ))}
      </div>
    </Wrap>
  );
}

export function ListSkeleton({ label, rows = 6, filters = true, side }: { label: string; rows?: number; filters?: boolean; side?: boolean }) {
  return (
    <Wrap label={label}>
      <Header />
      {filters && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <S className="h-9 w-80 max-w-full rounded-full" />
          <S className="h-10 w-full rounded-[11px] md:ml-auto md:w-80" />
        </div>
      )}
      <div className={cn("grid gap-4 lg:gap-5", side && "lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]")}>
        <div className="overflow-hidden rounded-[20px] bg-panel shadow-tile">
          <Rows n={rows} />
        </div>
        {side && (
          <Panel className="hidden lg:block">
            <div className="flex items-center gap-4">
              <S className="size-[52px] rounded-full" />
              <Lines n={2} className="flex-1" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <S className="h-[4.5rem] rounded-[18px]" />
              <S className="h-[4.5rem] rounded-[18px]" />
              <S className="h-[4.5rem] rounded-[18px]" />
            </div>
            <S className="mt-5 h-40 w-full rounded-[16px]" />
          </Panel>
        )}
      </div>
    </Wrap>
  );
}

export function CalendarSkeleton() {
  return (
    <Wrap label="Loading the calendar">
      <Header actions={2} wide />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-5">
        <Panel className="p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <S className="h-6 w-40 rounded-[8px]" />
            <S className="h-8 w-36 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }, (_, i) => (
              <S key={i} className="h-[3.25rem] rounded-[10px] sm:h-[4.75rem]" />
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel>
            <S className="h-4 w-40 rounded-full" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <S className="size-10 rounded-[12px]" />
                  <Lines n={2} className="flex-1" />
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Lines n={2} />
            <S className="mt-4 h-10 w-full rounded-[12px]" />
          </Panel>
        </div>
      </div>
    </Wrap>
  );
}

export function EditorSkeleton({ label, aside = "nav" }: { label: string; aside?: "nav" | "right" }) {
  const bar = (
    <div className="mb-5 flex flex-wrap items-center gap-4 pt-2">
      <div className="flex-1">
        <S className="h-8 w-64 max-w-full rounded-[10px]" />
        <S className="mt-2 h-3.5 w-36 rounded-full" />
      </div>
      <div className="flex gap-2">
        <S className="size-9 rounded-full" />
        <S className="h-9 w-24 rounded-full" />
        <S className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
  if (aside === "right")
    return (
      <Wrap label={label}>
        {bar}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-4">
            <Panel>
              <S className="h-9 w-2/3 rounded-[10px]" />
              <S className="mt-5 h-20 w-full rounded-[11px]" />
            </Panel>
            <Panel>
              <Lines n={9} />
            </Panel>
          </div>
          <div className="space-y-4">
            <Panel>
              <S className="aspect-[16/9] w-full rounded-[14px]" />
            </Panel>
            <Panel>
              <Lines n={5} />
            </Panel>
          </div>
        </div>
      </Wrap>
    );
  return (
    <Wrap label={label}>
      {bar}
      <div className="grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] xl:gap-10">
        <div className="hidden space-y-1.5 lg:block">
          {Array.from({ length: 7 }, (_, i) => (
            <S key={i} className="h-9 w-full rounded-[11px]" />
          ))}
        </div>
        <div className="max-w-[52rem] space-y-4">
          <Panel>
            <div className="grid gap-5 sm:grid-cols-2">
              <S className="h-10 rounded-[11px] sm:col-span-2" />
              <S className="h-10 rounded-[11px] sm:col-span-2" />
              <S className="h-10 rounded-[11px]" />
              <S className="h-10 rounded-[11px]" />
            </div>
          </Panel>
          <Panel>
            <S className="h-56 w-full rounded-[11px]" />
          </Panel>
        </div>
      </div>
    </Wrap>
  );
}

export function ContentSkeleton() {
  return (
    <Wrap label="Loading site content">
      <Header />
      <S className="mb-6 h-9 w-96 max-w-full rounded-full" />
      <div className="max-w-[52rem] space-y-7">
        {Array.from({ length: 2 }, (_, g) => (
          <div key={g}>
            <S className="mb-3 h-4 w-32 rounded-full" />
            <div className="overflow-hidden rounded-[20px] bg-panel shadow-tile">
              <Rows n={3} avatar={false} />
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}
