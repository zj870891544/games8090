"use client";
export function Artwork({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={640}
      height={360}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/art/fallback.svg";
      }}
    />
  );
}
