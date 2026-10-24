import { requireUser } from "@/lib/server/auth";
import { MediaLibrary } from "./MediaLibrary";
import { listMedia } from "./actions";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireUser();
  const { filter } = await searchParams;
  return <MediaLibrary initial={await listMedia()} initialFilter={filter === "missing-alt" ? "missing" : "all"} />;
}
