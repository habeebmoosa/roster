import { describe, expect, it } from "vitest";
import { parseMcpServerDefinition } from "./directory";

const VALID_DEFINITION = {
  id: "acme-crm",
  name: "Acme CRM",
  description: "Search and update Acme CRM contacts",
  connectorUrl: "https://mcp.acme.example/mcp",
  authType: "oauth_dcr",
  trustTier: "community",
};

describe("parseMcpServerDefinition", () => {
  it("parses a minimal valid definition, defaulting optional arrays", () => {
    const definition = parseMcpServerDefinition(VALID_DEFINITION);
    expect(definition.categories).toEqual([]);
    expect(definition.tools).toEqual([]);
    expect(definition.resources).toEqual([]);
  });

  it("parses a fully-populated definition", () => {
    const definition = parseMcpServerDefinition({
      ...VALID_DEFINITION,
      iconUrl: "https://acme.example/icon.png",
      developer: "Acme, Inc.",
      categories: ["CRM"],
      documentationUrl: "https://acme.example/docs",
      tools: [{ name: "search-contacts", description: "Search contacts by name" }],
      resources: [{ name: "contact", description: "A single contact's profile" }],
    });
    expect(definition.tools).toHaveLength(1);
    expect(definition.resources).toHaveLength(1);
  });

  it.each(["oauth_dcr", "static_headers", "none"])("accepts authType %s", (authType) => {
    expect(() => parseMcpServerDefinition({ ...VALID_DEFINITION, authType })).not.toThrow();
  });

  it.each(["verified", "community", "custom"])("accepts trustTier %s", (trustTier) => {
    expect(() => parseMcpServerDefinition({ ...VALID_DEFINITION, trustTier })).not.toThrow();
  });

  it("rejects a non-kebab-case id", () => {
    expect(() => parseMcpServerDefinition({ ...VALID_DEFINITION, id: "Acme CRM" })).toThrow(
      /kebab-case/,
    );
  });

  it("rejects an invalid authType", () => {
    expect(() => parseMcpServerDefinition({ ...VALID_DEFINITION, authType: "api-key" })).toThrow(
      /Invalid MCP server definition/,
    );
  });

  it("rejects a non-URL connectorUrl", () => {
    expect(() =>
      parseMcpServerDefinition({ ...VALID_DEFINITION, connectorUrl: "not-a-url" }),
    ).toThrow(/Invalid MCP server definition/);
  });

  it("accepts a root-relative iconUrl pointing at a local static asset", () => {
    const definition = parseMcpServerDefinition({
      ...VALID_DEFINITION,
      iconUrl: "/connector-logos/acme-crm.svg",
    });
    expect(definition.iconUrl).toBe("/connector-logos/acme-crm.svg");
  });

  it("rejects an iconUrl that is neither a root-relative path nor a full URL", () => {
    expect(() =>
      parseMcpServerDefinition({ ...VALID_DEFINITION, iconUrl: "not-a-url" }),
    ).toThrow(/iconUrl/);
  });

  it("rejects a missing required field", () => {
    const withoutDescription: Record<string, unknown> = { ...VALID_DEFINITION };
    delete withoutDescription.description;
    expect(() => parseMcpServerDefinition(withoutDescription)).toThrow(/description/);
  });
});
