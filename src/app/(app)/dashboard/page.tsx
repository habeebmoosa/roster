import { Card, CardDescription, CardTitle, Container } from "@/ui";

export default function DashboardPage() {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-neutral-600">
        The authenticated app shell arrives in Phase 2 (Google OAuth + protected routes).
      </p>
      <Card className="mt-8">
        <CardTitle>Foundation is live</CardTitle>
        <CardDescription>
          Next.js + TypeScript, a configurable Postgres with pgvector, and the quality gates are in
          place. Check <code className="text-brand font-mono">/api/health</code> for status.
        </CardDescription>
      </Card>
    </Container>
  );
}
