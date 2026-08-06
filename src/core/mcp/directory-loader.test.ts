import { describe, expect, it } from "vitest";
import { loadAllMcpServerDefinitions, loadMcpServerDefinitionFile } from "./directory-loader";

// Guards that the real curated directory files (mcp-servers/*.json) are valid against the schema.
describe("MCP directory loader", () => {
  it("loads and validates the notion definition", () => {
    const def = loadMcpServerDefinitionFile("mcp-servers/notion.json");
    expect(def.id).toBe("notion");
    expect(def.tools.length).toBeGreaterThan(0);
  });

  it("loads every MCP server definition under mcp-servers/", () => {
    const defs = loadAllMcpServerDefinitions("mcp-servers");
    expect(defs.length).toBeGreaterThanOrEqual(25);
    expect(defs.some((d) => d.id === "linear")).toBe(true);
    expect(defs.some((d) => d.id === "github")).toBe(true);
    expect(defs.every((d) => d.id.length > 0)).toBe(true);
  });

  it("gives every curated entry a unique id", () => {
    const defs = loadAllMcpServerDefinitions("mcp-servers");
    expect(new Set(defs.map((d) => d.id)).size).toBe(defs.length);
  });
});
