"use client";

import { useState, useSyncExternalStore } from "react";
import { deleteMessageAction } from "@/app/actions/messages";
import { forgetEditToken, readEditToken } from "@/lib/client/edit-tokens";
import type { WallMessage } from "@/lib/wall-types";
import { Lightbox } from "./lightbox";
import { MessageCard } from "./message-card";
import { MessageDialog } from "./message-dialog";

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** The edit token for a message, if this browser authored it (RF-06). Null during SSR. */
function useEditToken(messageId: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => readEditToken(messageId),
    () => null,
  );
}

export function Wall({
  messages,
  boardSlug,
  isOpen,
  recipientName = "",
}: {
  messages: WallMessage[];
  boardSlug: string;
  isOpen: boolean;
  recipientName?: string;
}) {
  const photos = messages.filter((m) => m.photo !== null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (messages.length === 0) {
    return (
      <p className="mx-auto max-w-md rounded-md border border-dashed border-line-strong p-8 text-center text-fg-2">
        Todavía no hay mensajes. Sé la primera persona en dejar uno.
      </p>
    );
  }

  return (
    <>
      <section aria-label="Mensajes" className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {messages.map((message, index) => (
          <WallCard
            key={message.id}
            message={message}
            boardSlug={boardSlug}
            recipientName={recipientName}
            isOpen={isOpen}
            preload={index < 2}
            onPhotoClick={
              message.photo ? () => setLightboxIndex(photos.findIndex((p) => p.id === message.id)) : undefined
            }
          />
        ))}
      </section>
      <Lightbox
        items={photos}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}

function WallCard({
  message,
  boardSlug,
  recipientName,
  isOpen,
  preload,
  onPhotoClick,
}: {
  message: WallMessage;
  boardSlug: string;
  recipientName: string;
  isOpen: boolean;
  preload: boolean;
  onPhotoClick?: () => void;
}) {
  const editToken = useEditToken(message.id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!editToken || !window.confirm("¿Borrar tu mensaje? No se puede deshacer.")) return;
    setBusy(true);
    setError(null);
    const result = await deleteMessageAction({ boardSlug, messageId: message.id, editToken });
    if (result.ok) {
      forgetEditToken(message.id);
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  const canManage = isOpen && editToken !== null;

  return (
    <>
      <MessageCard
        authorName={message.authorName}
        body={message.body}
        photo={message.photo}
        createdAt={message.createdAt}
        preload={preload}
        onPhotoClick={onPhotoClick}
        footer={
          canManage ? (
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <button type="button" className="btn-secondary min-h-9 px-4 text-sm" onClick={() => setEditing(true)} disabled={busy}>
                Editar
              </button>
              <button type="button" className="btn-danger min-h-9 px-4 text-sm" onClick={remove} disabled={busy}>
                {busy ? "Borrando…" : "Borrar"}
              </button>
              {error ? (
                <p role="alert" className="self-center text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null
        }
      />
      {canManage ? (
        <MessageDialog
          boardSlug={boardSlug}
          recipientName={recipientName}
          mode={{ kind: "edit", message, editToken }}
          open={editing}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}
