import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * All external configuration crosses exactly one validated boundary. The app
 * refuses to boot on invalid config: any access to `env` triggers validation
 * and throws a readable error listing every problem.
 *
 * Import `env` from server code only (it reads process.env). For unit testing,
 * use the pure `parseEnv(source)` function.
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: "must be a valid Postgres connection URL" }),
  DIRECT_URL: z.string().url({ message: "must be a valid Postgres connection URL" }).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth.js — used to sign/encrypt the session JWT. Generate with `openssl rand -base64 33`.
  AUTH_SECRET: z.string().min(1, { message: "required — run `openssl rand -base64 33`" }),
  // Optional: the canonical app URL. Auth.js infers it in dev; set in production.
  AUTH_URL: z.string().url().optional(),

  // Google OAuth credentials (from the Google Cloud console).
  GOOGLE_CLIENT_ID: z.string().min(1, { message: "required for Google sign-in" }),
  GOOGLE_CLIENT_SECRET: z.string().min(1, { message: "required for Google sign-in" }),

  // Server-side secret for the BYOK vault (AES-256-GCM). Must decode to 32 bytes.
  // Generate with `openssl rand -base64 32`.
  ENCRYPTION_KEY: z.string().refine((v) => decodesTo32Bytes(v), {
    message: "must be 32 bytes, base64-encoded — run `openssl rand -base64 32`",
  }),
});

function decodesTo32Bytes(value: string): boolean {
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export type Env = z.infer<typeof envSchema>;

/** Pure, testable parser. Throws a formatted error on invalid input. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration. Fix the following and restart:\n${issues}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

/**
 * Lazily-validated, typed environment. Validation happens on first property
 * access (i.e. at startup, when the first server module reads it) rather than
 * at import time, so importing `parseEnv` for tests never triggers it.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    cached ??= parseEnv();
    return cached[prop as keyof Env];
  },
});
