import { Card, Skeleton } from "@/ui";

export default function WorkersLoading() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Card className="flex flex-col gap-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
