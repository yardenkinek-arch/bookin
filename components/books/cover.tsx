/** Book cover with a graceful placeholder when no image exists. */
export function Cover({
  url,
  title,
  className = "",
}: {
  url: string | null;
  title: string;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={title}
        loading="lazy"
        className={`object-cover w-full h-full ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center w-full h-full bg-surface-2 text-center p-2 ${className}`}
    >
      <span className="text-ink-soft text-xs font-medium line-clamp-4">
        {title}
      </span>
    </div>
  );
}
