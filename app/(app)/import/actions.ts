"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const BUCKET = "import-inbox";

export interface InboxItem {
  name: string;
  url: string; // signed URL for thumbnail preview
  createdAt: string | null;
}

type ImageInput = { data: string; mediaType: string };

/**
 * Save uploaded book photos to a private inbox. They are NOT auto-processed —
 * the family's Claude assistant reads them, identifies each book, enriches it
 * from Simania and adds it to the library. This keeps the feature free (no paid
 * vision API) while staying accurate on Hebrew spines.
 */
export async function uploadInboxAction(
  images: ImageInput[],
): Promise<{ uploaded: number; error?: string }> {
  const admin = await requireAdmin();
  if (!images.length) return { uploaded: 0, error: "לא נבחרו תמונות." };
  const service = createServiceClient();

  const batch = Date.now();
  let uploaded = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const b64 = img.data.includes(",") ? img.data.split(",")[1] : img.data;
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 1000) continue;
    const path = `${admin.id}/${batch}-${i}.jpg`;
    const { error } = await service.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (!error) uploaded++;
  }
  revalidatePath("/import");
  return { uploaded };
}

/** List the photos currently waiting in the inbox (admin only). */
export async function listInboxAction(): Promise<InboxItem[]> {
  await requireAdmin();
  const service = createServiceClient();
  const items: InboxItem[] = [];
  // Objects are stored under a per-admin folder; list folders then files.
  const { data: folders } = await service.storage.from(BUCKET).list("", { limit: 100 });
  for (const folder of folders ?? []) {
    if (folder.id !== null) continue; // a file at root (shouldn't happen)
    const { data: files } = await service.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    for (const f of files ?? []) {
      const full = `${folder.name}/${f.name}`;
      const { data: signed } = await service.storage.from(BUCKET).createSignedUrl(full, 3600);
      items.push({
        name: full,
        url: signed?.signedUrl ?? "",
        createdAt: f.created_at ?? null,
      });
    }
  }
  return items;
}

/** Remove all photos currently in the inbox (admin only). */
export async function clearInboxAction(): Promise<{ removed: number }> {
  await requireAdmin();
  const service = createServiceClient();
  const items = await listInboxAction();
  if (!items.length) return { removed: 0 };
  const { data } = await service.storage.from(BUCKET).remove(items.map((i) => i.name));
  revalidatePath("/import");
  return { removed: data?.length ?? 0 };
}
