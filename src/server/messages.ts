import "server-only";
import { hashSecret, newSecret, secretMatches } from "@/lib/tokens";
import type { PhotoInput } from "@/lib/validation";
import type { Board } from "./boards";
import { boardClosed, DomainError } from "./errors";
import { photoPath, removeObjects, verifyUploadedPhoto } from "./media";
import { db } from "./supabase";

/** Message as exposed to pages: never carries the edit token hash. */
export interface Message {
  id: string;
  authorName: string;
  body: string | null;
  photoPath: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

const MESSAGE_COLUMNS =
  "id, author_name, body, photo_path, photo_width, photo_height, is_hidden, created_at, updated_at";

interface MessageRow {
  id: string;
  author_name: string;
  body: string | null;
  photo_path: string | null;
  photo_width: number | null;
  photo_height: number | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    authorName: row.author_name,
    body: row.body,
    photoPath: row.photo_path,
    photoWidth: row.photo_width,
    photoHeight: row.photo_height,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const messageNotFound = () => new DomainError("not-found", "No encontramos el mensaje");

function assertOpen(board: Board): void {
  if (board.status !== "open") throw boardClosed();
}

/** RF-03: oldest first. Hidden messages only for the admin panel (RF-07). */
export async function listMessages(
  boardId: string,
  { includeHidden = false }: { includeHidden?: boolean } = {},
): Promise<Message[]> {
  let query = db()
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("board_id", boardId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (!includeHidden) query = query.eq("is_hidden", false);
  const { data, error } = await query;
  if (error) throw new Error(`messages list failed: ${error.message}`);
  return data.map(toMessage);
}

export interface NewMessage {
  authorName: string;
  body: string | null;
  photo: PhotoInput | null;
}

/** RF-04/RF-05. Returns the clear editToken once (RF-06); only its hash is stored. */
export async function createMessage(
  board: Board,
  input: NewMessage,
): Promise<{ message: Message; editToken: string }> {
  assertOpen(board);

  let path: string | null = null;
  if (input.photo) {
    path = photoPath(board.slug, input.photo.messageId);
    const check = await verifyUploadedPhoto(path);
    if (!check.ok) throw new DomainError("invalid", check.reason);
  }

  const editToken = newSecret();
  const { data, error } = await db()
    .from("messages")
    .insert({
      ...(input.photo ? { id: input.photo.messageId } : {}),
      board_id: board.id,
      author_name: input.authorName,
      body: input.body,
      photo_path: path,
      photo_width: input.photo?.width ?? null,
      photo_height: input.photo?.height ?? null,
      edit_token_hash: hashSecret(editToken),
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") throw new DomainError("invalid", "Ese mensaje ya existe");
    throw new Error(`message insert failed: ${error.message}`);
  }
  return { message: toMessage(data), editToken };
}

async function findOwned(board: Board, messageId: string, editToken: string) {
  const { data, error } = await db()
    .from("messages")
    .select(`${MESSAGE_COLUMNS}, edit_token_hash`)
    .eq("board_id", board.id)
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(`message lookup failed: ${error.message}`);
  // Same answer for "missing" and "not yours".
  if (!data || !secretMatches(editToken, data.edit_token_hash)) throw messageNotFound();
  return data;
}

export interface MessageEdit {
  authorName: string;
  body: string | null;
  removePhoto: boolean;
}

/** RF-06: only from the browser holding the editToken, only while the board is open. */
export async function updateMessage(
  board: Board,
  messageId: string,
  editToken: string,
  edit: MessageEdit,
): Promise<Message> {
  assertOpen(board);
  const current = await findOwned(board, messageId, editToken);
  const dropPhoto = edit.removePhoto && current.photo_path !== null;
  if (edit.body === null && (dropPhoto || current.photo_path === null)) {
    throw new DomainError("invalid", "Escribí un mensaje o dejá la foto");
  }

  const { data, error } = await db()
    .from("messages")
    .update({
      author_name: edit.authorName,
      body: edit.body,
      ...(dropPhoto ? { photo_path: null, photo_width: null, photo_height: null } : {}),
    })
    .eq("id", current.id)
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw new Error(`message update failed: ${error.message}`);
  if (dropPhoto && current.photo_path) await removeObjects([current.photo_path]);
  return toMessage(data);
}

export async function deleteMessage(
  board: Board,
  messageId: string,
  editToken: string,
): Promise<void> {
  assertOpen(board);
  const current = await findOwned(board, messageId, editToken);
  await deleteRow(current.id, current.photo_path);
}

export type ModerationAction = "hide" | "restore" | "delete";

/** RF-07: admin moderation. Allowed even when the board is closed. */
export async function moderateMessage(
  board: Board,
  messageId: string,
  action: ModerationAction,
): Promise<void> {
  const { data, error } = await db()
    .from("messages")
    .select("id, photo_path")
    .eq("board_id", board.id)
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(`message lookup failed: ${error.message}`);
  if (!data) throw messageNotFound();

  if (action === "delete") {
    await deleteRow(data.id, data.photo_path);
    return;
  }
  const { error: updateError } = await db()
    .from("messages")
    .update({ is_hidden: action === "hide" })
    .eq("id", data.id);
  if (updateError) throw new Error(`message moderation failed: ${updateError.message}`);
}

async function deleteRow(id: string, path: string | null): Promise<void> {
  const { error } = await db().from("messages").delete().eq("id", id);
  if (error) throw new Error(`message delete failed: ${error.message}`);
  if (path) await removeObjects([path]);
}
