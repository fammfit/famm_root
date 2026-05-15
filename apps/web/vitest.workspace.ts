import { defineWorkspace } from "vitest/config";
import path from "path";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      globals: true,
      environment: "node",
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.integration.test.ts", "node_modules/**"],
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  },
  {
    test: {
      name: "integration",
      globals: true,
      environment: "node",
      include: ["src/**/*.integration.test.ts"],
      setupFiles: ["src/__tests__/setup/integration.ts"],
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  },
]);
