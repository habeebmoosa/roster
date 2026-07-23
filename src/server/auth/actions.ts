"use server";

import { signOut } from "@/server/auth";

/** Used by <form action={signOutAction}> in the client-side profile menu. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
