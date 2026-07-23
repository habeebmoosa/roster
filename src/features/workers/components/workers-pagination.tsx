import Link from "next/link";
import { cn } from "@/lib/cn";

export function WorkersPagination({
  page,
  totalPages,
  total,
  query,
}: {
  page: number;
  totalPages: number;
  total: number;
  query: string;
}) {
  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(targetPage));
    return `/workers?${params.toString()}`;
  };

  const linkClasses = (disabled: boolean) =>
    cn(
      "border-border rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
      disabled ? "text-text-faint pointer-events-none opacity-50" : "text-text hover:bg-bg-subtle",
    );

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-text-muted text-sm">
        {total === 0 ? "No workers" : `Viewing page ${page} of ${totalPages} · ${total} total`}
      </p>
      <div className="flex gap-2">
        <Link href={hrefFor(page - 1)} className={linkClasses(page <= 1)} aria-disabled={page <= 1}>
          Previous
        </Link>
        <Link
          href={hrefFor(page + 1)}
          className={linkClasses(page >= totalPages)}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
