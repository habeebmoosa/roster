import Link from "next/link";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";
import { Card, CardDescription, CardTitle, Container } from "@/ui";
import { Playground } from "./playground";

export default async function PlaygroundPage() {
  const session = await auth();
  const keys = session?.user?.id ? await listUserProviders(session.user.id) : [];
  const configured = keys.map((key) => key.provider);

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
      <p className="mt-2 text-neutral-600">
        Send a prompt to any model you&apos;ve configured and watch it stream back — BYOK, proven
        end-to-end.
      </p>

      <div className="mt-8">
        {configured.length === 0 ? (
          <Card>
            <CardTitle>No providers configured</CardTitle>
            <CardDescription>
              Add a provider key first, then come back to stream a completion.{" "}
              <Link href="/settings/providers" className="text-brand hover:underline">
                Add a provider →
              </Link>
            </CardDescription>
          </Card>
        ) : (
          <Playground configured={configured} />
        )}
      </div>
    </Container>
  );
}
