import Link from "next/link";

// Incu wordmark (incu-brand/assets/logo/logo_incu.svg), inline and monochrome by design.
export function IncuWordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 172 50" fill="currentColor" role="img" aria-label="incu" className={className}>
      <path d="M56.9719 22.3361C56.9719 17.2433 52.8433 13.1148 47.7505 13.1148C42.6576 13.1148 38.529 17.2433 38.529 22.3361V49.3852H25.4141V22.3361C25.4141 10.0002 35.4144 0 47.7505 0C60.0865 0 70.0868 10.0002 70.0868 22.3361V49.3852H56.9719V22.3361Z" />
      <path d="M13.1149 0.824219V49.1849H0V0.824219H13.1149Z" />
      <path d="M140.165 27.6639C140.165 32.7567 144.293 36.8852 149.386 36.8852C154.479 36.8852 158.608 32.7567 158.608 27.6639L158.608 0.409819L171.723 0.409821L171.723 27.6639C171.723 39.9998 161.722 50 149.386 50C137.05 50 127.05 39.9998 127.05 27.6639L127.05 0.409817L140.165 0.409818L140.165 27.6639Z" />
      <path d="M102.765 13.5261C96.4842 13.5261 91.3923 18.6179 91.3923 24.899C91.3923 31.1801 96.4842 36.272 102.765 36.272L114.753 36.272L114.753 49.3867L102.765 49.3867C89.241 49.3867 78.2773 38.4232 78.2773 24.899C78.2773 11.3748 89.241 0.411304 102.765 0.411303L114.753 0.411303L114.753 13.5261L102.765 13.5261Z" />
    </svg>
  );
}

/** Product sub-wordmark: mono, lowercase (brand rule for products). */
export function ProductMark() {
  return (
    <Link href="/" className="font-mono text-sm font-semibold text-fg-1 hover:text-accent-hover">
      wall
    </Link>
  );
}
