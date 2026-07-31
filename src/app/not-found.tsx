import Link from "next/link";
import { auth } from "@/server/auth";
import { Button, Container } from "@/ui";

/**
 * Root not-found boundary — catches any route that doesn't match, and any
 * notFound() call from deeper in the tree with no closer boundary of its own.
 */
export default async function NotFound() {
  const session = await auth();
  const homeHref = session?.user ? "/dashboard" : "/";

  return (
    <Container className="flex min-h-screen flex-col items-center justify-center text-center">
      <p className="text-accent text-sm font-medium">404</p>
      <h1 className="text-text mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-text-muted mt-3 max-w-sm text-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href={homeHref} className="mt-6">
        <Button>{session?.user ? "Go to dashboard" : "Go home"}</Button>
      </Link>
    </Container>
  );
}
