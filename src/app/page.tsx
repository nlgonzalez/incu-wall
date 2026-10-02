import { connection } from "next/server";
import { CreateBoardForm } from "@/components/create-board-form";
import { SiteHeader } from "@/components/site-header";
import { boardCreationRequiresPassword } from "@/lib/env";

export default async function Home() {
  await connection(); // read env at request time, not at build time
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-14 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 lg:py-24">
        <section className="reveal">
          <p className="eyebrow">Tableros de mensajes</p>
          <h1 className="mt-5 font-display text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.02em] text-balance">
            Un muro para <em className="text-accent not-italic">despedir</em>, celebrar o agradecer.
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg font-medium text-fg-2 lg:text-[21px] lg:leading-[1.3]">
            Creá un tablero, compartí el link y cada persona deja un mensaje, una foto o las dos
            cosas. Sin cuentas. El link es la llave.
          </p>
        </section>
        <div className="card reveal p-5 sm:p-8 [animation-delay:70ms]">
          <CreateBoardForm requiresPassword={boardCreationRequiresPassword()} />
        </div>
      </main>
    </>
  );
}
