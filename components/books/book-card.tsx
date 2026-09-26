import Link from "next/link";
import { Cover } from "./cover";
import { CardVerifyButton } from "./card-verify-button";
import { READING_STATUS_ICON, READING_STATUS_LABELS } from "@/lib/labels";
import type { BookListItem } from "@/lib/queries";

export function BookCard({ book, isAdmin = false }: { book: BookListItem; isAdmin?: boolean }) {
  const authorNames = book.authors.map((a) => a.name).join(", ");
  return (
    <Link
      href={`/books/${book.id}`}
      className="group card overflow-hidden hover:shadow-md transition flex flex-col"
    >
      <div className="relative aspect-[2/3] bg-surface-2">
        <Cover url={book.cover_url} title={book.title} />
        {book.isFavorite && (
          <span className="absolute top-1.5 right-1.5 text-sm drop-shadow">❤️</span>
        )}
        {isAdmin ? (
          <CardVerifyButton bookId={book.id} verifiedAt={book.verified_at} />
        ) : (
          book.verified_at && (
            <span
              title="אומת"
              className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[11px] font-bold drop-shadow"
            >
              ✓
            </span>
          )
        )}
        {book.myStatus && book.myStatus !== "unread" && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 text-white text-[10px] px-2 py-0.5 backdrop-blur">
            {READING_STATUS_ICON[book.myStatus]} {READING_STATUS_LABELS[book.myStatus]}
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        <h3 className="text-sm font-semibold text-ink leading-tight line-clamp-2">
          {book.title}
        </h3>
        {authorNames && (
          <p className="text-xs text-ink-soft line-clamp-1">{authorNames}</p>
        )}
        <div className="mt-auto pt-1 flex items-center justify-between">
          {book.myRating ? (
            <span className="text-xs text-amber">
              {"★".repeat(book.myRating)}
              <span className="text-line">{"★".repeat(5 - book.myRating)}</span>
            </span>
          ) : (
            <span />
          )}
          {book.series && (
            <span className="text-[10px] text-secondary bg-secondary-soft rounded px-1.5 py-0.5 line-clamp-1">
              {book.series.name}
              {book.series_position != null && ` #${book.series_position}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
