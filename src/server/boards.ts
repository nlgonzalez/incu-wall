import "server-only";
import { hashSecret, newBoardSlug, newSecret, secretMatches } from "@/lib/tokens";
import { isBoardSlug } from "@/lib/validation";
import { db } from "./supabase";

export type BoardStatus = "open" | "closed";

/** Board as exposed to pages: never carries the admin key hash. */
export interface Board {
  id: string;
  slug: string;
  title: string;
  recipientName: string;
  welcomeMessage: string | null;
  coverPath: string | null;
  status: BoardStatus;
  createdAt: string;
}

const BOARD_COLUMNS =
  "id, slug, title, recipient_name, welcome_message, cover_path, status, created_at, admin_key_hash";

interface BoardRow {
  id: string;
  slug: string;
  title: string;
  recipient_name: string;
  welcome_message: string | null;
  cover_path: string | null;
  status: string;
  created_at: string;
  admin_key_hash: string;
}

function toBoard(row: BoardRow): Board {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    recipientName: row.recipient_name,
    welcomeMessage: row.welcome_message,
    coverPath: row.cover_path,
    status: row.status === "closed" ? "closed" : "open",
    createdAt: row.created_at,
  };
}

async function findRow(slug: unknown): Promise<BoardRow | null> {
  // Malformed ids never reach the database; same outcome as "not found" (RF-13).
  if (!isBoardSlug(slug)) return null;
  const { data, error } = await db()
    .from("boards")
    .select(BOARD_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`boards lookup failed: ${error.message}`);
  return data;
}

export interface NewBoard {
  title: string;
  recipientName: string;
  welcomeMessage?: string | null;
}

/** RF-01/RF-02: returns the clear adminKey exactly once; only its hash is stored. */
export async function createBoard(input: NewBoard): Promise<{ board: Board; adminKey: string }> {
  const adminKey = newSecret();
  const { data, error } = await db()
    .from("boards")
    .insert({
      slug: newBoardSlug(),
      title: input.title,
      recipient_name: input.recipientName,
      welcome_message: input.welcomeMessage ?? null,
      admin_key_hash: hashSecret(adminKey),
    })
    .select(BOARD_COLUMNS)
    .single();
  if (error) throw new Error(`board insert failed: ${error.message}`);
  return { board: toBoard(data), adminKey };
}

export async function getBoard(slug: unknown): Promise<Board | null> {
  const row = await findRow(slug);
  return row ? toBoard(row) : null;
}

/** Null both when the board does not exist and when the key is wrong (no existence oracle). */
export async function getBoardForAdmin(slug: unknown, adminKey: unknown): Promise<Board | null> {
  const row = await findRow(slug);
  if (!row || !secretMatches(adminKey, row.admin_key_hash)) return null;
  return toBoard(row);
}

export async function setBoardStatus(boardId: string, status: BoardStatus): Promise<void> {
  const { error } = await db().from("boards").update({ status }).eq("id", boardId);
  if (error) throw new Error(`board status update failed: ${error.message}`);
}

export async function setBoardCover(boardId: string, coverPath: string | null): Promise<void> {
  const { error } = await db().from("boards").update({ cover_path: coverPath }).eq("id", boardId);
  if (error) throw new Error(`board cover update failed: ${error.message}`);
}
