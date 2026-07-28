import {
  findActiveApiKeyByRawKey,
  touchApiKeyLastUsed,
} from "@/server/db/repositories/api-key.repository";

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Parses `Authorization: Bearer rk_live_...`, hashes the raw key, and looks up
 * its owner — the REST API's auth path, distinct from the chat UI's session
 * cookie. Throws {@link UnauthorizedError} for a missing header, a malformed
 * scheme, or a key that's unknown/revoked (all indistinguishable to a caller,
 * same as the chat surface never revealing *why* a key is bad).
 */
export async function authenticateApiKey(
  authorizationHeader: string | null,
): Promise<{ userId: string; apiKeyId: string }> {
  const rawKey = authorizationHeader?.match(/^Bearer\s+(.+)$/)?.[1];
  if (!rawKey) {
    throw new UnauthorizedError("Missing or malformed Authorization header.");
  }

  const found = await findActiveApiKeyByRawKey(rawKey);
  if (!found) {
    throw new UnauthorizedError("Invalid or revoked API key.");
  }

  await touchApiKeyLastUsed(found.id);
  return { userId: found.userId, apiKeyId: found.id };
}
