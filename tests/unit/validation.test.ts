import { describe, expect, it } from "vitest";
import {
  charLength,
  createBoardSchema,
  createMessageSchema,
  isBoardSlug,
  updateMessageSchema,
} from "@/lib/validation";

const slug = "V1StGXR8_Z5jdHi6B-myT";
const photo = { messageId: "4f1c1c43-7b1f-4a43-9c55-7a1f6a3e9a10", width: 1600, height: 1200 };

describe("board slug format (RF-13)", () => {
  it("accepts nanoid(21) and rejects anything else", () => {
    expect(isBoardSlug(slug)).toBe(true);
    expect(isBoardSlug(slug.slice(1))).toBe(false);
    expect(isBoardSlug(slug + "x")).toBe(false);
    expect(isBoardSlug("V1StGXR8_Z5jdHi6B-my!")).toBe(false);
    expect(isBoardSlug("../../etc/passwd/aaaa")).toBe(false);
    expect(isBoardSlug(42)).toBe(false);
  });
});

describe("createBoardSchema (RF-01)", () => {
  it("requires title and recipient; welcome is optional", () => {
    const ok = createBoardSchema.parse({ title: " Chau Marcos ", recipientName: "Marcos" });
    expect(ok).toMatchObject({ title: "Chau Marcos", recipientName: "Marcos", welcomeMessage: null });
    expect(createBoardSchema.safeParse({ title: "", recipientName: "M" }).success).toBe(false);
    expect(createBoardSchema.safeParse({ title: "T", recipientName: "   " }).success).toBe(false);
  });

  it("enforces lengths", () => {
    expect(
      createBoardSchema.safeParse({ title: "x".repeat(101), recipientName: "M" }).success,
    ).toBe(false);
    expect(
      createBoardSchema.safeParse({ title: "T", recipientName: "M", welcomeMessage: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
});

describe("createMessageSchema (RF-04)", () => {
  it("requires an author name of 1–60 chars", () => {
    expect(createMessageSchema.safeParse({ boardSlug: slug, authorName: "", body: "hola" }).success).toBe(false);
    expect(
      createMessageSchema.safeParse({ boardSlug: slug, authorName: "a".repeat(61), body: "hola" }).success,
    ).toBe(false);
    expect(
      createMessageSchema.safeParse({ boardSlug: slug, authorName: "a".repeat(60), body: "hola" }).success,
    ).toBe(true);
  });

  it("allows up to 1000 chars of text, counted as code points", () => {
    const emoji1000 = "🎉".repeat(1000);
    expect(charLength(emoji1000)).toBe(1000);
    expect(createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", body: emoji1000 }).success).toBe(true);
    expect(
      createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", body: "x".repeat(1001) }).success,
    ).toBe(false);
  });

  it("needs text or photo", () => {
    expect(createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", body: "  " }).success).toBe(false);
    expect(createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", photo }).success).toBe(true);
    const parsed = createMessageSchema.parse({ boardSlug: slug, authorName: "Ana", body: " hola " });
    expect(parsed).toMatchObject({ body: "hola", photo: null });
  });

  it("validates photo metadata", () => {
    expect(
      createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", photo: { ...photo, messageId: "x" } }).success,
    ).toBe(false);
    expect(
      createMessageSchema.safeParse({ boardSlug: slug, authorName: "Ana", photo: { ...photo, width: 0 } }).success,
    ).toBe(false);
  });

  it("rejects malformed board ids", () => {
    expect(createMessageSchema.safeParse({ boardSlug: "nope", authorName: "Ana", body: "x" }).success).toBe(false);
  });
});

describe("updateMessageSchema (RF-06)", () => {
  it("requires a well-formed edit token", () => {
    const base = { boardSlug: slug, messageId: photo.messageId, authorName: "Ana", body: "x" };
    expect(updateMessageSchema.safeParse({ ...base, editToken: "short" }).success).toBe(false);
    expect(updateMessageSchema.safeParse({ ...base, editToken: "a".repeat(43) }).success).toBe(true);
  });
});
