"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import {
  boardSlugSchema,
  createMessageSchema,
  deleteMessageSchema,
  moderateMessageSchema,
  updateMessageSchema,
} from "@/lib/validation";
import * as boards from "@/server/boards";
import { boardClosed, notFound } from "@/server/errors";
import { createUploadTicket, photoPath } from "@/server/media";
import * as messages from "@/server/messages";
import { runAction } from "@/server/run-action";

async function requireBoard(boardSlug: string): Promise<boards.Board> {
  const board = await boards.getBoard(boardSlug);
  if (!board) throw notFound();
  return board;
}

/** RF-05: reserves a message id and returns a signed upload URL for its photo. */
export async function requestPhotoUploadAction(
  input: unknown,
): Promise<ActionResult<{ messageId: string; signedUrl: string }>> {
  return runAction(z.object({ boardSlug: boardSlugSchema }), input, async ({ boardSlug }) => {
    const board = await requireBoard(boardSlug);
    if (board.status !== "open") throw boardClosed();
    const messageId = randomUUID();
    const ticket = await createUploadTicket(photoPath(board.slug, messageId));
    return { messageId, signedUrl: ticket.signedUrl };
  });
}

/** RF-04. Returns the editToken once so the author's browser can keep it (RF-06). */
export async function createMessageAction(
  input: unknown,
): Promise<ActionResult<{ messageId: string; editToken: string }>> {
  return runAction(createMessageSchema, input, async ({ boardSlug, ...data }) => {
    const board = await requireBoard(boardSlug);
    const { message, editToken } = await messages.createMessage(board, data);
    refresh();
    return { messageId: message.id, editToken };
  });
}

export async function updateMessageAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(
    updateMessageSchema,
    input,
    async ({ boardSlug, messageId, editToken, ...edit }) => {
      const board = await requireBoard(boardSlug);
      await messages.updateMessage(board, messageId, editToken, edit);
      refresh();
      return null;
    },
  );
}

export async function deleteMessageAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(deleteMessageSchema, input, async ({ boardSlug, messageId, editToken }) => {
    const board = await requireBoard(boardSlug);
    await messages.deleteMessage(board, messageId, editToken);
    refresh();
    return null;
  });
}

/** RF-07: hide / restore / delete, requires a valid adminKey. */
export async function moderateMessageAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(
    moderateMessageSchema,
    input,
    async ({ boardSlug, adminKey, messageId, action }) => {
      const board = await boards.getBoardForAdmin(boardSlug, adminKey);
      if (!board) throw notFound();
      await messages.moderateMessage(board, messageId, action);
      refresh();
      return null;
    },
  );
}
