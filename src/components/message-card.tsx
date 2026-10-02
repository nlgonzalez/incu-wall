import Image from "next/image";

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export interface CardPhoto {
  src: string;
  width: number;
  height: number;
  /** Local blob previews are not optimisable by next/image. */
  local?: boolean;
}

/** Presentational card shared by the wall, the preview step and the admin panel. */
export function MessageCard({
  authorName,
  body,
  photo,
  createdAt,
  preload = false,
  onPhotoClick,
  footer,
  badge,
}: {
  authorName: string;
  body: string | null;
  photo: CardPhoto | null;
  createdAt?: string;
  preload?: boolean;
  onPhotoClick?: () => void;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const alt = `Foto de ${authorName}`;
  const image = photo ? (
    photo.local ? (
      // eslint-disable-next-line @next/next/no-img-element -- blob: preview
      <img src={photo.src} alt={alt} width={photo.width} height={photo.height} className="h-auto w-full" />
    ) : (
      <Image
        src={photo.src}
        alt={alt}
        width={photo.width}
        height={photo.height}
        preload={preload}
        sizes="(min-width: 1280px) 22rem, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="h-auto w-full"
      />
    )
  ) : null;

  return (
    <article className="card reveal mb-4 break-inside-avoid overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-accent/35 hover:shadow-[var(--glow-violet-soft)]">
      {image ? (
        onPhotoClick ? (
          <button
            type="button"
            onClick={onPhotoClick}
            className="block w-full cursor-zoom-in border-b border-line"
            aria-label={`Ver en grande la foto de ${authorName}`}
          >
            {image}
          </button>
        ) : (
          image
        )
      ) : null}
      <div className="px-5 py-[18px]">
        {badge}
        {body ? <p className="whitespace-pre-wrap break-words text-base leading-normal text-fg-1">{body}</p> : null}
        <p className={`flex items-baseline justify-between gap-2 text-sm ${body ? "mt-3" : ""}`}>
          <span className="font-semibold">— {authorName}</span>
          {createdAt ? (
            <time dateTime={createdAt} className="font-mono text-xs tabular-nums text-fg-3">
              {dateFormat.format(new Date(createdAt))}
            </time>
          ) : null}
        </p>
        {footer}
      </div>
    </article>
  );
}
