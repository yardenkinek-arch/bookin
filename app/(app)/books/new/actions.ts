"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { lookupByISBN, type BookMetadata } from "@/lib/metadata";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Look up metadata by ISBN (admin add form). Also flags possible duplicates. */
export async function lookupIsbnAction(isbn: string): Promise<{
  status: "found" | "not_found";
  book?: BookMetadata;
  duplicate?: { id: string; title: string } | null;
}> {
  await requireAdmin();
  const result = await lookupByISBN(isbn);
  if (result.status !== "found" || !result.book) return { status: "not_found" };

  // duplicate check by ISBN
  const supabase = await createClient();
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  const { data: dup } = await supabase
    .from("books")
    .select("id, title")
    .or(`isbn_13.eq.${clean},isbn_10.eq.${clean}`)
    .is("deleted_at", null)
    .maybeSingle();

  return { status: "found", book: result.book, duplicate: dup ?? null };
}

export interface CreateBookInput {
  title: string;
  title_original?: string;
  authors?: string; // comma-separated
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  published_year?: string;
  page_count?: string;
  language?: string;
  description?: string;
  cover_url?: string;
  series_name?: string;
  series_position?: string;
  source?: string;
}

/** find-or-create an author by name; returns id */
async function upsertAuthor(name: string): Promise<string | null> {
  const supabase = await createClient();
  const clean = name.trim();
  if (!clean) return null;
  const { data: existing } = await supabase
    .from("authors")
    .select("id")
    .ilike("name", clean)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("authors")
    .insert({ name: clean })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function upsertSeries(name: string): Promise<string | null> {
  const supabase = await createClient();
  const clean = name.trim();
  if (!clean) return null;
  const { data: existing } = await supabase
    .from("series")
    .select("id")
    .ilike("name", clean)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("series")
    .insert({ name: clean, confidence: "medium" })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function createBook(input: CreateBookInput) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const seriesId = input.series_name
    ? await upsertSeries(input.series_name)
    : null;

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      title: input.title.trim(),
      title_original: input.title_original?.trim() || null,
      isbn_13: input.isbn_13?.trim() || null,
      isbn_10: input.isbn_10?.trim() || null,
      publisher: input.publisher?.trim() || null,
      published_year: input.published_year
        ? parseInt(input.published_year, 10)
        : null,
      page_count: input.page_count ? parseInt(input.page_count, 10) : null,
      language: input.language?.trim() || "he",
      description: input.description?.trim() || null,
      cover_url: input.cover_url?.trim() || null,
      series_id: seriesId,
      series_position: input.series_position
        ? parseFloat(input.series_position)
        : null,
      source: (input.source as never) || "manual",
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !book) {
    return { error: "לא ניתן היה לשמור את הספר: " + (error?.message ?? "") };
  }

  // authors
  const authorNames = (input.authors ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  for (let i = 0; i < authorNames.length; i++) {
    const authorId = await upsertAuthor(authorNames[i]);
    if (authorId) {
      await supabase
        .from("book_authors")
        .insert({ book_id: book.id, author_id: authorId, position: i });
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "book.create",
    entity: "book",
    entity_id: book.id,
    details: { title: input.title },
  });

  revalidatePath("/library");
  redirect(`/books/${book.id}`);
}
