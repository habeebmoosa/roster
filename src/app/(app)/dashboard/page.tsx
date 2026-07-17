import { auth } from "@/server/auth";
import { Card, CardDescription, CardTitle, Container } from "@/ui";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "there";

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-bold tracking-tight">Welcome, {name}</h1>
      <p className="mt-2 text-neutral-600">
        You&apos;re signed in. Your AI employees arrive in the coming phases.
      </p>
      <Card className="mt-8">
        <CardTitle>Foundation &amp; auth are live</CardTitle>
        <CardDescription>
          Next up (Phase 3): connect your own LLM provider keys and stream your first completion
          through the Vercel AI SDK.
        </CardDescription>
      </Card>
    </Container>
  );
}
