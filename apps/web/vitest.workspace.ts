import { defineWorkspace } from "vitest/config";
import path from "path";

const sharedAlias = {
  "@": path.resolve(__dirname, "./src"),
  "@famm/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
  "@famm/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
  "@famm/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
  "@famm/events": path.resolve(__dirname, "../../packages/events/src/index.ts"),
  "@famm/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
};

export default defineWorkspace([
  {
    test: {
      name: "unit",
      globals: true,
      environment: "node",
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.integration.test.ts", "node_modules/**"],
    },
    resolve: { alias: sharedAlias },
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
    resolve: { alias: sharedAlias },
  },
]);
