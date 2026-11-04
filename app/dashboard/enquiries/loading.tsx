import { ListSkeleton } from "@/components/admin/skeletons";

export default function Loading() {
  return <ListSkeleton label="Loading enquiries" rows={7} side />;
}
