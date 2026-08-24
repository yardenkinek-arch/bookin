import { requireProfile } from "@/lib/auth";
import { getSeriesBooks, getSeriesOverview } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/books/book-card";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: series } = await supabase
    .from("series")
    .select("id, name, description, total_books")
    .eq("id", id)
    .maybeSingle();
  if (!series) notFound();

  const [books, overview] = await Promise.all([
    getSeriesBooks(id, profile.id),
    getSeriesOverview(),
  ]);
  const info = overview.find((s) => s.id === id);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Link
        href="/series"
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← כל הסדרות
      </Link>
      <PageHeader
        title={series.name}
        subtitle={
          series.total_books
            ? `${books.length} מתוך ${series.total_books} ספרים`
            : `${books.length} ספרים`
        }
      />

      {series.description && (
        <p className="text-sm text-ink leading-relaxed mb-4">
          {series.description}
        </p>
      )}

      {info && info.missingPositions.length > 0 && (
        <div className="card p-4 mb-5 border-primary/30">
          <h3 className="font-semibold text-ink flex items-center gap-2">
            🧩 השלמת הסדרה
          </h3>
          <p className="text-sm text-ink-soft mt-1">
            חסרים לכם:{" "}
            <span className="text-primary font-medium">
              {info.missingPositions.map((n) => `#${n}`).join(", ")}
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </div>
  );
}
