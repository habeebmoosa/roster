import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The agent engine (src/core) and generated Prisma client run on Node, not Edge.
  // pdf-parse ships a conditional "browser" export that Next's RSC bundler picks over
  // the Node build when webpack-bundled, breaking at import time — external it so Node's
  // own require() resolves it correctly instead.
  serverExternalPackages: ["@prisma/client", "pdf-parse"],
};

export default nextConfig;
