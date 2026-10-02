import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createBoard } from "@/server/boards";

// AC-3: the public (anon / publishable) key cannot read any row of boards or messages.
describe("AC-3 — public key has no table access", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const anon = createClient(url, publishableKey, { auth: { persistSession: false } });

  beforeAll(async () => {
    // Ensure there is at least one row to (not) read.
    await createBoard({ title: "RLS", recipientName: "Marcos" });
  });

  it.each(["boards", "messages"] as const)("cannot select from %s", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(1);
    // Either a permission error or an empty result — never rows.
    expect(data ?? []).toHaveLength(0);
    if (error) expect(error.code).toBe("42501");
  });

  it("cannot insert boards", async () => {
    const { error } = await anon.from("boards").insert({
      slug: "a".repeat(21),
      title: "x",
      recipient_name: "x",
      admin_key_hash: "0".repeat(64),
    });
    expect(error).not.toBeNull();
  });

  it("cannot list or read objects in the private bucket", async () => {
    const list = await anon.storage.from("board-media").list();
    expect(list.data ?? []).toHaveLength(0);
    const signed = await anon.storage.from("board-media").createSignedUrl("x/cover.jpg", 60);
    expect(signed.data).toBeNull();
  });
});
