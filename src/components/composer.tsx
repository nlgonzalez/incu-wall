"use client";

import { useState } from "react";
import { MessageDialog } from "./message-dialog";

export function Composer({ boardSlug, recipientName }: { boardSlug: string; recipientName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-8 text-base">
        Dejar un mensaje
      </button>
      <MessageDialog
        boardSlug={boardSlug}
        recipientName={recipientName}
        mode={{ kind: "create" }}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
