import { beforeEach, describe, expect, it } from "vitest";
import { createBoardAction, setBoardStatusAction } from "@/app/actions/boards";
import {
  createMessageAction,
  deleteMessageAction,
  moderateMessageAction,
  requestPhotoUploadAction,
  updateMessageAction,
} from "@/app/actions/messages";
import { getBoard } from "@/server/boards";
import { listMessages } from "@/server/messages";
import { db, MEDIA_BUCKET } from "@/server/supabase";
import { jpegBytes } from "../support/jpeg-fixtures";
import { putToSignedUrl } from "../support/upload";

let slug: string;
let adminKey: string;

beforeEach(async () => {
  const result = await createBoardAction({ title: "Chau Marcos", recipientName: "Marcos" });
  if (!result.ok) throw new Error(result.error);
  ({ slug, adminKey } = result.data);
});

async function boardId(): Promise<string> {
  return (await getBoard(slug))!.id;
}

async function post(authorName: string, body: string | null = "Gracias por todo") {
  const result = await createMessageAction({ boardSlug: slug, authorName, body });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

async function uploadPhoto(bytes: Uint8Array, contentType = "image/jpeg") {
  const ticket = await requestPhotoUploadAction({ boardSlug: slug });
  if (!ticket.ok) throw new Error(ticket.error);
  const put = await putToSignedUrl(ticket.data.signedUrl, bytes, contentType);
  return { messageId: ticket.data.messageId, put };
}

async function objectExists(path: string): Promise<boolean> {
  const [folder, name] = path.split("/");
  const { data } = await db().storage.from(MEDIA_BUCKET).list(folder, { search: name });
  return (data ?? []).some((o) => o.name === name);
}

describe("createMessageAction (RF-03, RF-04)", () => {
  it("publishes text messages listed oldest first", async () => {
    await post("Ana", "Primero");
    await post("Bruno", "Segundo");
    await post("Carla", "Tercero");
    const list = await listMessages(await boardId());
    expect(list.map((m) => m.authorName)).toEqual(["Ana", "Bruno", "Carla"]);
    expect(Object.keys(list[0]!)).not.toContain("editTokenHash");
  });

  it("rejects a message with neither text nor photo", async () => {
    const result = await createMessageAction({ boardSlug: slug, authorName: "Ana", body: "" });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("returns not-found for an unknown board (RF-13)", async () => {
    const other = slug.slice(0, -1) + (slug.endsWith("a") ? "b" : "a");
    const result = await createMessageAction({ boardSlug: other, authorName: "Ana", body: "x" });
    expect(result).toMatchObject({ ok: false, code: "not-found" });
  });
});

describe("photos (RF-05, AC-5)", () => {
  it("accepts a clean JPEG uploaded to the signed URL", async () => {
    const { messageId, put } = await uploadPhoto(jpegBytes());
    expect(put.ok).toBe(true);
    const result = await createMessageAction({
      boardSlug: slug,
      authorName: "Ana",
      body: null,
      photo: { messageId, width: 800, height: 600 },
    });
    expect(result).toMatchObject({ ok: true, data: { messageId } });
    const [message] = await listMessages(await boardId());
    expect(message).toMatchObject({
      photoPath: `${slug}/${messageId}.jpg`,
      photoWidth: 800,
      photoHeight: 600,
    });
  });

  it("rejects and deletes a photo that still carries EXIF metadata", async () => {
    const { messageId } = await uploadPhoto(jpegBytes({ exif: true }));
    const result = await createMessageAction({
      boardSlug: slug,
      authorName: "Ana",
      photo: { messageId, width: 800, height: 600 },
    });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
    expect(await objectExists(`${slug}/${messageId}.jpg`)).toBe(false);
    expect(await listMessages(await boardId())).toHaveLength(0);
  });

  it("rejects content that is not a JPEG even if labelled as one", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const { messageId } = await uploadPhoto(png);
    const result = await createMessageAction({
      boardSlug: slug,
      authorName: "Ana",
      photo: { messageId, width: 10, height: 10 },
    });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("rejects a message pointing to a photo that was never uploaded", async () => {
    const ticket = await requestPhotoUploadAction({ boardSlug: slug });
    if (!ticket.ok) throw new Error(ticket.error);
    const result = await createMessageAction({
      boardSlug: slug,
      authorName: "Ana",
      photo: { messageId: ticket.data.messageId, width: 10, height: 10 },
    });
    expect(result).toMatchObject({ ok: false, code: "invalid" });
  });

  it("Storage rejects non-JPEG content types and files over 10 MB", async () => {
    const wrongType = await uploadPhoto(jpegBytes(), "image/png");
    expect(wrongType.put.ok).toBe(false);
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(jpegBytes());
    const tooBig = await uploadPhoto(big);
    expect(tooBig.put.ok).toBe(false);
  });
});

describe("own message edit/delete (RF-06)", () => {
  it("edits and deletes with the edit token only", async () => {
    const { messageId, editToken } = await post("Ana", "Hola");
    const wrong = "A".repeat(43);

    expect(
      await updateMessageAction({ boardSlug: slug, messageId, editToken: wrong, authorName: "Ana", body: "x" }),
    ).toMatchObject({ ok: false, code: "not-found" });

    expect(
      await updateMessageAction({ boardSlug: slug, messageId, editToken, authorName: "Ana M.", body: "Editado" }),
    ).toEqual({ ok: true, data: null });
    const [edited] = await listMessages(await boardId());
    expect(edited).toMatchObject({ authorName: "Ana M.", body: "Editado" });

    expect(await deleteMessageAction({ boardSlug: slug, messageId, editToken: wrong })).toMatchObject({
      ok: false,
    });
    expect(await deleteMessageAction({ boardSlug: slug, messageId, editToken })).toEqual({
      ok: true,
      data: null,
    });
    expect(await listMessages(await boardId())).toHaveLength(0);
  });

  it("removing the photo deletes the object; cannot leave a message empty", async () => {
    const { messageId: photoId } = await uploadPhoto(jpegBytes());
    const created = await createMessageAction({
      boardSlug: slug,
      authorName: "Ana",
      body: "Con foto",
      photo: { messageId: photoId, width: 10, height: 10 },
    });
    if (!created.ok) throw new Error(created.error);
    const { messageId, editToken } = created.data;

    expect(
      await updateMessageAction({ boardSlug: slug, messageId, editToken, authorName: "Ana", body: "", removePhoto: true }),
    ).toMatchObject({ ok: false, code: "invalid" });

    expect(
      await updateMessageAction({ boardSlug: slug, messageId, editToken, authorName: "Ana", body: "Sin foto", removePhoto: true }),
    ).toMatchObject({ ok: true });
    expect(await objectExists(`${slug}/${photoId}.jpg`)).toBe(false);
  });

  it("a token from another board's message does not work", async () => {
    const mine = await post("Ana");
    const other = await createBoardAction({ title: "Otro", recipientName: "X" });
    if (!other.ok) throw new Error(other.error);
    const result = await deleteMessageAction({
      boardSlug: other.data.slug,
      messageId: mine.messageId,
      editToken: mine.editToken,
    });
    expect(result).toMatchObject({ ok: false, code: "not-found" });
  });
});

describe("moderation (RF-07, AC-6)", () => {
  it("hides, restores and deletes with a valid admin key", async () => {
    const { messageId } = await post("Ana");
    const id = await boardId();

    expect(
      await moderateMessageAction({ boardSlug: slug, adminKey: "B".repeat(43), messageId, action: "hide" }),
    ).toMatchObject({ ok: false, code: "not-found" });

    await moderateMessageAction({ boardSlug: slug, adminKey, messageId, action: "hide" });
    expect(await listMessages(id)).toHaveLength(0);
    expect(await listMessages(id, { includeHidden: true })).toMatchObject([{ id: messageId, isHidden: true }]);

    await moderateMessageAction({ boardSlug: slug, adminKey, messageId, action: "restore" });
    expect(await listMessages(id)).toMatchObject([{ id: messageId, isHidden: false }]);

    await moderateMessageAction({ boardSlug: slug, adminKey, messageId, action: "delete" });
    expect(await listMessages(id, { includeHidden: true })).toHaveLength(0);
  });

  it("cannot moderate a message of another board", async () => {
    const other = await createBoardAction({ title: "Otro", recipientName: "X" });
    if (!other.ok) throw new Error(other.error);
    const { messageId } = await post("Ana");
    const result = await moderateMessageAction({
      boardSlug: other.data.slug,
      adminKey: other.data.adminKey,
      messageId,
      action: "delete",
    });
    expect(result).toMatchObject({ ok: false, code: "not-found" });
  });
});

describe("closed board (RF-08, AC-7)", () => {
  it("rejects new messages, uploads, edits and deletes; moderation still works", async () => {
    const mine = await post("Ana");
    await setBoardStatusAction({ boardSlug: slug, adminKey, status: "closed" });

    expect(await createMessageAction({ boardSlug: slug, authorName: "Bruno", body: "tarde" })).toMatchObject({
      ok: false,
      code: "closed",
    });
    expect(await requestPhotoUploadAction({ boardSlug: slug })).toMatchObject({ ok: false, code: "closed" });
    expect(
      await updateMessageAction({ boardSlug: slug, ...mine, authorName: "Ana", body: "x" }),
    ).toMatchObject({ ok: false, code: "closed" });
    expect(await deleteMessageAction({ boardSlug: slug, ...mine })).toMatchObject({ ok: false, code: "closed" });

    expect(
      await moderateMessageAction({ boardSlug: slug, adminKey, messageId: mine.messageId, action: "hide" }),
    ).toMatchObject({ ok: true });
  });
});
