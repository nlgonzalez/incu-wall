import "server-only";
import type { WallBoard, WallMessage } from "@/lib/wall-types";
import type { Board } from "./boards";
import { asDownloadUrl, signedUrls } from "./media";
import { listMessages } from "./messages";

function downloadName(recipient: string, author: string, id: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 30);
  return `${clean(recipient) || "tablero"}-${clean(author) || "foto"}-${id.slice(0, 8)}.jpg`;
}

/** Board + messages with signed photo URLs (1 h), ready for rendering. */
export async function loadWall(
  board: Board,
  { includeHidden = false }: { includeHidden?: boolean } = {},
): Promise<{ board: WallBoard; messages: WallMessage[] }> {
  const messages = await listMessages(board.id, { includeHidden });
  const paths = messages.flatMap((m) => (m.photoPath ? [m.photoPath] : []));
  if (board.coverPath) paths.push(board.coverPath);
  const urls = await signedUrls(paths);

  return {
    board: {
      slug: board.slug,
      title: board.title,
      recipientName: board.recipientName,
      welcomeMessage: board.welcomeMessage,
      coverSrc: board.coverPath ? (urls.get(board.coverPath) ?? null) : null,
      isOpen: board.status === "open",
    },
    messages: messages.map((m) => {
      const src = m.photoPath ? urls.get(m.photoPath) : undefined;
      return {
        id: m.id,
        authorName: m.authorName,
        body: m.body,
        photo:
          src && m.photoWidth && m.photoHeight
            ? {
                src,
                downloadUrl: asDownloadUrl(src, downloadName(board.recipientName, m.authorName, m.id)),
                width: m.photoWidth,
                height: m.photoHeight,
              }
            : null,
        createdAt: m.createdAt,
        isHidden: m.isHidden,
      };
    }),
  };
}
