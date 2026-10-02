import path from "node:path";
import { defineConfig } from "vitest/config";
import { localAppEnv, readLocalSupabase } from "./tests/support/local-supabase";

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  // `server-only` throws outside the Next.js server bundle; tests run server code directly.
  "server-only": path.resolve(import.meta.dirname, "tests/support/empty.ts"),
};

const wantsIntegration = !process.argv.includes("unit");
const local = wantsIntegration ? readLocalSupabase() : null;

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/support/integration-setup.ts"],
          env: local ? { ...localAppEnv(local), BOARD_CREATION_PASSWORD: "" } : {},
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
