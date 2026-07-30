import { Card, Skeleton } from "@/ui";

export default function ConnectorsLoading() {
  return (
    <div className="px-6 py-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 flex justify-end">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
