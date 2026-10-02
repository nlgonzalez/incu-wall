"use client";

import { useId, useState } from "react";
import {
  createMessageAction,
  requestPhotoUploadAction,
  updateMessageAction,
} from "@/app/actions/messages";
import { readAuthorName, saveAuthorName, saveEditToken } from "@/lib/client/edit-tokens";
import { uploadToSignedUrl } from "@/lib/client/upload";
import { charLength, LIMITS } from "@/lib/validation";
import type { WallMessage } from "@/lib/wall-types";
import { MessageCard, type CardPhoto } from "./message-card";
import { CloseIcon } from "./icons";
import { Modal } from "./modal";
import { PhotoInput, usePhoto } from "./photo-input";

export type DialogMode =
  | { kind: "create" }
  | { kind: "edit"; message: WallMessage; editToken: string };

export function MessageDialog({
  boardSlug,
  recipientName,
  mode,
  open,
  onClose,
}: {
  boardSlug: string;
  recipientName: string;
  mode: DialogMode;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="sm:max-w-lg">
      <MessageForm
        titleId={titleId}
        boardSlug={boardSlug}
        recipientName={recipientName}
        mode={mode}
        onDone={onClose}
      />
    </Modal>
  );
}

function MessageForm({
  titleId,
  boardSlug,
  recipientName,
  mode,
  onDone,
}: {
  titleId: string;
  boardSlug: string;
  recipientName: string;
  mode: DialogMode;
  onDone: () => void;
}) {
  const editing = mode.kind === "edit" ? mode.message : null;
  const [authorName, setAuthorName] = useState(() => editing?.authorName ?? readAuthorName());
  const [body, setBody] = useState(editing?.body ?? "");
  const [removeExisting, setRemoveExisting] = useState(false);
  const photo = usePhoto();
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const existingPhoto = editing?.photo && !removeExisting ? editing.photo : null;
  const previewPhoto: CardPhoto | null =
    photo.state.status === "ready"
      ? { src: photo.state.image.previewUrl, width: photo.state.image.width, height: photo.state.image.height, local: true }
      : existingPhoto;
  const trimmedBody = body.trim();
  const bodyLength = charLength(body);

  function validate(): string | null {
    if (authorName.trim() === "") return "Escribí tu nombre";
    if (charLength(authorName.trim()) > LIMITS.authorName) return `El nombre admite hasta ${LIMITS.authorName} caracteres`;
    if (bodyLength > LIMITS.body) return `El mensaje admite hasta ${LIMITS.body} caracteres`;
    if (trimmedBody === "" && !previewPhoto) return "Escribí un mensaje o agregá una foto";
    if (photo.state.status === "processing") return "Esperá a que termine de procesarse la foto";
    return null;
  }

  function goToPreview(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (!problem) setStep("preview");
  }

  async function publish() {
    setPending(true);
    setError(null);
    try {
      if (mode.kind === "edit") {
        const result = await updateMessageAction({
          boardSlug,
          messageId: mode.message.id,
          editToken: mode.editToken,
          authorName,
          body: trimmedBody,
          removePhoto: removeExisting,
        });
        if (!result.ok) throw new Error(result.error);
      } else {
        let photoMeta: { messageId: string; width: number; height: number } | null = null;
        if (photo.state.status === "ready") {
          const ticket = await requestPhotoUploadAction({ boardSlug });
          if (!ticket.ok) throw new Error(ticket.error);
          await uploadToSignedUrl(ticket.data.signedUrl, photo.state.image.blob);
          photoMeta = {
            messageId: ticket.data.messageId,
            width: photo.state.image.width,
            height: photo.state.image.height,
          };
        }
        const result = await createMessageAction({
          boardSlug,
          authorName,
          body: trimmedBody,
          photo: photoMeta,
        });
        if (!result.ok) throw new Error(result.error);
        saveEditToken(result.data.messageId, result.data.editToken);
        saveAuthorName(authorName.trim());
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos completar la acción. Probá de nuevo.");
      setPending(false);
    }
  }

  const title = mode.kind === "edit" ? "Editar tu mensaje" : `Dejale un mensaje a ${recipientName}`;

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold tracking-[-0.01em]">
          {step === "preview" ? "Así se va a ver" : title}
        </h2>
        <button type="button" onClick={onDone} className="btn-ghost min-h-9" aria-label="Cerrar">
          <CloseIcon aria-hidden className="size-5" />
        </button>
      </div>

      {step === "compose" ? (
        <form onSubmit={goToPreview} className="space-y-4">
          <div>
            <label htmlFor={`${titleId}-name`} className="field-label">
              Tu nombre
            </label>
            <input
              id={`${titleId}-name`}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              maxLength={LIMITS.authorName}
              autoComplete="name"
              className="field"
            />
          </div>
          <div>
            <label htmlFor={`${titleId}-body`} className="field-label">
              Mensaje
            </label>
            <textarea
              id={`${titleId}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              aria-describedby={`${titleId}-count`}
              className="field"
            />
            <p
              id={`${titleId}-count`}
              className={`mt-1 text-right font-mono text-xs tabular-nums ${bodyLength > LIMITS.body ? "text-danger" : "text-fg-3"}`}
            >
              {bodyLength}/{LIMITS.body}
            </p>
          </div>

          {mode.kind === "edit" ? (
            existingPhoto ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-fg-2">Tu mensaje tiene una foto.</span>
                <button type="button" className="btn-secondary" onClick={() => setRemoveExisting(true)}>
                  Quitar foto
                </button>
              </div>
            ) : null
          ) : (
            <PhotoInput label="Foto (opcional)" photo={photo} />
          )}

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onDone} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={photo.state.status === "processing"}>
              Ver cómo queda
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto max-w-sm">
            <MessageCard authorName={authorName.trim()} body={trimmedBody || null} photo={previewPhoto} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setStep("compose")} className="btn-secondary" disabled={pending}>
              Volver a editar
            </button>
            <button type="button" onClick={publish} className="btn-primary" disabled={pending}>
              {pending ? "Publicando…" : mode.kind === "edit" ? "Guardar cambios" : "Publicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
