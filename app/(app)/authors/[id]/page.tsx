import { requireProfile } from "@/lib/auth";
import { getLibraryBooks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/books/book-card";
import { PageHeader } from "@/components/ui/page-header";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: author } = await supabase
    .from("authors")
    .select("id, name, name_original, bio")
    .eq("id", id)
    .maybeSingle();
  if (!author) notFound();

  const books = await getLibraryBooks(profile.id, { authorId: id });
  const readCount = books.filter(
    (b) => b.myStatus === "read" || b.myStatus === "reread",
  ).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Link
        href="/library"
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← חזרה
      </Link>
      <PageHeader
        title={author.name}
        subtitle={`יש לנו ${books.length} ספרים · קראת ${readCount}`}
      />
      {author.bio && (
        <p className="text-sm text-ink leading-relaxed mb-4">{author.bio}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </div>
  );
}
