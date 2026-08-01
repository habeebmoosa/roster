/**
 * Live introspection for Ollama — its models are whatever the user has
 * pulled locally, so there's no external catalog to sync (see
 * UNCATALOGED_PROVIDERS in core/models/models-dev.ts). `/api/tags` is
 * Ollama's *native* API, not the OpenAI-compatible `/v1` path our stored
 * `baseUrl` points at — confirmed shape via Ollama's own docs (2026-07-31):
 * `{ models: [{ name, modified_at, size, digest, details }] }`.
 */
export interface OllamaModelInfo {
  modelId: string;
  label: string;
  sizeBytes: number | null;
}

function nativeApiRoot(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, "");
}

export async function listOllamaModels(baseUrl: string): Promise<OllamaModelInfo[]> {
  const res = await fetch(`${nativeApiRoot(baseUrl)}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Ollama /api/tags failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { models?: { name: string; size?: number }[] };
  return (data.models ?? []).map((m) => ({
    modelId: m.name,
    label: m.name,
    sizeBytes: m.size ?? null,
  }));
}
