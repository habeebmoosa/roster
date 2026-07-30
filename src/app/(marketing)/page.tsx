import Link from "next/link";
import { auth } from "@/server/auth";
import { Button, Card, CardDescription, CardTitle, Container } from "@/ui";

const EMPLOYEES = [
  { name: "Customer Support", blurb: "Resolves tickets, de-escalates, interprets policy." },
  { name: "Content Writer", blurb: "Drafts on-brand content with the right tone." },
  { name: "Research Analyst", blurb: "Investigates topics and summarizes with citations." },
  { name: "Financial Analyst", blurb: "Analyzes numbers and explains the why." },
  { name: "Team Organizer", blurb: "Turns goals into plans and agendas." },
];

export default async function HomePage() {
  const session = await auth();

  return (
    <Container className="py-20">
      <main>
        <p className="text-accent text-sm font-medium">AI Employees</p>
        <h1 data-testid="app-title" className="mt-2 text-5xl font-bold tracking-tight">
          Roster
        </h1>
        <p className="text-text-muted mt-4 max-w-2xl text-lg">
          Hire specialized AI employees that perform like experts on{" "}
          <span className="text-text font-medium">any LLM you bring</span> — because we engineer the
          expertise into the agent, not the model.
        </p>

        <div className="mt-8">
          {session?.user ? (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <Link href="/signin">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EMPLOYEES.map((employee) => (
            <Card key={employee.name}>
              <CardTitle>{employee.name}</CardTitle>
              <CardDescription>{employee.blurb}</CardDescription>
            </Card>
          ))}
        </section>
      </main>
    </Container>
  );
}
