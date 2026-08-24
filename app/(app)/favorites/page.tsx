import { requireProfile } from "@/lib/auth";
import { getLibraryBooks } from "@/lib/queries";
import { BookCard } from "@/components/books/book-card";
import { PageHeader, EmptyState } from "@/components/ui/page-header";

export default async function FavoritesPage() {
  const profile = await requireProfile();
  const books = await getLibraryBooks(profile.id, { favoritesOnly: true });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader title="המועדפים שלי" subtitle={`${books.length} ספרים`} />
      {books.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="אין עדיין מועדפים"
          hint="אפשר לסמן ספר כמועדף מתוך עמוד הספר."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
