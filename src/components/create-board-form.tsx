"use client";

import { useState } from "react";
import {
  confirmCoverAction,
  createBoardAction,
  requestCoverUploadAction,
} from "@/app/actions/boards";
import { uploadToSignedUrl } from "@/lib/client/upload";
import { LIMITS } from "@/lib/validation";
import { CopyField } from "./copy-field";
import { PhotoInput, usePhoto } from "./photo-input";

interface Created {
  publicUrl: string;
  adminUrl: string;
  coverWarning: string | null;
}

export function CreateBoardForm({ requiresPassword }: { requiresPassword: boolean }) {
  const cover = usePhoto();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cover.state.status === "processing") return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const result = await createBoardAction({
      title: String(form.get("title") ?? ""),
      recipientName: String(form.get("recipientName") ?? ""),
      welcomeMessage: String(form.get("welcomeMessage") ?? ""),
      password: requiresPassword ? String(form.get("password") ?? "") : undefined,
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    const { slug, adminKey } = result.data;
    let coverWarning: string | null = null;
    if (cover.state.status === "ready") {
      // The board already exists: a cover failure must not lose the links.
      try {
        const ticket = await requestCoverUploadAction({ boardSlug: slug, adminKey });
        if (!ticket.ok) throw new Error(ticket.error);
        await uploadToSignedUrl(ticket.data.signedUrl, cover.state.image.blob);
        const confirmed = await confirmCoverAction({ boardSlug: slug, adminKey });
        if (!confirmed.ok) throw new Error(confirmed.error);
      } catch {
        coverWarning =
          "El tablero se creó, pero no pudimos subir la portada. Podés cargarla desde el panel de administración.";
      }
    }

    const origin = window.location.origin;
    setCreated({
      publicUrl: `${origin}/b/${slug}`,
      adminUrl: `${origin}/b/${slug}/admin?key=${encodeURIComponent(adminKey)}`,
      coverWarning,
    });
    setPending(false);
  }

  if (created) {
    return (
      <section aria-labelledby="created-title" className="space-y-6">
        <div>
          <p className="eyebrow">Listo</p>
          <h2 id="created-title" className="mt-2 text-2xl font-bold tracking-[-0.01em]">
            Tablero creado.
          </h2>
          <p className="mt-1 text-fg-2">Guardá estos dos links ahora.</p>
        </div>
        {created.coverWarning ? (
          <p role="status" className="rounded-md border border-orange/45 bg-orange/18 p-3 text-sm text-fg-1">
            {created.coverWarning}
          </p>
        ) : null}
        <CopyField
          label="Link público (para compartir con el equipo)"
          value={created.publicUrl}
          hint="Cualquiera con este link puede ver el muro y dejar un mensaje."
        />
        <CopyField
          label="Link de administración (solo para vos)"
          value={created.adminUrl}
          hint="No lo compartas. Se muestra una única vez y no se puede recuperar."
        />
        <div className="flex flex-wrap gap-3">
          <a href={created.publicUrl} className="btn-primary">
            Ir al tablero <span className="font-mono">→</span>
          </a>
          <a href={created.adminUrl} className="btn-secondary">
            Abrir panel
          </a>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      <div>
        <label htmlFor="title" className="field-label">
          Título del tablero
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={LIMITS.title}
          placeholder="Gracias por todo, Marcos."
          className="field"
        />
      </div>
      <div>
        <label htmlFor="recipientName" className="field-label">
          ¿Para quién es?
        </label>
        <input
          id="recipientName"
          name="recipientName"
          required
          maxLength={LIMITS.recipientName}
          placeholder="Marcos"
          className="field"
        />
      </div>
      <div>
        <label htmlFor="welcomeMessage" className="field-label">
          Mensaje de bienvenida <span className="font-normal text-fg-3">(opcional)</span>
        </label>
        <textarea
          id="welcomeMessage"
          name="welcomeMessage"
          rows={3}
          maxLength={LIMITS.welcomeMessage}
          placeholder="Dejale unas palabras o una foto antes de su último día."
          className="field"
        />
      </div>
      <PhotoInput label="Foto de portada (opcional)" photo={cover} disabled={pending} />
      {requiresPassword ? (
        <div>
          <label htmlFor="password" className="field-label">
            Contraseña para crear tableros
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="off"
            className="field"
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="btn-primary w-full sm:w-auto"
        disabled={pending || cover.state.status === "processing"}
      >
        {pending ? "Creando…" : "Crear tablero"}
      </button>
    </form>
  );
}
