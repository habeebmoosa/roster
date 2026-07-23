import Link from "next/link";
import { getProvider } from "@/core/providers/catalog";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";
import { Card, CardDescription, CardTitle, Container } from "@/ui";
import { AddProviderForm } from "./add-provider-form";
import { DeleteProviderButton } from "./delete-provider-button";

export default async function ProvidersSettingsPage() {
  const session = await auth();
  const keys = session?.user?.id ? await listUserProviders(session.user.id) : [];

  return (
    <Container className="py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Provider keys</h1>
        <Link href="/chat" className="text-brand text-sm hover:underline">
          Open chat →
        </Link>
      </div>
      <p className="mt-2 text-neutral-600">
        Bring your own LLM keys. Keys are validated on save and encrypted at rest (AES-256-GCM).
      </p>

      <div className="mt-8 grid gap-4">
        <Card>
          <CardTitle>Configured providers</CardTitle>
          {keys.length === 0 ? (
            <CardDescription>No providers yet. Add one below to get started.</CardDescription>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-100">
              {keys.map((key) => {
                const entry = getProvider(key.provider);
                return (
                  <li key={key.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{entry?.label ?? key.provider}</p>
                      <p className="text-sm text-neutral-500">
                        {key.baseUrl ?? entry?.defaultBaseUrl ?? "default endpoint"}
                      </p>
                    </div>
                    <DeleteProviderButton provider={key.provider} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <AddProviderForm />
      </div>
    </Container>
  );
}
