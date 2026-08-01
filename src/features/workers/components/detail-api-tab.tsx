"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardTitle } from "@/ui";
import {
  apiCodeSnippet,
  apiEndpointFor,
  type ApiLanguage,
  type AuthMode,
} from "../detail-api-snippets";

const LANGUAGES: { value: ApiLanguage; label: string }[] = [
  { value: "curl", label: "cURL" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
];

function pillClasses(active: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-accent text-accent-contrast" : "text-text-muted hover:bg-bg-subtle",
  );
}

export function DetailApiTab({ agentId }: { agentId: string }) {
  const [authMode, setAuthMode] = useState<AuthMode>("api-key");
  const [language, setLanguage] = useState<ApiLanguage>("curl");

  return (
    <Card>
      <CardTitle>API Access</CardTitle>
      <p className="text-text-muted mt-1 text-sm">
        Call this employee from your own backend or app.
      </p>

      <div className="mt-4">
        <p className="text-text-faint text-xs font-medium tracking-wide uppercase">
          Authentication
        </p>
        <div className="bg-bg-subtle mt-2 inline-flex gap-1 rounded-lg p-1">
          <button
            type="button"
            aria-pressed={authMode === "api-key"}
            onClick={() => setAuthMode("api-key")}
            className={pillClasses(authMode === "api-key")}
          >
            API Key
          </button>
          <button
            type="button"
            aria-pressed={authMode === "none"}
            onClick={() => setAuthMode("none")}
            className={pillClasses(authMode === "none")}
          >
            No auth
          </button>
        </div>
        <p className="text-text-faint mt-1.5 text-xs">
          {authMode === "api-key"
            ? "Requires a bearer token per request."
            : "Internal networks only — not recommended."}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-text-faint text-xs font-medium tracking-wide uppercase">Endpoint</p>
        <p className="bg-bg-subtle text-text mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
          <span className="text-accent">POST</span> {apiEndpointFor(agentId)}
        </p>
      </div>

      <div className="mt-4">
        <div className="flex gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              aria-pressed={language === lang.value}
              onClick={() => setLanguage(lang.value)}
              className={pillClasses(language === lang.value)}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <pre className="bg-bg-subtle text-text mt-2 overflow-x-auto rounded-md p-3 text-xs">
          <code>{apiCodeSnippet(agentId, authMode, language)}</code>
        </pre>
      </div>
    </Card>
  );
}
