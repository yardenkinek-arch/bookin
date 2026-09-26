"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface EditBookInput {
  title: string;
  title_original?: string;
  authors?: string; // comma-separated names
  series_name?: string;
  series_position?: string;
  publisher?: string;
  published_year?: string;
  page_count?: string;
  language?: string;
  isbn_13?: string;
  isbn_10?: string;
  description?: string;
  cover_url?: string;
}

async function upsertAuthor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: e } = await supabase
    .from("authors").select("id").ilike("name", clean).is("deleted_at", null).maybeSingle();
  if (e) return e.id;
  const { data: c } = await supabase.from("authors").insert({ name: clean }).select("id").single();
  return c?.id ?? null;
}

async function upsertSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: e } = await supabase
    .from("series").select("id").ilike("name", clean).is("deleted_at", null).maybeSingle();
  if (e) return e.id;
  const { data: c } = await supabase
    .from("series").insert({ name: clean, confidence: "high" }).select("id").single();
  return c?.id ?? null;
}

/** Update a book's shared/catalog fields (admin only). */
export async function updateBookDetails(
  id: string,
  input: EditBookInput,
): Promise<{ ok?: true; error?: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  if (!input.title.trim()) return { error: "שם הספר חובה." };

  const seriesId = input.series_name?.trim()
    ? await upsertSeries(supabase, input.series_name)
    : null;

  const year = input.published_year ? parseInt(input.published_year, 10) : null;
  const pages = input.page_count ? parseInt(input.page_count, 10) : null;
  const pos = input.series_position ? parseFloat(input.series_position) : null;

  const { error } = await supabase
    .from("books")
    .update({
      title: input.title.trim(),
      title_original: input.title_original?.trim() || null,
      publisher: input.publisher?.trim() || null,
      published_year: Number.isFinite(year) ? year : null,
      page_count: Number.isFinite(pages) ? pages : null,
      language: input.language?.trim() || null,
      isbn_13: input.isbn_13?.trim() || null,
      isbn_10: input.isbn_10?.trim() || null,
      description: input.description?.trim() || null,
      cover_url: input.cover_url?.trim() || null,
      series_id: seriesId,
      series_position: Number.isFinite(pos) ? pos : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "שמירה נכשלה: " + error.message };

  // Replace authors with the edited list.
  await supabase.from("book_authors").delete().eq("book_id", id);
  const names = (input.authors ?? "").split(",").map((a) => a.trim()).filter(Boolean);
  for (let i = 0; i < names.length; i++) {
    const aid = await upsertAuthor(supabase, names[i]);
    if (aid) await supabase.from("book_authors").insert({ book_id: id, author_id: aid, position: i });
  }

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "book.edit",
    entity: "book",
    entity_id: id,
    details: { title: input.title },
  });

  revalidatePath(`/books/${id}`);
  revalidatePath("/library");
  return { ok: true };
}

/** Upload a new cover image to storage and set it on the book (admin only). */
export async function uploadBookCover(
  id: string,
  dataBase64: string,
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const b64 = dataBase64.includes(",") ? dataBase64.split(",")[1] : dataBase64;
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 1000) return { error: "התמונה קטנה או פגומה." };
  const service = createServiceClient();
  const path = `${id}.jpg`;
  const { error } = await service.storage
    .from("covers")
    .upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (error) return { error: "העלאה נכשלה: " + error.message };
  // Cache-bust so a replaced cover shows immediately (same storage path).
  const base = service.storage.from("covers").getPublicUrl(path).data.publicUrl;
  const url = `${base}?v=${Date.now()}`;
  const supabase = await createClient();
  await supabase.from("books").update({ cover_url: url }).eq("id", id);
  revalidatePath(`/books/${id}`);
  revalidatePath("/library");
  return { url };
}
