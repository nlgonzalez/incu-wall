"use client";

import { useState, useSyncExternalStore } from "react";
import {
  confirmCoverAction,
  requestCoverUploadAction,
  setBoardStatusAction,
} from "@/app/actions/boards";
import { moderateMessageAction } from "@/app/actions/messages";
import type { ActionResult } from "@/lib/action-result";
import { uploadToSignedUrl } from "@/lib/client/upload";
import type { WallBoard, WallMessage } from "@/lib/wall-types";
import { CopyField } from "./copy-field";
import { MessageCard } from "./message-card";
import { PhotoInput, usePhoto } from "./photo-input";

type Moderation = "hide" | "restore" | "delete";

export function AdminPanel({
  board,
  messages,
  adminKey,
}: {
  board: WallBoard;
  messages: WallMessage[];
  adminKey: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = { boardSlug: board.slug, adminKey };
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const publicUrl = `${origin}/b/${board.slug}`;
  const hiddenCount = messages.filter((m) => m.isHidden).length;

  async function run(id: string, action: () => Promise<ActionResult<unknown>>) {
    setBusy(id);
    setError(null);
    const result = await action();
    if (!result.ok) setError(result.error);
    setBusy(null);
  }

  function moderate(messageId: string, action: Moderation) {
    if (action === "delete" && !window.confirm("¿Borrar este mensaje definitivamente? No se puede deshacer.")) return;
    void run(`${messageId}:${action}`, () => moderateMessageAction({ ...ref, messageId, action }));
  }

  function toggleStatus() {
    const status = board.isOpen ? "closed" : "open";
    void run("status", () => setBoardStatusAction({ ...ref, status }));
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Panel de administración</p>
        <h1 className="mt-3 font-display text-[clamp(30px,4vw,48px)] leading-[1.05] tracking-[-0.02em] text-balance">{board.title}</h1>
        <p className="mt-3 font-mono text-sm tabular-nums text-fg-3">
          Para {board.recipientName} · {messages.length} mensajes{hiddenCount ? ` (${hiddenCount} ocultos)` : ""}
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-md border border-danger/45 bg-danger/18 p-3 text-sm text-fg-1">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="board-settings" className="card grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <h2 id="board-settings" className="sr-only">
          Configuración del tablero
        </h2>
        <div className="space-y-3">
          <p className="eyebrow">Estado</p>
          <p
            className={`badge ${board.isOpen ? "border-success/45 bg-success/18 text-success" : "border-orange/45 bg-orange/18 text-orange"}`}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {board.isOpen ? "Abierto a mensajes" : "Cerrado a nuevos mensajes"}
          </p>
          <div />
          <button type="button" onClick={toggleStatus} disabled={busy === "status"} className={board.isOpen ? "btn-danger" : "btn-primary"}>
            {board.isOpen ? "Cerrar tablero" : "Reabrir tablero"}
          </button>
          <p className="text-sm text-fg-3">
            Cerrado, el muro sigue visible pero nadie puede publicar, editar ni borrar mensajes.
          </p>
        </div>
        <div className="space-y-4">
          <CopyField label="Link público" value={publicUrl} />
          <a href={`/b/${board.slug}`} className="btn-secondary">
            Ver el muro <span className="font-mono">→</span>
          </a>
        </div>
        <CoverEditor boardRef={ref} hasCover={board.coverSrc !== null} />
      </section>

      <section aria-labelledby="moderation">
        <h2 id="moderation" className="mb-5 text-2xl font-semibold tracking-[-0.01em]">
          Mensajes
        </h2>
        {messages.length === 0 ? (
          <p className="text-fg-2">Todavía no hay mensajes.</p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {messages.map((m) => (
              <div key={m.id} className={m.isHidden ? "opacity-60" : undefined}>
                <MessageCard
                  authorName={m.authorName}
                  body={m.body}
                  photo={m.photo}
                  createdAt={m.createdAt}
                  badge={
                    m.isHidden ? (
                      <p className="badge mb-3 border-orange/45 bg-orange/18 text-orange">
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        Oculto
                      </p>
                    ) : null
                  }
                  footer={
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      {m.isHidden ? (
                        <button type="button" className="btn-secondary min-h-9 px-4 text-sm" disabled={busy !== null} onClick={() => moderate(m.id, "restore")}>
                          Restaurar
                        </button>
                      ) : (
                        <button type="button" className="btn-secondary min-h-9 px-4 text-sm" disabled={busy !== null} onClick={() => moderate(m.id, "hide")}>
                          Ocultar
                        </button>
                      )}
                      <button type="button" className="btn-danger min-h-9 px-4 text-sm" disabled={busy !== null} onClick={() => moderate(m.id, "delete")}>
                        Borrar
                      </button>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CoverEditor({ boardRef, hasCover }: { boardRef: { boardSlug: string; adminKey: string }; hasCover: boolean }) {
  const cover = usePhoto();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function save() {
    if (cover.state.status !== "ready") return;
    setStatus("saving");
    try {
      const ticket = await requestCoverUploadAction(boardRef);
      if (!ticket.ok) throw new Error(ticket.error);
      await uploadToSignedUrl(ticket.data.signedUrl, cover.state.image.blob);
      const confirmed = await confirmCoverAction(boardRef);
      if (!confirmed.ok) throw new Error(confirmed.error);
      cover.clear();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <PhotoInput label={hasCover ? "Cambiar foto de portada" : "Agregar foto de portada"} photo={cover} disabled={status === "saving"} />
      {cover.state.status === "ready" ? (
        <button type="button" className="btn-primary" onClick={save} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : "Guardar portada"}
        </button>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm text-danger">
          No pudimos guardar la portada. Probá de nuevo.
        </p>
      ) : null}
    </div>
  );
}
