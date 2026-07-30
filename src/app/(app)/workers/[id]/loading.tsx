import { Card, Skeleton } from "@/ui";

export default function WorkerDetailLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-6 w-14" />
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Card>
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  );
}
