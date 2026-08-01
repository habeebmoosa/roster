import { NextResponse } from "next/server";
import type { ModelOption } from "@/core/models/model-option";
import { listModelsForProvider } from "@/server/db/repositories/model-catalog.repository";
import { auth } from "@/server/auth";
import { listOllamaModels } from "@/server/models/ollama";

export const runtime = "nodejs";

/**
 * Model options for one provider — from the synced catalog (models.dev), or,
 * for Ollama, a live introspection of the given `?baseUrl=` (its models are
 * whatever the user has actually pulled, not something any external catalog
 * could know). Providers with neither (e.g. "custom") just get `[]` — the UI
 * falls back to free text, never an error.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { provider } = await params;

  if (provider === "ollama") {
    const baseUrl = new URL(req.url).searchParams.get("baseUrl");
    if (!baseUrl) return NextResponse.json({ models: [] satisfies ModelOption[] });
    try {
      const models = await listOllamaModels(baseUrl);
      const options: ModelOption[] = models.map((m) => ({ modelId: m.modelId, label: m.label }));
      return NextResponse.json({ models: options });
    } catch {
      // Unreachable/misconfigured local instance — not worth a hard error, the
      // credential form just falls back to a free-text model field.
      return NextResponse.json({ models: [] satisfies ModelOption[] });
    }
  }

  const records = await listModelsForProvider(provider);
  const options: ModelOption[] = records.map((r) => ({
    modelId: r.modelId,
    label: r.label,
    contextWindow: r.contextWindow,
    maxOutputTokens: r.maxOutputTokens,
    inputPricePerMTok: r.inputPricePerMTok,
    outputPricePerMTok: r.outputPricePerMTok,
    reasoningSupport: r.reasoningSupport,
    toolCallSupport: r.toolCallSupport,
  }));
  return NextResponse.json({ models: options });
}
