import { afterEach, describe, expect, it } from "vitest";
import {
  confirmCoverAction,
  createBoardAction,
  requestCoverUploadAction,
  setBoardStatusAction,
} from "@/app/actions/boards";
import { hashSecret } from "@/lib/tokens";
import { getBoard, getBoardForAdmin } from "@/server/boards";
import { db } from "@/server/supabase";
import { jpegBytes } from "../support/jpeg-fixtures";
import { putToSignedUrl } from "../support/upload";

async function newBoard() {
  const result = await createBoardAction({
    title: "Chau Marcos",
    recipientName: "Marcos",
    welcomeMessage: "Dejale unas palabras",
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

function alterOneChar(slug: string): string {
  const last = slug.at(-1) === "a" ? "b" : "a";
  return slug.slice(0, -1) + last;
}

describe("createBoardAction (RF-01, RF-02, AC-1)", () => {
  afterEach(() => {
    delete process.env.BOARD_CREATION_PASSWORD;
  });

  it("returns a public slug and an admin key, storing only the key's hash", async () => {
    const { slug, adminKey } = await newBoard();
    expect(slug).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(adminKey).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { data } = await db().from("boards").select("*").eq("slug", slug).single();
    expect(data!.admin_key_hash).toBe(hashSecret(adminKey));
    expect(JSON.stringify(data)).not.toContain(adminKey);
    expect(data).toMatchObject({ title: "Chau Marcos", recipient_name: "Marcos", status: "open" });
  });

  it("rejects invalid input", async () => {
    const result = await createBoardAction({ title: "", recipientName: "Marcos" });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("requires the creation password when configured", async () => {
    process.env.BOARD_CREATION_PASSWORD = "s3cret-pass";
    expect(await createBoardAction({ title: "T", recipientName: "M" })).toMatchObject({
      ok: false,
      code: "forbidden",
    });
    expect(
      await createBoardAction({ title: "T", recipientName: "M", password: "wrong" }),
    ).toMatchObject({ ok: false, code: "forbidden" });
    expect(
      await createBoardAction({ title: "T", recipientName: "M", password: "s3cret-pass" }),
    ).toMatchObject({ ok: true });
  });
});

describe("board lookup (RF-13, AC-2)", () => {
  it("finds the board by slug and returns null for an id altered by one character", async () => {
    const { slug } = await newBoard();
    expect(await getBoard(slug)).toMatchObject({ slug, title: "Chau Marcos" });
    expect(await getBoard(alterOneChar(slug))).toBeNull();
    expect(await getBoard("not-a-valid-id")).toBeNull();
  });

  it("never exposes the admin key hash", async () => {
    const { slug } = await newBoard();
    const board = await getBoard(slug);
    expect(Object.keys(board!)).not.toContain("adminKeyHash");
    expect(JSON.stringify(board)).not.toMatch(/[0-9a-f]{64}/);
  });

  it("admin lookup needs the right key and gives the same answer as a missing board", async () => {
    const { slug, adminKey } = await newBoard();
    expect(await getBoardForAdmin(slug, adminKey)).not.toBeNull();
    expect(await getBoardForAdmin(slug, alterOneChar(adminKey))).toBeNull();
    expect(await getBoardForAdmin(slug, undefined)).toBeNull();
    expect(await getBoardForAdmin(alterOneChar(slug), adminKey)).toBeNull();
  });
});

describe("setBoardStatusAction (RF-08)", () => {
  it("closes and reopens with a valid admin key only", async () => {
    const { slug, adminKey } = await newBoard();
    expect(
      await setBoardStatusAction({ boardSlug: slug, adminKey: alterOneChar(adminKey), status: "closed" }),
    ).toMatchObject({ ok: false, code: "not-found" });

    expect(await setBoardStatusAction({ boardSlug: slug, adminKey, status: "closed" })).toEqual({
      ok: true,
      data: null,
    });
    expect((await getBoard(slug))!.status).toBe("closed");

    await setBoardStatusAction({ boardSlug: slug, adminKey, status: "open" });
    expect((await getBoard(slug))!.status).toBe("open");
  });
});

describe("cover upload (RF-01)", () => {
  it("uploads through a signed URL and stores the cover path", async () => {
    const { slug, adminKey } = await newBoard();
    const ticket = await requestCoverUploadAction({ boardSlug: slug, adminKey });
    if (!ticket.ok) throw new Error(ticket.error);
    const put = await putToSignedUrl(ticket.data.signedUrl, jpegBytes());
    expect(put.ok).toBe(true);

    expect(await confirmCoverAction({ boardSlug: slug, adminKey })).toMatchObject({ ok: true });
    expect((await getBoard(slug))!.coverPath).toBe(`${slug}/cover.jpg`);
  });

  it("refuses a cover ticket without the admin key", async () => {
    const { slug } = await newBoard();
    const ticket = await requestCoverUploadAction({ boardSlug: slug, adminKey: "x".repeat(43) });
    expect(ticket).toMatchObject({ ok: false, code: "not-found" });
  });
});
