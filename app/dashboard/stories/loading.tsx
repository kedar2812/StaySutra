import { ListSkeleton } from "@/components/admin/skeletons";

export default function Loading() {
  return <ListSkeleton label="Loading stories" rows={5} filters={false} />;
}
