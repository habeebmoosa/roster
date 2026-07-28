import type { ApiKeySummary } from "@/server/db/repositories/api-key.repository";
import { Card, EmptyState } from "@/ui";
import { formatApiKeyDate } from "../format-date";
import { CreateApiKeyForm } from "./create-api-key-form";
import { RevokeApiKeyButton } from "./revoke-api-key-button";

export function ApiKeysTab({ keys }: { keys: ApiKeySummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">
          Use these to call your employees from your own backend or third-party tools.
        </p>
        <CreateApiKeyForm />
      </div>

      <Card>
        {keys.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Create one to call your employees programmatically."
          />
        ) : (
          <ul className="divide-border divide-y">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-text truncate text-sm font-medium">{key.label}</p>
                  <p className="text-text-muted truncate font-mono text-xs">
                    {key.keyPrefix}••••••••
                  </p>
                  <p className="text-text-faint mt-0.5 text-xs">
                    Created {formatApiKeyDate(key.createdAt)} · Last used{" "}
                    {key.lastUsedAt ? formatApiKeyDate(key.lastUsedAt) : "Never"}
                  </p>
                </div>
                {key.revokedAt ? (
                  <span className="text-text-faint text-xs">
                    Revoked {formatApiKeyDate(key.revokedAt)}
                  </span>
                ) : (
                  <RevokeApiKeyButton id={key.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
