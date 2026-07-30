import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests: fast, no external services. Co-located as src/**/*.test.{ts,tsx}.
// Default environment is "node" (fast); component tests opt into jsdom via a
// per-file `// @vitest-environment jsdom` docblock.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
  },
});
