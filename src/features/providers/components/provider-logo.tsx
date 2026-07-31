import { Cpu } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Providers with a real vendor mark in `public/logos/{id}.svg` (see
 * public/logos/NOTICE.md). Anything not in this set — today just "custom" —
 * falls back to a generic icon, since there's no real vendor to depict.
 */
const KNOWN_LOGO_IDS = new Set([
  "openai",
  "anthropic",
  "google",
  "google-vertex",
  "azure",
  "amazon-bedrock",
  "cohere",
  "perplexity",
  "fireworks",
  "cerebras",
  "deepinfra",
  "huggingface",
  "openrouter",
  "groq",
  "deepseek",
  "mistral",
  "together",
  "xai",
  "nvidia-nim",
  "ollama",
]);

export function hasProviderLogo(id: string): boolean {
  return KNOWN_LOGO_IDS.has(id);
}

/**
 * A provider's real brand mark on a fixed light chip — deliberately NOT
 * theme-aware. Brand logos (many monochrome ones rely on SVG `currentColor`,
 * which resolves to black once served as a plain <img>, and full-color ones
 * carry their own fixed brand colors either way) need a consistent light
 * backdrop to stay legible and true to the brand regardless of the app's own
 * light/dark theme — the same convention most connector/integration pickers
 * use (VS Code, Notion, Zapier, ...).
 */
export function ProviderLogo({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5 ring-1 ring-black/5",
        className,
      )}
    >
      {hasProviderLogo(id) ? (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed local SVG, not a remote/optimizable image
        <img src={`/logos/${id}.svg`} alt={label} className="h-full w-full object-contain" />
      ) : (
        <Cpu className="h-full w-full text-neutral-500" aria-label={label} />
      )}
    </span>
  );
}
