import { GridSkeleton } from "@/components/admin/skeletons";

export default function Loading() {
  return <GridSkeleton label="Loading destinations" aspect="aspect-[16/10]" filters={false} />;
}
