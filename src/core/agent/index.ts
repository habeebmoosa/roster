export {
  agentDefinitionSchema,
  parseAgentDefinition,
  preserveRuntimeModel,
  type AgentDefinition,
} from "./definition";
export {
  buildSystemPrompt,
  type EpisodicMemoryEntry,
  type SystemPromptContext,
} from "./system-prompt";
export {
  runAgent,
  type AgentMessage,
  type RunAgentInput,
  type RunAgentResult,
  type RunAgentUsage,
} from "./run-agent";
export type { MessagePart } from "./message-part";
export { MessagePartsAccumulator } from "./message-parts-accumulator";
// Note: loader.ts (node fs + yaml) is intentionally NOT re-exported here — import
// it directly from "@/core/agent/loader" in server/seed code only.
