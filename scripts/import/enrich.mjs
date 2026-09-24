// Enrich books with cover + description + year from Google Books (conservative match).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const norm = (s) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[׳״'"״׳`.,:!?()\[\]{}<>–—\-–—]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter((w) => w.length > 1);
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function gbooks(title, author) {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&country=IL`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.items || [];
  } catch { return null; }
}

const { data: books } = await sb.from("books").select("id,title,cover_url,description,book_authors(author:authors(name))").is("deleted_at", null).order("created_at");
let done = 0, covered = 0, described = 0, skipped = 0;
const ttoks = (s) => toks(s);

for (const b of books) {
  done++;
  if (b.cover_url && b.description) { continue; } // already enriched
  const author = (b.book_authors[0]?.author?.name) || "";
  const items = await gbooks(b.title, author);
  await sleep(350);
  if (!items || !items.length) { skipped++; continue; }
  // pick best by title similarity
  let best = null, sc = 0;
  const bt = ttoks(b.title);
  for (const it of items) {
    const t = it.volumeInfo?.title || "";
    let s = jac(bt, ttoks(t));
    if (norm(t) && (norm(t).includes(norm(b.title)) || norm(b.title).includes(norm(t)))) s = Math.max(s, 0.7);
    if (s > sc) { sc = s; best = it; }
  }
  if (!best || sc < 0.5) { skipped++; if (done % 25 === 0) console.log(`... ${done}/${books.length} (כריכות: ${covered})`); continue; }
  const info = best.volumeInfo;
  const upd = {};
  let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
  if (cover && !b.cover_url) { upd.cover_url = cover.replace("http://", "https://").replace("&edge=curl", ""); covered++; }
  if (info.description && !b.description) { upd.description = stripHtml(info.description).slice(0, 1500); described++; }
  if (info.publishedDate) { const y = parseInt(info.publishedDate.slice(0, 4), 10); if (Number.isFinite(y)) upd.published_year = y; }
  if (Object.keys(upd).length) {
    upd.metadata_updated_at = new Date().toISOString();
    await sb.from("books").update(upd).eq("id", b.id);
  }
  if (done % 25 === 0) console.log(`... ${done}/${books.length} (כריכות: ${covered}, תקצירים: ${described})`);
}
console.log(`\n=== סיום: עברתי ${done} ספרים | כריכות שנוספו: ${covered} | תקצירים: ${described} | ללא התאמה: ${skipped} ===`);
