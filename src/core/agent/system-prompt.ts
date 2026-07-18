import type { AgentDefinition } from "./definition";

/**
 * Deterministic system-prompt assembly from an agent definition. Same input →
 * same output (unit-tested). Retrieval and playbooks are folded in later phases.
 */
export function buildSystemPrompt(definition: AgentDefinition): string {
  const lines: string[] = [
    `You are ${definition.name}, a ${definition.role}.`,
    "",
    `Identity: ${definition.identity}`,
    `Voice and communication style: ${definition.voice}`,
  ];

  if (definition.expertise.length > 0) {
    lines.push("", "Areas of expertise:");
    for (const area of definition.expertise) {
      lines.push(`- ${area}`);
    }
  }

  lines.push(
    "",
    "Stay in character at all times. Be helpful, accurate, and concise. If you are unsure or lack the information to answer, say so rather than inventing an answer.",
  );

  return lines.join("\n");
}
