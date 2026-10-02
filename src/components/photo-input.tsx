"use client";

import { useEffect, useId, useState } from "react";
import { ImageError, prepareImage, type PreparedImage } from "@/lib/client/image";

export type PhotoState =
  | { status: "empty" }
  | { status: "processing" }
  | { status: "ready"; image: PreparedImage }
  | { status: "error"; message: string };

/** Processes the chosen file in the browser (HEIC → JPEG, resize, strip EXIF) right away. */
export function usePhoto() {
  const [state, setState] = useState<PhotoState>({ status: "empty" });

  useEffect(() => {
    return () => {
      if (state.status === "ready") URL.revokeObjectURL(state.image.previewUrl);
    };
  }, [state]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setState({ status: "processing" });
    try {
      setState({ status: "ready", image: await prepareImage(file) });
    } catch (error) {
      const message =
        error instanceof ImageError ? error.message : "No pudimos procesar la foto. Probá con otra.";
      setState({ status: "error", message });
    }
  }

  return { state, choose, clear: () => setState({ status: "empty" }) };
}

export function PhotoInput({
  label,
  photo,
  disabled,
}: {
  label: string;
  photo: ReturnType<typeof usePhoto>;
  disabled?: boolean;
}) {
  const id = useId();
  const { state, choose, clear } = photo;

  return (
    <div>
      <span className="field-label">{label}</span>
      {state.status === "ready" ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={state.image.previewUrl}
            alt="Vista previa de la foto elegida"
            className="h-20 w-20 rounded-md border border-line object-cover"
          />
          <button type="button" onClick={clear} className="btn-secondary" disabled={disabled}>
            Quitar foto
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex min-h-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-line-strong bg-white/4 px-4 text-center text-sm text-fg-2 transition-colors hover:border-accent hover:text-fg-1 focus-within:border-lime focus-within:shadow-[0_0_0_2px_rgba(217,255,0,0.25)]"
        >
          {state.status === "processing" ? "Procesando foto…" : "Tocá para elegir una foto. JPG, PNG, HEIC o WebP, hasta 10 MB."}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="sr-only"
            disabled={disabled || state.status === "processing"}
            onChange={(e) => {
              void choose(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
      )}
      {state.status === "error" ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
