import { Card, Skeleton } from "@/ui";

export default function HireLoading() {
  return (
    <div className="px-6 py-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mx-auto mt-6 max-w-2xl">
        <div className="flex justify-between gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-2 flex-1 rounded-full" />
          ))}
        </div>
        <Card className="mt-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    </div>
  );
}
