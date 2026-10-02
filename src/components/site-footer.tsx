import { IncuWordmark } from "./brand";

/** Brand pattern for products: "Built by [incu]" linking to the parent brand. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-6">
        <span className="font-mono text-sm font-semibold">wall</span>
        <a
          href="https://incu.tech"
          className="group flex items-center gap-3"
          aria-label="Built by Incu (incu.tech)"
        >
          <span className="eyebrow">Built by</span>
          <IncuWordmark className="h-[22px] w-auto text-white opacity-80 transition-opacity group-hover:opacity-100" />
        </a>
      </div>
    </footer>
  );
}
