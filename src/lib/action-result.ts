export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "not-found" | "closed" | "forbidden" | "invalid" };
