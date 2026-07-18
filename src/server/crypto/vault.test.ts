import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, maskSecret } from "./vault";

describe("vault", () => {
  const key = randomBytes(32);

  it("round-trips a secret", () => {
    const secret = "sk-super-secret-abcd1234";
    const payload = encrypt(secret, key);
    expect(payload).not.toContain(secret);
    expect(payload.startsWith("v1.")).toBe(true);
    expect(decrypt(payload, key)).toBe(secret);
  });

  it("uses a random IV (different ciphertext each time)", () => {
    expect(encrypt("same", key)).not.toBe(encrypt("same", key));
  });

  it("fails to decrypt with the wrong key", () => {
    const payload = encrypt("secret", key);
    expect(() => decrypt(payload, randomBytes(32))).toThrow();
  });

  it("detects tampering (GCM auth tag)", () => {
    const payload = encrypt("hello", key);
    const parts = payload.split(".");
    const ct = parts[3]!;
    const flipped = (ct[0] === "A" ? "B" : "A") + ct.slice(1);
    const tampered = [parts[0], parts[1], parts[2], flipped].join(".");
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decrypt("not-a-valid-payload", key)).toThrow();
  });

  it("masks a secret without revealing it", () => {
    expect(maskSecret("sk-abcd1234")).toBe("••••1234");
  });
});
