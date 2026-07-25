import { Button, CardDescription, CardTitle } from "@/ui";

// The retrieval pipeline itself (chunk -> embed -> hybrid search -> re-rank ->
// assemble) now exists (Phase 7) and is wired into runAgent() for any agent
// whose definition declares memory.semantic/procedural sources. What's still
// missing is a UI-driven upload/ingestion flow for agents created here in the
// wizard — today, ingesting knowledge means editing the agent's YAML and
// running `npm run ingest`. This step stays informational until that UI lands.
export function StepKnowledge() {
  return (
    <div>
      <CardTitle>Knowledge base</CardTitle>
      <CardDescription>
        Give this employee documents or a connected source to ground its answers in. There&apos;s no
        upload flow yet — you can skip this step for now and add knowledge later.
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
