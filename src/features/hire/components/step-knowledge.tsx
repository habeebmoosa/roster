import { Button, CardDescription, CardTitle } from "@/ui";

// Knowledge base retrieval lands in Phase 7 (hybrid vector + BM25 retrieval). Until then
// this step is informational only — nothing uploaded here is stored or retrievable.
export function StepKnowledge() {
  return (
    <div>
      <CardTitle>Knowledge base</CardTitle>
      <CardDescription>
        Give this employee documents or a connected source to ground its answers in. Retrieval
        isn&apos;t wired up yet — you can skip this step for now and add knowledge later.
      </CardDescription>

      <div className="border-border mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
        <p className="text-text text-sm font-semibold">No knowledge sources yet</p>
        <p className="text-text-muted max-w-sm text-sm">
          Uploading files and connecting sources (Drive, Notion, a URL) is coming in a later phase.
        </p>
        <div className="mt-1 flex gap-2">
          <Button variant="secondary" disabled title="Coming soon">
            Upload files
          </Button>
          <Button variant="secondary" disabled title="Coming soon">
            Connect a source
          </Button>
        </div>
      </div>
    </div>
  );
}
