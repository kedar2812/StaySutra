import { ListSkeleton } from "@/components/admin/skeletons";

export default function Loading() {
  return <ListSkeleton label="Loading the team" rows={4} filters={false} />;
}
