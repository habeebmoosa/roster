import { Card, Skeleton } from "@/ui";

export default function DashboardLoading() {
  return (
    <div className="px-6 py-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-40 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-4 h-40 w-full" />
        </Card>
      </div>
    </div>
  );
}
