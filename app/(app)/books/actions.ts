"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import type { ReadingStatus, ShoppingPriority } from "@/types/database";

// --- Personal reading status -------------------------------------------------
export async function setReadingStatus(bookId: string, status: ReadingStatus) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("user_book_status").upsert(
    {
      user_id: profile.id,
      book_id: bookId,
      status,
      date_read: status === "read" ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" },
  );
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/library");
}

// --- Personal rating ---------------------------------------------------------
export async function setRating(bookId: string, rating: number) {
  const profile = await requireProfile();
  const supabase = await createClient();
  if (rating < 1 || rating > 5) return;
  await supabase.from("user_book_ratings").upsert(
    { user_id: profile.id, book_id: bookId, rating, updated_at: new Date().toISOString() },
    { onConflict: "user_id,book_id" },
  );
  revalidatePath(`/books/${bookId}`);
}

// --- Favorite toggle ---------------------------------------------------------
export async function toggleFavorite(bookId: string, makeFavorite: boolean) {
  const profile = await requireProfile();
  const supabase = await createClient();
  if (makeFavorite) {
    await supabase.from("favorites").upsert(
      { user_id: profile.id, book_id: bookId },
      { onConflict: "user_id,book_id" },
    );
  } else {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", profile.id)
      .eq("book_id", bookId);
  }
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/favorites");
}

// --- Personal tags -----------------------------------------------------------
export async function addTag(bookId: string, tag: string) {
  const profile = await requireProfile();
  const clean = tag.trim();
  if (!clean) return;
  const supabase = await createClient();
  await supabase
    .from("user_book_tags")
    .insert({ user_id: profile.id, book_id: bookId, tag: clean });
  revalidatePath(`/books/${bookId}`);
}

export async function removeTag(tagId: string, bookId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("user_book_tags").delete().eq("id", tagId).eq("user_id", profile.id);
  revalidatePath(`/books/${bookId}`);
}

// --- Personal note -----------------------------------------------------------
export async function saveNote(bookId: string, body: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const clean = body.trim();
  if (!clean) {
    await supabase
      .from("user_notes")
      .delete()
      .eq("user_id", profile.id)
      .eq("book_id", bookId);
  } else {
    await supabase.from("user_notes").upsert(
      {
        user_id: profile.id,
        book_id: bookId,
        body: clean,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    );
  }
  revalidatePath(`/books/${bookId}`);
}

// --- PRIVATE: "needs review" flag (טעון עיון) -------------------------------
export async function createReviewFlag(
  bookId: string,
  page: number | null,
  note: string,
) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: flag, error } = await supabase
    .from("review_flags")
    .insert({ book_id: bookId, reported_by: profile.id, page })
    .select("id")
    .single();
  if (error || !flag) return { error: "לא ניתן היה לשמור את הדיווח." };

  if (note.trim()) {
    await supabase.from("review_notes").insert({ flag_id: flag.id, body: note.trim() });
  }

  // fetch title for the notification
  const { data: book } = await supabase
    .from("books")
    .select("title")
    .eq("id", bookId)
    .single();

  await notifyAdmins({
    type: "review_flag",
    title: "ספר חדש דורש את תשומת ליבך",
    body: `"${book?.title ?? "ספר"}"${page ? ` — עמוד ${page}` : ""}. נכתבה הערה פרטית.`,
    link: `/books/${bookId}`,
  });

  revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

// --- Shopping list -----------------------------------------------------------
export async function addToShopping(input: {
  bookId?: string;
  title?: string;
  authorName?: string;
  isbn?: string;
  priority?: ShoppingPriority;
  note?: string;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("shopping_list").insert({
    book_id: input.bookId ?? null,
    title: input.title ?? null,
    author_name: input.authorName ?? null,
    isbn: input.isbn ?? null,
    added_by: profile.id,
    priority: input.priority ?? "normal",
    note: input.note ?? null,
  });

  await notifyAdmins({
    type: "shopping_add",
    title: "ספר נוסף לרשימת הקניות",
    body: `${profile.display_name} הוסיף/ה "${input.title ?? "ספר"}".`,
    link: "/shopping",
  });

  revalidatePath("/shopping");
  revalidatePath(`/books/${input.bookId}`);
}
