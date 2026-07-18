export { agentDefinitionSchema, parseAgentDefinition, type AgentDefinition } from "./definition";
export { buildSystemPrompt } from "./system-prompt";
export { runAgent, type AgentMessage, type RunAgentInput } from "./run-agent";
// Note: loader.ts (node fs + yaml) is intentionally NOT re-exported here — import
// it directly from "@/core/agent/loader" in server/seed code only.
