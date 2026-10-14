import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyLoading() {
  return (
    <div aria-label="Loading workspace" className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
