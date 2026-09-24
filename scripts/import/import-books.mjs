// Batch import books from a JSON file into the live Supabase library.
// Usage: node scripts/import/import-books.mjs scripts/import/imageNN.json
//
// JSON shape: [{ "title": "...", "authors": ["..."], "series": "...?",
//               "series_position": 1?, "language": "he"? }, ...]
//
// - find-or-create authors + series (by case-insensitive name)
// - dedupe: skips a book if same title already exists (not deleted)
// - marks source = 'import_ocr'
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envFile.split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const jsonPath = process.argv[2];
if (!jsonPath) { console.error("Pass a JSON file path"); process.exit(1); }
const books = JSON.parse(readFileSync(jsonPath, "utf8"));

// admin id for created_by
const { data: admin } = await sb.from("profiles").select("id").eq("role", "admin").limit(1).single();
const adminId = admin?.id ?? null;

const seriesCache = new Map();
const authorCache = new Map();

async function upsertSeries(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (seriesCache.has(key)) return seriesCache.get(key);
  const { data: found } = await sb.from("series").select("id").ilike("name", name.trim()).is("deleted_at", null).maybeSingle();
  let id = found?.id;
  if (!id) {
    const { data: created } = await sb.from("series").insert({ name: name.trim(), confidence: "high" }).select("id").single();
    id = created?.id;
  }
  seriesCache.set(key, id);
  return id;
}

async function upsertAuthor(name) {
  const clean = name.trim();
  if (!clean) return null;
  const key = clean.toLowerCase();
  if (authorCache.has(key)) return authorCache.get(key);
  const { data: found } = await sb.from("authors").select("id").ilike("name", clean).is("deleted_at", null).maybeSingle();
  let id = found?.id;
  if (!id) {
    const { data: created } = await sb.from("authors").insert({ name: clean }).select("id").single();
    id = created?.id;
  }
  authorCache.set(key, id);
  return id;
}

let inserted = 0, skipped = 0;
for (const b of books) {
  const title = b.title.trim();
  // dedupe by exact-ish title
  const { data: existing } = await sb.from("books").select("id").ilike("title", title).is("deleted_at", null).maybeSingle();
  if (existing) { console.log(`⏭️  קיים כבר: ${title}`); skipped++; continue; }

  const seriesId = await upsertSeries(b.series);
  const { data: book, error } = await sb.from("books").insert({
    title,
    language: b.language ?? "he",
    series_id: seriesId,
    series_position: b.series_position ?? null,
    source: "import_ocr",
    source_confidence: "high",
    created_by: adminId,
  }).select("id").single();
  if (error || !book) { console.log(`❌ ${title}: ${error?.message}`); continue; }

  const authors = b.authors ?? [];
  for (let i = 0; i < authors.length; i++) {
    const aid = await upsertAuthor(authors[i]);
    if (aid) await sb.from("book_authors").insert({ book_id: book.id, author_id: aid, position: i });
  }
  console.log(`✅ ${title}${authors.length ? " — " + authors.join(", ") : ""}`);
  inserted++;
}

console.log(`\n=== סיכום: ${inserted} נוספו, ${skipped} דילוגים (כפילויות) ===`);
