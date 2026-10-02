import { vi } from "vitest";

if (!process.env.SUPABASE_SECRET_KEY) {
  throw new Error(
    "Integration tests need the local Supabase stack. Run `pnpm db:start` (Docker) first.",
  );
}

// Server Actions call into Next.js request APIs; outside a request we stub them.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
