import { execFileSync } from "node:child_process";

export interface LocalSupabase {
  url: string;
  secretKey: string;
  publishableKey: string;
}

/**
 * Reads credentials of the local Supabase stack (`supabase start`). Tests never touch the
 * cloud project. Returns null when the stack is not running.
 */
export function readLocalSupabase(): LocalSupabase | null {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const vars = Object.fromEntries(
      out
        .split("\n")
        .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => [m[1], m[2]]),
    );
    const url = vars.API_URL;
    const secretKey = vars.SECRET_KEY ?? vars.SERVICE_ROLE_KEY;
    const publishableKey = vars.PUBLISHABLE_KEY ?? vars.ANON_KEY;
    if (!url || !secretKey || !publishableKey) return null;
    return { url, secretKey, publishableKey };
  } catch {
    return null;
  }
}

/** Env for the app under test, pointed at the local stack. */
export function localAppEnv(local: LocalSupabase): Record<string, string> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: local.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
    SUPABASE_SECRET_KEY: local.secretKey,
  };
}
