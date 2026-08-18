import Image from 'next/image'

export function BadgeImage({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  if (!src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-border bg-canvas text-muted"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="5" />
          <path d="M9 12.5 5 22l7-3 7 3-4-9.5" />
        </svg>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full border border-border object-cover"
    />
  )
}
