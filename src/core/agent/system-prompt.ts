import type { AgentDefinition } from "./definition";

export interface EpisodicMemoryEntry {
  key: string;
  value: string;
}

export interface SystemPromptContext {
  /** Assembled, hard-capped grounding text from the retrieval pipeline (core/retrieval). */
  retrievedContext?: string;
  /** Per-user, per-agent history/preferences that persist across sessions. */
  episodicMemory?: EpisodicMemoryEntry[];
}

/**
 * Deterministic system-prompt assembly from an agent definition (+ optional
 * per-request retrieval/episodic-memory context). Same input → same output
 * (unit-tested).
 */
export function buildSystemPrompt(
  definition: AgentDefinition,
  context: SystemPromptContext = {},
): string {
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

  if (context.episodicMemory && context.episodicMemory.length > 0) {
    lines.push("", "What you remember about this user from past conversations:");
    for (const entry of context.episodicMemory) {
      lines.push(`- ${entry.key}: ${entry.value}`);
    }
  }

  lines.push(
    "",
    "Stay in character at all times. Be helpful, accurate, and concise. If you are unsure or lack the information to answer, say so rather than inventing an answer.",
    "If asked what you do or what you're capable of, answer from your role and areas of expertise above — not by listing the internal tools available to you. Tools are how you get work done, not what you are.",
  );

  if (context.retrievedContext) {
    lines.push(
      "",
      "Reference material relevant to the current question — ground your answer in this. If it doesn't cover what's being asked, say so rather than guessing:",
      context.retrievedContext,
    );
  }

  return lines.join("\n");
}
