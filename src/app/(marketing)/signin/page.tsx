import { redirect } from "next/navigation";
import { auth, signIn } from "@/server/auth";
import { Button, Card, CardDescription, CardTitle, Container } from "@/ui";

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
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" className="w-full" data-testid="google-signin">
            Continue with Google
          </Button>
        </form>
      </Card>
    </Container>
  );
}
