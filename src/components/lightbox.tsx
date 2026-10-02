"use client";

import Image from "next/image";
import { useId } from "react";
import type { WallMessage } from "@/lib/wall-types";
import { ArrowLeft, ArrowRight, CloseIcon, Download } from "./icons";
import { Modal } from "./modal";

/** RF-10: full-size photo with keyboard navigation and download. */
export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: WallMessage[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const current = index !== null ? items[index] : undefined;
  const count = items.length;

  function go(delta: number) {
    if (index === null || count === 0) return;
    onIndexChange((index + delta + count) % count);
  }

  return (
    <Modal open={current !== undefined} onClose={onClose} labelledBy={titleId} tone="dark" className="sm:max-w-5xl">
      {current?.photo ? (
        <div
          className="flex flex-col gap-3 p-3 sm:p-4"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-sm font-semibold">
              Foto de {current.authorName}
              {count > 1 ? (
                <span className="ml-3 font-mono text-xs font-normal tabular-nums text-fg-3">
                  {(index ?? 0) + 1} / {count}
                </span>
              ) : null}
            </h2>
            <div className="flex gap-2">
              <a href={current.photo.downloadUrl} download className="btn-secondary min-h-9 px-4 text-sm">
                <Download aria-hidden className="size-4" />
                Descargar
              </a>
              <button type="button" onClick={onClose} className="btn-ghost min-h-9" aria-label="Cerrar">
                <CloseIcon aria-hidden className="size-5" />
              </button>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <Image
              key={current.id}
              src={current.photo.src}
              alt={`Foto de ${current.authorName}`}
              width={current.photo.width}
              height={current.photo.height}
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="h-auto max-h-[75dvh] w-auto max-w-full rounded-md object-contain"
            />
          </div>
          {count > 1 ? (
            <div className="flex justify-between">
              <button type="button" onClick={() => go(-1)} className="btn-ghost min-h-9 text-sm">
                <ArrowLeft aria-hidden className="size-4" /> Anterior
              </button>
              <button type="button" onClick={() => go(1)} className="btn-ghost min-h-9 text-sm">
                Siguiente <ArrowRight aria-hidden className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
