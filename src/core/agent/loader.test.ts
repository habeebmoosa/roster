import { describe, expect, it } from "vitest";
import { loadAgentDefinitionFile, loadAllAgentDefinitions } from "./loader";

// Guards that the real YAML definition files are valid against the schema.
describe("agent loader", () => {
  it("loads and validates the customer-support definition", () => {
    const def = loadAgentDefinitionFile("agents/customer-support/agent.yaml");
    expect(def.id).toBe("customer-support");
    expect(def.name).toContain("Ada");
    expect(def.expertise.length).toBeGreaterThan(0);
  });

  it("loads every agent definition under agents/", () => {
    const defs = loadAllAgentDefinitions("agents");
    expect(defs.length).toBeGreaterThanOrEqual(1);
    expect(defs.some((d) => d.id === "customer-support")).toBe(true);
  });
});
