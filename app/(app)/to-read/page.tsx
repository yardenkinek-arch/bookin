import { requireProfile } from "@/lib/auth";
import { getLibraryBooks } from "@/lib/queries";
import { BookCard } from "@/components/books/book-card";
import { PageHeader, EmptyState } from "@/components/ui/page-header";

export default async function ToReadPage() {
  const profile = await requireProfile();
  const [wantTo, reading] = await Promise.all([
    getLibraryBooks(profile.id, { status: "want_to_read" }),
    getLibraryBooks(profile.id, { status: "reading" }),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader title="לקרוא" subtitle="מה שאני קורא/ת עכשיו ומה שבתור" />

      {reading.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-ink-soft mb-2 mt-4">
            📖 קורא/ת עכשיו
          </h2>
          <Grid books={reading} />
        </>
      )}

      <h2 className="text-sm font-semibold text-ink-soft mb-2 mt-6">
        🔖 רוצה לקרוא
      </h2>
      {wantTo.length === 0 ? (
        <EmptyState
          icon="📖"
          title="אין ספרים בתור"
          hint='אפשר לסמן ספר כ"רוצה לקרוא" מתוך עמוד הספר.'
        />
      ) : (
        <Grid books={wantTo} />
      )}
    </div>
  );
}

function Grid({ books }: { books: Awaited<ReturnType<typeof getLibraryBooks>> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {books.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
    </div>
  );
}
