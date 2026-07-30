import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chunkText } from "@/core/knowledge/chunk";
import { embedTexts, getProvider, type ResolveEmbeddingModelInput } from "@/core/providers";
import type { AgentDefinition } from "@/core/agent";
import {
  deleteKnowledgeBySourceUri,
  insertKnowledgeChunks,
} from "@/server/db/repositories/agent-knowledge.repository";

export interface IngestSourceResult {
  sourceUri: string;
  chunksIngested: number;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
}

interface RawSource {
  kind: "semantic" | "procedural";
  sourceUri: string;
  content: string;
}

/**
 * Read the filesystem sources an agent's YAML definition declares: every file
 * under `<agentDir>/knowledge/` for each `kb://<name>` in `memory.semantic`
 * (source uri `kb://<name>/<file>`), and `<agentDir>/playbooks/<name>.md` for
 * each `playbook://<name>` in `memory.procedural` (source uri unchanged).
 */
export async function loadAgentSources(
  definition: AgentDefinition,
  agentDir: string,
): Promise<RawSource[]> {
  const sources: RawSource[] = [];

  for (const uri of definition.memory.semantic) {
    const name = uri.replace(/^kb:\/\//, "");
    const knowledgeDir = path.join(agentDir, "knowledge");
    for (const file of await listMarkdownFiles(knowledgeDir)) {
      const content = await readFile(path.join(knowledgeDir, file), "utf8");
      sources.push({ kind: "semantic", sourceUri: `kb://${name}/${file}`, content });
    }
  }

  for (const uri of definition.memory.procedural) {
    const name = uri.replace(/^playbook:\/\//, "");
    const filePath = path.join(agentDir, "playbooks", `${name}.md`);
    const content = await readFile(filePath, "utf8");
    sources.push({ kind: "procedural", sourceUri: uri, content });
  }

  return sources;
}

/**
 * Chunk, embed, and store one source's content, replacing any previously
 * ingested chunks for that exact source uri (idempotent re-ingestion).
 */
async function ingestSource(
  agentId: string,
  source: RawSource,
  embedInput: ResolveEmbeddingModelInput,
): Promise<IngestSourceResult> {
  const chunks = chunkText(source.content);
  if (chunks.length === 0) {
    await deleteKnowledgeBySourceUri(agentId, source.sourceUri);
    return { sourceUri: source.sourceUri, chunksIngested: 0 };
  }

  const embeddings = await embedTexts(
    embedInput,
    chunks.map((c) => c.content),
  );
  // embedTexts() only succeeds for a catalog entry that declares one, so this is always set here.
  const embeddingModel = getProvider(embedInput.provider)!.embeddingModel!;

  await deleteKnowledgeBySourceUri(agentId, source.sourceUri);
  await insertKnowledgeChunks(
    chunks.map((chunk, i) => ({
      agentId,
      kind: source.kind,
      sourceUri: source.sourceUri,
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: embeddings[i]!,
      embeddingProvider: embedInput.provider,
      embeddingModel,
    })),
  );

  return { sourceUri: source.sourceUri, chunksIngested: chunks.length };
}

export interface IngestAgentKnowledgeInput {
  definition: AgentDefinition;
  agentDir: string;
  embedInput: ResolveEmbeddingModelInput;
}

/** Ingest every knowledge/playbook source an agent's definition declares. */
export async function ingestAgentKnowledge(
  input: IngestAgentKnowledgeInput,
): Promise<IngestSourceResult[]> {
  const sources = await loadAgentSources(input.definition, input.agentDir);
  const results: IngestSourceResult[] = [];
  for (const source of sources) {
    results.push(await ingestSource(input.definition.id, source, input.embedInput));
  }
  return results;
}
