import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";
import { isSecret } from "./validation";

/** Public, unguessable board id (~126 bits). */
export function newBoardSlug(): string {
  return nanoid(21);
}

/** adminKey / editToken: 32 random bytes, base64url. Shown once, never stored in clear. */
export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/** Constant-time check of a presented secret against its stored SHA-256 hex hash. */
export function secretMatches(secret: unknown, storedHash: string): boolean {
  if (!isSecret(secret)) return false;
  const presented = Buffer.from(hashSecret(secret), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}

/** Constant-time string comparison (board creation password). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
