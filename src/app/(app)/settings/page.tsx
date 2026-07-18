import Link from "next/link";
import { Card, CardDescription, CardTitle, Container } from "@/ui";

export default function SettingsPage() {
  return (
    <Container className="py-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <div className="mt-8 grid gap-4">
        <Card>
          <CardTitle>Provider keys</CardTitle>
          <CardDescription>
            Bring your own LLM keys (OpenAI, Anthropic, Google, and more), with custom base URLs and
            per-provider config.{" "}
            <Link href="/settings/providers" className="text-brand hover:underline">
              Manage providers →
            </Link>
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Platform API keys for programmatic access to your employees. Coming in Phase 10.
          </CardDescription>
        </Card>
      </div>
    </Container>
  );
}
