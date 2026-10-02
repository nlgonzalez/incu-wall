"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { serverEnv } from "@/lib/env";
import { safeEqual } from "@/lib/tokens";
import { adminRefSchema, createBoardSchema, setBoardStatusSchema } from "@/lib/validation";
import * as boards from "@/server/boards";
import { DomainError, notFound } from "@/server/errors";
import { coverPath, createUploadTicket, verifyUploadedPhoto } from "@/server/media";
import { runAction } from "@/server/run-action";

async function requireAdmin(boardSlug: string, adminKey: string): Promise<boards.Board> {
  const board = await boards.getBoardForAdmin(boardSlug, adminKey);
  if (!board) throw notFound();
  return board;
}

/** RF-01/RF-02. The clear adminKey leaves the server only in this response. */
export async function createBoardAction(
  input: unknown,
): Promise<ActionResult<{ slug: string; adminKey: string }>> {
  return runAction(createBoardSchema, input, async (data) => {
    const required = serverEnv().BOARD_CREATION_PASSWORD;
    if (required && !safeEqual(data.password ?? "", required)) {
      throw new DomainError("forbidden", "La contraseña para crear tableros no es correcta");
    }
    const { board, adminKey } = await boards.createBoard(data);
    return { slug: board.slug, adminKey };
  });
}

/** Signed upload URL for the cover, authorised by the adminKey. */
export async function requestCoverUploadAction(
  input: unknown,
): Promise<ActionResult<{ signedUrl: string }>> {
  return runAction(adminRefSchema, input, async ({ boardSlug, adminKey }) => {
    const board = await requireAdmin(boardSlug, adminKey);
    const ticket = await createUploadTicket(coverPath(board.slug), true);
    return { signedUrl: ticket.signedUrl };
  });
}

export async function confirmCoverAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(adminRefSchema, input, async ({ boardSlug, adminKey }) => {
    const board = await requireAdmin(boardSlug, adminKey);
    const path = coverPath(board.slug);
    const check = await verifyUploadedPhoto(path);
    if (!check.ok) throw new DomainError("invalid", check.reason);
    await boards.setBoardCover(board.id, path);
    refresh();
    return null;
  });
}

/** RF-08: close or reopen the board. */
export async function setBoardStatusAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(setBoardStatusSchema, input, async ({ boardSlug, adminKey, status }) => {
    const board = await requireAdmin(boardSlug, adminKey);
    await boards.setBoardStatus(board.id, status);
    refresh();
    return null;
  });
}
