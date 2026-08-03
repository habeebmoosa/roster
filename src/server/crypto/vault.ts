import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM vault for BYOK provider keys.
 *
 * Payload format: `v1.<iv>.<authTag>.<ciphertext>` (each part base64).
 * GCM authenticates the ciphertext, so any tampering fails on decrypt.
 *
 * The low-level `encrypt`/`decrypt` take an explicit key (pure + unit-testable);
 * `encryptSecret`/`decryptSecret` use the server-side ENCRYPTION_KEY.
 */
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";

function serverKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decrypt(payload: string, key: Buffer): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION || !parts[1] || !parts[2]) {
    throw new Error("Malformed encrypted payload");
  }
  // ctB64 legitimately empty when the original plaintext was "" (e.g. Ollama's
  // no-API-key credential) — only iv/tag must be non-empty.
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64!, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64 ?? "", "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function encryptSecret(plaintext: string): string {
  return encrypt(plaintext, serverKey());
}

export function decryptSecret(payload: string): string {
  return decrypt(payload, serverKey());
}

/** Non-reversible hint for display. Never exposes the full secret. */
export function maskSecret(plaintext: string): string {
  const tail = plaintext.slice(-4);
  return tail ? `••••${tail}` : "••••";
}
