import { Skeleton } from "@/ui";

export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center justify-between border-b p-3">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="border-border border-t p-4">
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
