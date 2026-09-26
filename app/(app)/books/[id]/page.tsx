import { requireProfile } from "@/lib/auth";
import { getBookDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Cover } from "@/components/books/cover";
import {
  StatusPicker,
  StarRating,
  FavoriteButton,
  TagEditor,
  NoteEditor,
} from "@/components/books/personal-controls";
import { ReviewFlagButton } from "@/components/books/review-flag";
import { AdminBookControls } from "@/components/books/admin-book-controls";
import { READING_STATUS_ICON } from "@/lib/labels";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReadingStatus } from "@/types/database";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const detail = await getBookDetail(id, profile.id);
  if (!detail) notFound();

  const { book, genres, myNote, myTags, familyStatuses, profiles } = detail;
  const statusByUser = new Map(
    familyStatuses.map((s) => [s.user_id, s.status as ReadingStatus]),
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link
        href="/library"
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← חזרה לספרייה
      </Link>

      {/* Header */}
      <div className="flex gap-4 md:gap-6">
        <div className="w-28 md:w-40 shrink-0 aspect-[2/3] rounded-lg overflow-hidden card">
          <Cover url={book.cover_url} title={book.title} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-ink leading-tight">
            {book.title}
          </h1>
          {profile.role === "admin" && book.verified_at && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary bg-primary-soft rounded-full px-2.5 py-0.5">
              ✓ אומת
            </span>
          )}
          {book.title_original && book.title_original !== book.title && (
            <p className="text-ink-soft text-sm mt-0.5" dir="auto">
              {book.title_original}
            </p>
          )}
          {book.authors.length > 0 && (
            <p className="text-ink-soft mt-1">
              {book.authors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/authors/${a.id}`}
                    className="hover:text-primary transition"
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {book.series && (
            <Link
              href={`/series/${book.series.id}`}
              className="inline-block mt-2 text-sm text-secondary bg-secondary-soft rounded-full px-3 py-1 hover:opacity-80 transition"
            >
              📖 {book.series.name}
              {book.series_position != null && ` — ספר ${book.series_position}`}
            </Link>
          )}
          <div className="mt-3">
            <StarRating bookId={book.id} current={book.myRating} />
          </div>
          <div className="mt-3">
            <FavoriteButton bookId={book.id} current={book.isFavorite} />
          </div>
        </div>
      </div>

      {/* My reading status */}
      <Section title="הסטטוס שלי">
        <StatusPicker bookId={book.id} current={book.myStatus} />
      </Section>

      {/* Who read (family) */}
      <Section title="מי במשפחה קרא?">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {profiles.map((p) => {
            const st = statusByUser.get(p.id);
            const read = st === "read" || st === "reread";
            const isMe = p.id === profile.id;
            const known = isMe || profile.role === "admin";
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-soft">
                  {p.display_name.charAt(0)}
                </span>
                <span className="text-sm text-ink flex-1">{p.display_name}</span>
                <span className="text-sm">
                  {read ? "✅" : st ? READING_STATUS_ICON[st] : known ? "—" : "•"}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Personal tags */}
      <Section title="התגיות שלי">
        <TagEditor bookId={book.id} tags={myTags} />
      </Section>

      {/* Personal note */}
      <Section title="הערה אישית">
        <NoteEditor bookId={book.id} initial={myNote?.body ?? ""} />
      </Section>

      {/* Book details */}
      <Section title="פרטי הספר">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Detail label="הוצאה" value={book.publisher} />
          <Detail
            label="שנת פרסום"
            value={book.published_year?.toString()}
          />
          <Detail label="עמודים" value={book.page_count?.toString()} />
          <Detail label="שפה" value={book.language} />
          <Detail label="ISBN-13" value={book.isbn_13} />
          <Detail label="ISBN-10" value={book.isbn_10} />
          <Detail label="פורמט" value={book.format} />
        </dl>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/library?genre=${g.id}`}
                className="rounded-full bg-surface-2 text-ink-soft text-xs px-2.5 py-1 hover:text-ink transition"
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}
        {book.description && (
          <p className="mt-3 text-sm text-ink leading-relaxed whitespace-pre-line">
            {book.description}
          </p>
        )}
      </Section>

      {/* Review flag — reporter (all family members) */}
      <div className="mt-6">
        <ReviewFlagButton bookId={book.id} />
      </div>

      {/* Admin-only: edit + verify controls */}
      {profile.role === "admin" && (
        <AdminBookControls bookId={book.id} verifiedAt={book.verified_at} />
      )}

      {/* Admin-only private review panel */}
      {profile.role === "admin" && <AdminReviewPanel bookId={book.id} />}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink-soft mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between border-b border-line py-1">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink font-medium" dir="auto">
        {value}
      </dd>
    </div>
  );
}

// --- Admin: private review flags for this book ------------------------------
async function AdminReviewPanel({ bookId }: { bookId: string }) {
  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("review_flags")
    .select(
      "id, page, status, created_at, reporter:profiles!review_flags_reported_by_fkey ( display_name ), review_notes ( body )",
    )
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  const rows = (flags ?? []) as unknown as Array<{
    id: string;
    page: number | null;
    status: string;
    created_at: string;
    reporter: { display_name: string } | null;
    review_notes: { body: string }[];
  }>;
  if (rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-warn/40 bg-amber/5 p-4">
      <h2 className="font-semibold text-ink flex items-center gap-2">
        ⚠️ דיווחים פרטיים (גלוי למנהלת בלבד)
      </h2>
      <div className="mt-3 space-y-3">
        {rows.map(
          (f) => (
            <div key={f.id} className="rounded-lg bg-surface border border-line p-3">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span>
                  דווח ע"י {f.reporter?.display_name ?? "לא ידוע"}
                  {f.page ? ` · עמוד ${f.page}` : ""}
                </span>
                <span>{new Date(f.created_at).toLocaleDateString("he-IL")}</span>
              </div>
              {f.review_notes?.map((n, i) => (
                <p key={i} className="mt-1.5 text-sm text-ink">
                  {n.body}
                </p>
              ))}
            </div>
          ),
        )}
      </div>
      <Link
        href="/review"
        className="inline-block mt-3 text-sm text-primary hover:underline"
      >
        לניהול כל הדיווחים →
      </Link>
    </section>
  );
}
