import { redirect } from "next/navigation";
import { auth, signIn } from "@/server/auth";
import { enabledSignInProviders, type SignInProviderId } from "@/server/auth/config";
import { Button, Card, CardDescription, CardTitle, Container } from "@/ui";

const PROVIDER_LABELS: Record<SignInProviderId, string> = {
  google: "Continue with Google",
  github: "Continue with GitHub",
};

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <Container className="flex min-h-screen items-center justify-center py-20">
      <Card className="w-full max-w-sm text-center">
        <CardTitle>Sign in to Roster</CardTitle>
        <CardDescription>
          Hire AI employees that work like experts on any LLM you bring.
        </CardDescription>
        <div className="mt-6 flex flex-col gap-3">
          {enabledSignInProviders().map((provider) => (
            <form
              key={provider}
              action={async () => {
                "use server";
                await signIn(provider, { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" className="w-full" data-testid={`${provider}-signin`}>
                {PROVIDER_LABELS[provider]}
              </Button>
            </form>
          ))}
        </div>
      </Card>
    </Container>
  );
}
