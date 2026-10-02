import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { BoardHeader } from "@/components/board-header";
import { Composer } from "@/components/composer";
import { SiteHeader } from "@/components/site-header";
import { Wall } from "@/components/wall";
import { getBoard } from "@/server/boards";
import { loadWall } from "@/server/wall";

const loadBoard = cache(getBoard);

export async function generateMetadata(props: PageProps<"/b/[boardId]">): Promise<Metadata> {
  const { boardId } = await props.params;
  const board = await loadBoard(boardId);
  return {
    title: board ? board.title : "No encontrado",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

export default async function BoardPage(props: PageProps<"/b/[boardId]">) {
  await connection();
  const { boardId } = await props.params;
  const board = await loadBoard(boardId);
  if (!board) notFound(); // RF-13: same 404 for malformed and unknown ids

  const wall = await loadWall(board);

  return (
    <>
    <SiteHeader />
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20">
      <BoardHeader board={wall.board} count={wall.messages.length} />
      <div className="mx-auto mb-8 flex max-w-2xl justify-center">
        {wall.board.isOpen ? (
          <Composer boardSlug={wall.board.slug} recipientName={wall.board.recipientName} />
        ) : (
          <p role="status" className="badge border-orange/45 bg-orange/18 text-orange">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            Este tablero ya no recibe mensajes.
          </p>
        )}
      </div>
      <Wall
        messages={wall.messages}
        boardSlug={wall.board.slug}
        isOpen={wall.board.isOpen}
        recipientName={wall.board.recipientName}
      />
    </main>
    </>
  );
}
