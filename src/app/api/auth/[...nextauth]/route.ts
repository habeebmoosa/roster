import { handlers } from "@/server/auth";

// The Prisma adapter requires the Node.js runtime.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
