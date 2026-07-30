import { HireWizard } from "@/features/hire";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";

export default async function HirePage() {
  const session = await auth();
  const providerKeys = session?.user?.id ? await listUserProviders(session.user.id) : [];

  return (
    <div className="py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">Hire a new employee</h1>
      <p className="text-text-muted mt-1">
        Set up an AI employee&apos;s identity, knowledge, abilities, and model.
      </p>

      <div className="mt-6">
        <HireWizard providerKeys={providerKeys} />
      </div>
    </div>
  );
}
