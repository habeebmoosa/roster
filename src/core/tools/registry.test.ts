import { describe, expect, it } from "vitest";
import { BUILT_IN_TOOLS, resolveBuiltInTools } from "./registry";

describe("resolveBuiltInTools", () => {
  it("returns only the tools an ability list actually enables", () => {
    const tools = resolveBuiltInTools(["calculate", "date_time_math"]);
    expect(Object.keys(tools).sort()).toEqual(["calculate", "date_time_math"]);
  });

  it("ignores ability ids that aren't real built-in tools", () => {
    const tools = resolveBuiltInTools(["draft_reply", "kb_lookup", "calculate"]);
    expect(Object.keys(tools)).toEqual(["calculate"]);
  });

  it("returns an empty set for an empty or all-unknown ability list", () => {
    expect(resolveBuiltInTools([])).toEqual({});
    expect(resolveBuiltInTools(["not-a-real-tool"])).toEqual({});
  });

  it("every entry in BUILT_IN_TOOLS is independently resolvable by its own key", () => {
    for (const id of Object.keys(BUILT_IN_TOOLS)) {
      expect(resolveBuiltInTools([id])).toHaveProperty(id);
    }
  });
});
