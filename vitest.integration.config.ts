import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests: require a live Postgres + pgvector (via .env / DATABASE_URL).
// Run serially so shared-table fixtures don't collide.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.integration.ts"],
    globals: false,
    fileParallelism: false,
  },
});
