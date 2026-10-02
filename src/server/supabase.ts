import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

export const MEDIA_BUCKET = "board-media";

let client: Db | undefined;

/** Privileged client (secret key). Server only — bypasses RLS by design. */
export function db(): Db {
  if (!client) {
    const env = serverEnv();
    client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
