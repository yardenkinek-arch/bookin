import { requireProfile } from "@/lib/auth";
import { getLibraryBooks, type LibraryFilters } from "@/lib/queries";
import { BookCard } from "@/components/books/book-card";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { READING_STATUS_LABELS, READING_STATUS_ORDER } from "@/lib/labels";
import Link from "next/link";
import type { ReadingStatus } from "@/types/database";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;

  const filters: LibraryFilters = {
    search: sp.q,
    status: (sp.status as ReadingStatus) || undefined,
    sort: (sp.sort as LibraryFilters["sort"]) || "title",
  };
  const books = await getLibraryBooks(profile.id, filters);

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-white"
          : "bg-surface border border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  const base = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    const s = params.toString();
    return `/library${s ? `?${s}` : ""}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageHeader
        title="הספרייה שלנו"
        subtitle={`${books.length} ספרים`}
        action={
          profile.role === "admin" ? (
            <div className="flex gap-2">
              <Link
                href="/import"
                className="rounded-lg bg-secondary hover:opacity-90 text-white text-sm font-semibold px-4 py-2 transition"
              >
                📷 מצילום
              </Link>
              <Link
                href="/books/new"
                className="rounded-lg bg-primary hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2 transition"
              >
                + הוספת ספר
              </Link>
            </div>
          ) : undefined
        }
      />

      {/* Search */}
      <form action="/library" method="get" className="mb-3">
        <input
          type="search"
          name="q"
          defaultValue={sp.q}
          placeholder="חיפוש לפי שם, סופר או סדרה…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
        />
      </form>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-1 px-1">
        {chip(base({ status: undefined }), "הכל", !sp.status)}
        {READING_STATUS_ORDER.map((s) =>
          chip(base({ status: s }), READING_STATUS_LABELS[s], sp.status === s),
        )}
      </div>

      {books.length === 0 ? (
        <EmptyState
          title="לא נמצאו ספרים"
          hint={
            sp.q || sp.status
              ? "נסי לשנות את החיפוש או הסינון."
              : profile.role === "admin"
                ? "אפשר להתחיל בהוספת הספר הראשון."
                : "הספרייה עוד ריקה."
          }
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
