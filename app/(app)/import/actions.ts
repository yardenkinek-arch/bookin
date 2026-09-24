"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { extractBooksFromImage, MissingApiKeyError, type ExtractedBook } from "@/lib/vision";
import { enrichFromSimania, downloadCover, norm } from "@/lib/simania";
import { revalidatePath } from "next/cache";

export interface ImportCandidate {
  title: string;
  author: string;
  series: string;
  position: string;
  description: string;
  published_year: string;
  cover_url: string; // Simania URL (downloaded to storage on commit)
  matched: boolean; // found on Simania
  duplicate: { id: string; title: string } | null;
}

type ImageInput = { data: string; mediaType: string };

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Extract books from uploaded photos, enrich from Simania, and flag duplicates. */
export async function extractAction(
  images: ImageInput[],
): Promise<{ candidates: ImportCandidate[]; error?: string; warning?: string }> {
  await requireAdmin();
  if (!images.length) return { candidates: [], error: "לא נבחרו תמונות." };

  // 1) Vision extraction, merged across all photos.
  const raw: ExtractedBook[] = [];
  let failedImages = 0;
  for (const img of images) {
    const mt = ALLOWED.has(img.mediaType) ? img.mediaType : "image/jpeg";
    try {
      const books = await extractBooksFromImage(img.data, mt as "image/jpeg");
      raw.push(...books);
    } catch (e) {
      if (e instanceof MissingApiKeyError) {
        return {
          candidates: [],
          error:
            "שירות זיהוי התמונות לא מוגדר עדיין (חסר מפתח ANTHROPIC_API_KEY). ראי הוראות ההגדרה.",
        };
      }
      failedImages++;
    }
  }

  // 2) Dedup within the batch by normalized title (prefer one that has an author).
  const byTitle = new Map<string, ExtractedBook>();
  for (const b of raw) {
    const key = norm(b.title);
    if (!key) continue;
    const prev = byTitle.get(key);
    if (!prev || (!prev.author && b.author)) byTitle.set(key, b);
  }
  const unique = [...byTitle.values()];
  if (!unique.length) {
    return {
      candidates: [],
      warning: failedImages
        ? "לא זוהו ספרים, וחלק מהתמונות נכשלו בעיבוד."
        : "לא זוהו ספרים בתמונות. נסי תמונה חדה וקרובה יותר.",
    };
  }

  // 3) Enrich + duplicate check.
  const supabase = await createClient();
  const candidates: ImportCandidate[] = [];
  for (const b of unique) {
    const enr = await enrichFromSimania(b.title, b.author ?? "");
    const { data: dup } = await supabase
      .from("books")
      .select("id, title")
      .ilike("title", b.title.trim())
      .is("deleted_at", null)
      .maybeSingle();
    candidates.push({
      title: b.title,
      author: b.author ?? "",
      series: b.series ?? enr.seriesName ?? "",
      position: (b.position ?? enr.seriesPosition ?? "").toString(),
      description: enr.description ?? "",
      published_year: (enr.publishedYear ?? "").toString(),
      cover_url: enr.coverUrl ?? "",
      matched: enr.matched,
      duplicate: dup ?? null,
    });
  }

  candidates.sort((a, b) => Number(!!b.duplicate) - Number(!!a.duplicate));
  return {
    candidates,
    warning: failedImages ? `שים לב: ${failedImages} תמונות נכשלו בעיבוד.` : undefined,
  };
}

async function upsertAuthor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: existing } = await supabase
    .from("authors").select("id").ilike("name", clean).is("deleted_at", null).maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("authors").insert({ name: clean }).select("id").single();
  return created?.id ?? null;
}

async function upsertSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data: existing } = await supabase
    .from("series").select("id").ilike("name", clean).is("deleted_at", null).maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("series").insert({ name: clean, confidence: "medium" }).select("id").single();
  return created?.id ?? null;
}

/** Insert the chosen candidates into the library. Downloads covers to storage. */
export async function commitAction(
  candidates: ImportCandidate[],
): Promise<{ added: number; skipped: number; errors: number }> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const service = createServiceClient();

  let added = 0, skipped = 0, errors = 0;
  for (const c of candidates) {
    const title = c.title.trim();
    if (!title) { skipped++; continue; }

    // Re-check duplicate at commit time (exact, case-insensitive title).
    const { data: existing } = await supabase
      .from("books").select("id").ilike("title", title).is("deleted_at", null).maybeSingle();
    if (existing) { skipped++; continue; }

    const seriesId = c.series.trim() ? await upsertSeries(supabase, c.series) : null;
    const year = parseInt(c.published_year, 10);
    const pos = parseFloat(c.position);

    const { data: book, error } = await supabase
      .from("books")
      .insert({
        title,
        published_year: Number.isFinite(year) ? year : null,
        description: c.description.trim() || null,
        language: "he",
        series_id: seriesId,
        series_position: Number.isFinite(pos) ? pos : null,
        source: "import_ocr" as never,
        created_by: admin.id,
      })
      .select("id")
      .single();

    if (error || !book) { errors++; continue; }

    // Authors
    const authorNames = c.author.split(",").map((a) => a.trim()).filter(Boolean);
    for (let i = 0; i < authorNames.length; i++) {
      const authorId = await upsertAuthor(supabase, authorNames[i]);
      if (authorId) {
        await supabase.from("book_authors").insert({ book_id: book.id, author_id: authorId, position: i });
      }
    }

    // Cover → download to storage bucket (durable, served from our own infra).
    if (c.cover_url) {
      const buf = await downloadCover(c.cover_url);
      if (buf) {
        const path = `${book.id}.jpg`;
        const { error: upErr } = await service.storage
          .from("covers").upload(path, buf, { contentType: "image/jpeg", upsert: true });
        if (!upErr) {
          const publicUrl = service.storage.from("covers").getPublicUrl(path).data.publicUrl;
          await supabase.from("books").update({ cover_url: publicUrl }).eq("id", book.id);
        }
      }
    }

    await supabase.from("audit_logs").insert({
      actor_id: admin.id,
      action: "book.create",
      entity: "book",
      entity_id: book.id,
      details: { title, via: "import_photo" },
    });
    added++;
  }

  revalidatePath("/library");
  return { added, skipped, errors };
}
