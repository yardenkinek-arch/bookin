import { requireProfile } from "@/lib/auth";
import { getLibraryBooks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/books/book-card";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireProfile();
  const { q } = await searchParams;

  const supabase = await createClient();
  const [books, authorsRes, seriesRes] = await Promise.all([
    q ? getLibraryBooks(profile.id, { search: q }) : Promise.resolve([]),
    q
      ? supabase
          .from("authors")
          .select("id, name")
          .ilike("name", `%${q}%`)
          .is("deleted_at", null)
          .limit(10)
      : Promise.resolve({ data: [] }),
    q
      ? supabase
          .from("series")
          .select("id, name, total_books")
          .ilike("name", `%${q}%`)
          .is("deleted_at", null)
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const authors = authorsRes.data ?? [];
  const series = seriesRes.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader title="חיפוש" />
      <form action="/search" method="get" className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="שם ספר, סופר, סדרה…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
      </form>

      {!q ? (
        <EmptyState icon="🔍" title="מה מחפשים?" hint="אפשר לחפש לפי שם, סופר או סדרה." />
      ) : (
        <div className="space-y-6">
          {(authors.length > 0 || series.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {authors.map((a) => (
                <Link
                  key={a.id}
                  href={`/authors/${a.id}`}
                  className="rounded-full bg-surface border border-line px-3 py-1.5 text-sm hover:border-primary transition"
                >
                  ✍️ {a.name}
                </Link>
              ))}
              {series.map((s) => (
                <Link
                  key={s.id}
                  href={`/series/${s.id}`}
                  className="rounded-full bg-secondary-soft text-secondary px-3 py-1.5 text-sm hover:opacity-80 transition"
                >
                  📖 {s.name}
                </Link>
              ))}
            </div>
          )}

          {books.length === 0 ? (
            <EmptyState
              title={`לא נמצאו ספרים עבור "${q}"`}
              hint="ייתכן שהספר עדיין לא בספרייה."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {books.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
