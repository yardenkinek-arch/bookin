import { requireAdmin } from "@/lib/auth";
import { getBookDetail } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EditBookForm } from "./edit-book-form";
import type { EditBookInput } from "./actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const detail = await getBookDetail(id, admin.id);
  if (!detail) notFound();
  const { book } = detail;

  const initial: EditBookInput = {
    title: book.title,
    title_original: book.title_original ?? "",
    authors: book.authors.map((a) => a.name).join(", "),
    series_name: book.series?.name ?? "",
    series_position: book.series_position?.toString() ?? "",
    publisher: book.publisher ?? "",
    published_year: book.published_year?.toString() ?? "",
    page_count: book.page_count?.toString() ?? "",
    language: book.language ?? "",
    isbn_13: book.isbn_13 ?? "",
    isbn_10: book.isbn_10 ?? "",
    description: book.description ?? "",
    cover_url: book.cover_url ?? "",
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link
        href={`/books/${id}`}
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← חזרה לספר
      </Link>
      <PageHeader title="עריכת ספר" subtitle="עריכה ידנית של פרטי הספר (למנהלת בלבד)" />
      <EditBookForm id={id} initial={initial} />
    </div>
  );
}
