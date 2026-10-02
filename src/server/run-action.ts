import "server-only";
import type { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { firstIssue } from "@/lib/validation";
import { DomainError } from "./errors";

/** Validates untrusted input, runs the mutation and maps failures to a safe result. */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error), code: "invalid" };
  try {
    return { ok: true, data: await fn(parsed.data) };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, error: error.message, code: error.code };
    console.error("[action] unexpected error", error);
    return { ok: false, error: "No pudimos completar la acción. Probá de nuevo en un momento." };
  }
}
