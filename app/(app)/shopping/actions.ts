"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireAdmin } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import type { ShoppingPriority } from "@/types/database";

export type DuplicateCheck =
  | { level: "none" }
  | { level: "owned"; bookId: string; title: string }
  | { level: "same_title"; title: string };

/** Check whether a book is already owned before adding to the shopping list. */
export async function checkDuplicate(
  title: string,
  isbn?: string,
): Promise<DuplicateCheck> {
  await requireProfile();
  const supabase = await createClient();

  if (isbn) {
    const clean = isbn.replace(/[^0-9Xx]/g, "");
    const { data } = await supabase
      .from("books")
      .select("id, title")
      .or(`isbn_13.eq.${clean},isbn_10.eq.${clean}`)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { level: "owned", bookId: data.id, title: data.title };
  }

  if (title.trim()) {
    const { data } = await supabase
      .from("books")
      .select("id, title")
      .ilike("title", title.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return { level: "same_title", title: data.title };
  }

  return { level: "none" };
}

export async function addShoppingItem(input: {
  title: string;
  authorName?: string;
  isbn?: string;
  priority?: ShoppingPriority;
  note?: string;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (!input.title.trim()) return { error: "יש להזין שם ספר." };

  await supabase.from("shopping_list").insert({
    title: input.title.trim(),
    author_name: input.authorName?.trim() || null,
    isbn: input.isbn?.trim() || null,
    added_by: profile.id,
    priority: input.priority ?? "normal",
    note: input.note?.trim() || null,
  });

  await notifyAdmins({
    type: "shopping_add",
    title: "ספר נוסף לרשימת הקניות",
    body: `${profile.display_name} הוסיף/ה "${input.title.trim()}".`,
    link: "/shopping",
  });

  revalidatePath("/shopping");
  return { ok: true };
}

export async function markPurchased(id: string, purchased: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("shopping_list").update({ purchased }).eq("id", id);
  revalidatePath("/shopping");
}

export async function removeShoppingItem(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("shopping_list").delete().eq("id", id);
  revalidatePath("/shopping");
}
