"use client";

import { useId, useState } from "react";

export function CopyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="field min-w-0 flex-1 font-mono text-[13px]"
        />
        <button type="button" onClick={copy} className="btn-secondary shrink-0">
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-sm text-fg-3">{hint}</p> : null}
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copiado` : ""}
      </span>
    </div>
  );
}
