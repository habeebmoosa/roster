/**
 * Pure route-authorization logic, extracted so it can be unit-tested without
 * spinning up Next.js or Auth.js. Used by the Auth.js `authorized` callback
 * (which drives middleware redirects).
 */

/** Path prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = ["/dashboard", "/settings"] as const;

export function isPathProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Whether a request may proceed. Protected paths require a session; all else is public. */
export function canAccess({
  pathname,
  isLoggedIn,
}: {
  pathname: string;
  isLoggedIn: boolean;
}): boolean {
  if (isPathProtected(pathname)) return isLoggedIn;
  return true;
}
