import { describe, expect, it } from "vitest";
import { apiCodeSnippet, apiEndpointFor } from "./detail-api-snippets";

describe("apiEndpointFor", () => {
  it("builds the chat endpoint for a given agent id", () => {
    expect(apiEndpointFor("customer-support")).toBe(
      "https://api.rosterai.com/v1/agents/customer-support/chat",
    );
  });
});

describe("apiCodeSnippet", () => {
  it("includes an Authorization header when authMode is api-key", () => {
    const curl = apiCodeSnippet("customer-support", "api-key", "curl");
    expect(curl).toContain("Authorization: Bearer YOUR_API_KEY");

    const js = apiCodeSnippet("customer-support", "api-key", "javascript");
    expect(js).toContain('Authorization: "Bearer YOUR_API_KEY"');

    const py = apiCodeSnippet("customer-support", "api-key", "python");
    expect(py).toContain('"Authorization": "Bearer YOUR_API_KEY"');
  });

  it("omits the Authorization header when authMode is none", () => {
    for (const lang of ["curl", "javascript", "python"] as const) {
      expect(apiCodeSnippet("customer-support", "none", lang)).not.toContain("Authorization");
    }
  });

  it("embeds the real agent id and endpoint in every language", () => {
    for (const lang of ["curl", "javascript", "python"] as const) {
      const snippet = apiCodeSnippet("content-writer", "api-key", lang);
      expect(snippet).toContain("https://api.rosterai.com/v1/agents/content-writer/chat");
    }
  });
});
