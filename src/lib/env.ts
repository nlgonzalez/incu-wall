import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY is required (server only)"),
  BOARD_CREATION_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ServerEnv = z.infer<typeof schema>;

/** Parsed on use (cheap) so `next build` does not require secrets. */
export function serverEnv(): ServerEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${fields}`);
  }
  return parsed.data;
}

export function boardCreationRequiresPassword(): boolean {
  return Boolean(serverEnv().BOARD_CREATION_PASSWORD);
}
