import { createHash, randomBytes } from "node:crypto";

/**
 * Platform API keys are hashed, never encrypted: unlike the BYOK vault
 * (`vault.ts`), a key only ever needs to be *compared* at auth time, so we
 * store a SHA-256 hash and show the raw value to the user exactly once, at
 * creation (same pattern as GitHub PATs / Stripe restricted keys).
 */
const PREFIX = "rk_live_";
const RAW_BYTES = 32; // 256 bits of entropy
const PREFIX_DISPLAY_CHARS = 8; // chars of the random portion shown in the UI

export interface GeneratedApiKey {
  /** The full raw key — return to the caller once, never persist it. */
  rawKey: string;
  /** Safe to store and display — identifies the key without revealing it. */
  keyPrefix: string;
  /** SHA-256 hex digest of `rawKey` — what actually gets persisted. */
  hashedKey: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const rawKey = `${PREFIX}${base64UrlEncode(randomBytes(RAW_BYTES))}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, PREFIX.length + PREFIX_DISPLAY_CHARS),
    hashedKey: hashApiKey(rawKey),
  };
}
