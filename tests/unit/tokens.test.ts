import { describe, expect, it } from "vitest";
import { hashSecret, newBoardSlug, newSecret, safeEqual, secretMatches } from "@/lib/tokens";
import { BOARD_SLUG_RE, SECRET_RE } from "@/lib/validation";

describe("tokens", () => {
  it("board slugs are 21 URL-safe chars and unique", () => {
    const slugs = new Set(Array.from({ length: 1000 }, newBoardSlug));
    expect(slugs.size).toBe(1000);
    for (const slug of slugs) expect(slug).toMatch(BOARD_SLUG_RE);
  });

  it("secrets are 32 bytes base64url (43 chars)", () => {
    const secret = newSecret();
    expect(secret).toMatch(SECRET_RE);
    expect(Buffer.from(secret, "base64url")).toHaveLength(32);
    expect(newSecret()).not.toBe(secret);
  });

  it("stores only a SHA-256 hex hash that differs from the secret", () => {
    const secret = newSecret();
    const hash = hashSecret(secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(secret);
  });

  it("matches the right secret and rejects wrong or malformed ones", () => {
    const secret = newSecret();
    const hash = hashSecret(secret);
    expect(secretMatches(secret, hash)).toBe(true);
    expect(secretMatches(newSecret(), hash)).toBe(false);
    expect(secretMatches(secret.slice(0, -1) + (secret.endsWith("A") ? "B" : "A"), hash)).toBe(
      false,
    );
    expect(secretMatches("short", hash)).toBe(false);
    expect(secretMatches(undefined, hash)).toBe(false);
    expect(secretMatches(123, hash)).toBe(false);
  });

  it("safeEqual compares strings of any length", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});
