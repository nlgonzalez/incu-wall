import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPanel } from "@/components/admin-panel";
import { SiteHeader } from "@/components/site-header";
import { getBoardForAdmin } from "@/server/boards";
import { loadWall } from "@/server/wall";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function AdminPage(props: PageProps<"/b/[boardId]/admin">) {
  await connection();
  const [{ boardId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const key = searchParams.key;
  // Wrong key and unknown board look the same (RF-13).
  const board = await getBoardForAdmin(boardId, typeof key === "string" ? key : undefined);
  if (!board || typeof key !== "string") notFound();

  const wall = await loadWall(board, { includeHidden: true });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        <AdminPanel board={wall.board} messages={wall.messages} adminKey={key} />
      </main>
    </>
  );
}
