import { Card, Container, Skeleton } from "@/ui";

export default function EvalsLoading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />

      <div className="mt-8">
        <Card className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </Card>
      </div>
    </Container>
  );
}
