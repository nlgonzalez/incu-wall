import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

// Deliberately generic: never reveals whether a board exists (RF-13).
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
          No encontramos esta página.
        </h1>
        <p className="mt-4 text-fg-2">Revisá que el link esté completo y bien copiado.</p>
        <Link href="/" className="btn-secondary mt-8">
          Ir al inicio <span className="font-mono text-accent-hover">→</span>
        </Link>
      </main>
    </>
  );
}
