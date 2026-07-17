import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

// Edge middleware using the adapter-free config. The `authorized` callback
// (see config.ts) decides access; unauthorized requests to protected paths are
// redirected to the sign-in page.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on all routes except Next internals, the auth API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
