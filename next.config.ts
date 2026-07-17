import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The agent engine (src/core) and generated Prisma client run on Node, not Edge.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
