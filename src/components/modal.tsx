"use client";

import { useEffect, useRef } from "react";

/** Native <dialog>: focus trap, Esc to close and inert background come from the platform. */
export function Modal({
  open,
  onClose,
  labelledBy,
  className = "",
  tone = "light",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  tone?: "light" | "dark";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-line p-0 text-fg-1 shadow-[var(--glow-violet-soft)] ${tone === "dark" ? "bg-bg" : "bg-elev-2"} ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
