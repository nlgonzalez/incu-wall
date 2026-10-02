import { defineConfig, devices } from "@playwright/test";
import { localAppEnv, readLocalSupabase } from "./tests/support/local-supabase";

const local = readLocalSupabase();
if (!local) {
  throw new Error("E2E tests need the local Supabase stack. Run `pnpm db:start` (Docker) first.");
}

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Production build against the LOCAL Supabase stack — never the cloud project.
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...localAppEnv(local),
      BOARD_CREATION_PASSWORD: "",
      ALLOW_LOCAL_IMAGE_IP: "1",
    },
  },
});
