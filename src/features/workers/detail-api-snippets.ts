export type AuthMode = "api-key" | "none";
export type ApiLanguage = "curl" | "javascript" | "python";

/**
 * The real route this documents (`POST /api/v1/agents/{id}/chat`, Phase 12)
 * accepts exactly this shape: `{messages, provider?, model?, apiKey?, baseUrl?}`,
 * auth via `Authorization: Bearer <platform key>`. `appUrl` (env.APP_URL) is
 * read server-side (`@/lib/env` is server-only) and passed in by the caller —
 * this module must stay import-free of it so it's safe in the "use client"
 * DetailApiTab that renders it.
 */
export function apiEndpointFor(appUrl: string, agentId: string): string {
  return `${appUrl}/api/v1/agents/${agentId}/chat`;
}

/** Pure so the exact rendered text is unit-testable without mounting the tab. */
export function apiCodeSnippet(
  appUrl: string,
  agentId: string,
  authMode: AuthMode,
  language: ApiLanguage,
): string {
  const endpoint = apiEndpointFor(appUrl, agentId);
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
