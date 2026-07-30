import type { ToolExecutionOptions } from "ai";

type Executable<INPUT, OUTPUT> = {
  execute?: (
    input: INPUT,
    options: ToolExecutionOptions<never>,
  ) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;
};

/**
 * Calls a built-in tool's `execute` directly, bypassing the model loop these tools are
 * normally invoked from — every tool in this module resolves in one step (never an
 * AsyncIterable), so this narrows that away for callers.
 */
export async function callTool<INPUT, OUTPUT>(
  toolDef: Executable<INPUT, OUTPUT>,
  input: INPUT,
): Promise<OUTPUT> {
  const options: ToolExecutionOptions<never> = {
    toolCallId: "test-call",
    messages: [],
    context: undefined as never,
  };
  const result = await toolDef.execute!(input, options);
  if (result !== null && typeof result === "object" && Symbol.asyncIterator in result) {
    throw new Error("callTool test helper does not support async-iterable tool results");
  }
  return result as OUTPUT;
}
