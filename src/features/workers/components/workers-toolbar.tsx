import { Card, Input } from "@/ui";

export function WorkersToolbar({ query }: { query: string }) {
  return (
    <Card className="p-3">
      {/* Plain GET form — no client JS needed; submitting navigates to ?q=... */}
      <form action="/workers" method="get" role="search" className="flex items-center gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Filter by name or role…"
          aria-label="Filter workers"
          className="max-w-xs"
        />
      </form>
    </Card>
  );
}
