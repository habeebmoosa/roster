import { cookies } from "next/headers";
import { decryptSecret, encryptSecret } from "@/server/crypto/vault";

export const MCP_OAUTH_PENDING_COOKIE = "mcp_oauth_pending";
const MAX_AGE_SECONDS = 600;

/** Everything completeOAuthConnect needs once the browser comes back from the authorization server. Stashed encrypted in a short-lived cookie between the redirect out and the callback. */
export interface PendingOAuthConnect {
  userId: string;
  serverId: string;
  state: string;
  codeVerifier: string;
  resource: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export async function setPendingOAuthConnect(pending: PendingOAuthConnect): Promise<void> {
  const store = await cookies();
  store.set(MCP_OAUTH_PENDING_COOKIE, encryptSecret(JSON.stringify(pending)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

/** Reads and clears the pending-connect cookie. Returns null if absent or unreadable (expired/tampered) — the caller should treat that as "start over". */
export async function takePendingOAuthConnect(): Promise<PendingOAuthConnect | null> {
  const store = await cookies();
  const raw = store.get(MCP_OAUTH_PENDING_COOKIE)?.value;
  store.delete(MCP_OAUTH_PENDING_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(decryptSecret(raw)) as PendingOAuthConnect;
  } catch {
    return null;
  }
}
