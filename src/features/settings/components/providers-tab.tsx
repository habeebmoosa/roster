import { getProvider } from "@/core/providers/catalog";
import { AddProviderForm } from "@/features/providers";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { Card, CardDescription, CardTitle } from "@/ui";
import { DeleteProviderButton } from "./delete-provider-button";

export function ProvidersTab({ keys }: { keys: ProviderKeyRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted text-sm">
        Bring your own key. Encrypted at rest, decrypted only when a request runs.
      </p>

      <Card>
        <CardTitle>Configured providers</CardTitle>
        {keys.length === 0 ? (
          <CardDescription>No providers yet. Add one below to get started.</CardDescription>
        ) : (
          <ul className="divide-border mt-4 divide-y">
            {keys.map((key) => {
              const entry = getProvider(key.provider);
              return (
                <li key={key.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-text truncate text-sm font-medium">
                      {entry?.label ?? key.provider}
                    </p>
                    <p className="text-text-muted truncate text-sm">
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
  );
}
