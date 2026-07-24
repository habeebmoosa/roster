import {
  ApiKeysTab,
  BillingTab,
  ProfileTab,
  ProvidersTab,
  SettingsTabs,
  WorkspaceTab,
} from "@/features/settings";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await auth();
  const keys = session?.user?.id ? await listUserProviders(session.user.id) : [];

  const name = session?.user?.name ?? "Account";
  const email = session?.user?.email ?? "";

  return (
    <div className="px-6 py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">Settings</h1>

      <div className="mt-6">
        <SettingsTabs
          initialTab={tab ?? "workspace"}
          workspace={<WorkspaceTab initialName={name} />}
          profile={<ProfileTab name={name} email={email} />}
          providers={<ProvidersTab keys={keys} />}
          apiKeys={<ApiKeysTab />}
          billing={<BillingTab />}
        />
      </div>
    </div>
  );
}
