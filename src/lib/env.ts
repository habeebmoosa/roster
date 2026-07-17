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
});

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
