export type AuthMode = "api-key" | "none";
export type ApiLanguage = "curl" | "javascript" | "python";

const ENDPOINT_BASE = "https://api.rosterai.com/v1/agents";

/** Real agent id, aspirational endpoint — the REST API itself lands in Phase 11. */
export function apiEndpointFor(agentId: string): string {
  return `${ENDPOINT_BASE}/${agentId}/chat`;
}

/** Pure so the exact rendered text is unit-testable without mounting the tab. */
export function apiCodeSnippet(agentId: string, authMode: AuthMode, language: ApiLanguage): string {
  const endpoint = apiEndpointFor(agentId);
  const withAuth = authMode === "api-key";

  switch (language) {
    case "curl":
      return [
        `curl -X POST ${endpoint} \\`,
        `  -H "Content-Type: application/json" \\`,
        ...(withAuth ? [`  -H "Authorization: Bearer YOUR_API_KEY" \\`] : []),
        `  -d '{"messages":[{"role":"user","content":"Hello"}]}'`,
      ].join("\n");

    case "javascript":
      return [
        `await fetch("${endpoint}", {`,
        `  method: "POST",`,
        `  headers: {`,
        `    "Content-Type": "application/json",`,
        ...(withAuth ? [`    Authorization: "Bearer YOUR_API_KEY",`] : []),
        `  },`,
        `  body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),`,
        `});`,
      ].join("\n");

    case "python":
      return [
        `import requests`,
        ``,
        `requests.post(`,
        `    "${endpoint}",`,
        `    headers={`,
        `        "Content-Type": "application/json",`,
        ...(withAuth ? [`        "Authorization": "Bearer YOUR_API_KEY",`] : []),
        `    },`,
        `    json={"messages": [{"role": "user", "content": "Hello"}]},`,
        `)`,
      ].join("\n");
  }
}
