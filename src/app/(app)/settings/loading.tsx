import { Card, Skeleton } from "@/ui";

export default function SettingsLoading() {
  return (
    <div className="px-6 py-6">
      <Skeleton className="h-8 w-32" />

      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>

      <Card className="mt-6">
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  );
}
