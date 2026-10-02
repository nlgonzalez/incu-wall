import Image from "next/image";
import type { WallBoard } from "@/lib/wall-types";

export function BoardHeader({ board, count }: { board: WallBoard; count: number }) {
  return (
    <header className="reveal mx-auto max-w-4xl py-10 text-center sm:py-16">
      {board.coverSrc ? (
        <div className="relative mx-auto mb-10 aspect-[16/9] w-full overflow-hidden rounded-md border border-line bg-elev-1">
          <Image
            src={board.coverSrc}
            alt={`Portada del tablero para ${board.recipientName}`}
            fill
            preload
            sizes="(min-width: 896px) 896px, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <p className="eyebrow">Para {board.recipientName}</p>
      <h1 className="mt-4 font-display text-[clamp(36px,6vw,72px)] leading-[0.95] tracking-[-0.02em] text-balance">
        {board.title}
      </h1>
      {board.welcomeMessage ? (
        <p className="mx-auto mt-6 max-w-[60ch] whitespace-pre-wrap text-lg font-medium text-fg-2">
          {board.welcomeMessage}
        </p>
      ) : null}
      <p className="mt-6 font-mono text-sm tabular-nums text-fg-3">
        {count === 0 ? "Todavía no hay mensajes" : count === 1 ? "1 mensaje" : `${count} mensajes`}
      </p>
    </header>
  );
}
