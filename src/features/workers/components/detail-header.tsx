import { Avatar, Badge, Card } from "@/ui";

export function DetailHeader({
  name,
  role,
  status,
}: {
  name: string;
  role: string;
  status: "Active";
}) {
  return (
    <Card className="flex items-center gap-4">
      <Avatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-text truncate text-xl font-bold tracking-tight">{name}</h1>
          <Badge variant="success">{status}</Badge>
        </div>
        <p className="text-text-muted mt-0.5 text-sm">{role}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {/* Pause/Edit aren't wired to anything yet — no pause-agent or
            edit-agent flow exists. Same disabled treatment as elsewhere. */}
        <span
          className="text-text-faint border-border cursor-not-allowed rounded-md border px-4 py-2 text-sm font-medium"
          title="Coming soon"
        >
          Pause
        </span>
        <span
          className="text-text-faint border-border cursor-not-allowed rounded-md border px-4 py-2 text-sm font-medium"
          title="Coming soon"
        >
          Edit
        </span>
      </div>
    </Card>
  );
}
