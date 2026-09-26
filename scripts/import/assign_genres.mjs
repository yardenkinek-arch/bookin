// Assign a genre to every book from Simania's category taxonomy.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const UA = "Mozilla/5.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[׳״'"״׳`.,:;!?()\[\]{}<>–—\-–—/]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter((w) => w.length > 1);
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

// 1) category id -> name
const catRes = await fetch("https://simania.co.il/api/categories", { headers: { "User-Agent": UA, Accept: "application/json" } });
const catArr = await catRes.json();
const catName = new Map((Array.isArray(catArr) ? catArr : []).map((c) => [c.categoryId, c.categoryName]));

// Map Simania's coarse categories onto the EXISTING seeded genres (never create new).
const SIM_TO_SEED = {
  "ילדים": "ילדים", "נוער": "נוער", "יהדות": "יהדות",
  "ספרות": "ספרות", "ספרות שואה": "ספרות", "English Books": "ספרות",
  "עיון": "עיון", "פסיכולוגיה": "עיון", "בישול ואפיה": "עיון", "בריאות": "עיון",
  "הריון ומשפחה": "עיון", "חוכמת חיים": "עיון", "ישראל וציונות": "עיון",
  "לימוד עצמי": "עיון", "מדע וטבע": "עיון", "מדריכי נסיעות": "עיון",
  "מחשבים ואינטרנט": "עיון", "ספרי עזר": "עיון", "עידן חדש": "עיון",
  "עסקים וכלכלה": "עיון", "פנאי ותחביבים": "עיון", "אמנות": "עיון", "ספרי לימוד": "עיון",
};

// 2) look up existing genre id by name (do NOT create)
const genreCache = new Map();
async function genreId(name) {
  if (genreCache.has(name)) return genreCache.get(name);
  const { data: e } = await sb.from("genres").select("id").eq("name", name).maybeSingle();
  const id = e?.id ?? null;
  genreCache.set(name, id);
  return id;
}

// 3) books without a genre
const LIMIT = process.env.LIMIT ? +process.env.LIMIT : null;
let bq = sb.from("books").select("id,title,book_authors(author:authors(name)),book_genres(genre_id)").is("deleted_at", null).order("created_at");
if (LIMIT) bq = bq.limit(LIMIT);
const { data: books } = await bq;
let done = 0, assigned = 0, nomatch = 0, hadGenre = 0;
for (const b of books) {
  done++;
  if (b.book_genres && b.book_genres.length) { hadGenre++; continue; }
  const author = b.book_authors?.[0]?.author?.name || "";
  let items = [];
  try { const r = await fetch("https://simania.co.il/api/search?query=" + encodeURIComponent(b.title), { headers: { "User-Agent": UA, Accept: "application/json" } }); const d = await r.json(); items = d?.success ? (d.data?.books || []) : []; } catch {}
  await sleep(350);
  const bt = toks(b.title), bn = norm(b.title), at = toks(author);
  let best = null, sc = -1;
  for (const c of items) {
    const cn = norm(c.NAME); let ts = jac(bt, toks(c.NAME)); if (cn === bn) ts = 1; else if (cn && (cn.includes(bn) || bn.includes(cn))) ts = Math.max(ts, 0.7);
    const as = at.length && c.AUTHOR ? jac(at, toks(c.AUTHOR)) : null;
    // relaxed: category is coarse, so accept a decent title match or author agreement
    const ok = (as !== null && as >= 0.4 && ts >= 0.4) || ts >= 0.55;
    if (ok && ts * 2 + (as || 0) > sc) { sc = ts * 2 + (as || 0); best = c; }
  }
  const simName = best ? catName.get(best.categoryId) : null;
  const name = simName ? SIM_TO_SEED[simName] : null;
  if (!name) { nomatch++; if (done % 25 === 0) console.log(`... ${done}/${books.length} | שויכו:${assigned} ללא:${nomatch}`); continue; }
  const gid = await genreId(name);
  if (gid) { await sb.from("book_genres").upsert({ book_id: b.id, genre_id: gid }, { onConflict: "book_id,genre_id", ignoreDuplicates: true }); assigned++; }
  if (done % 25 === 0) console.log(`... ${done}/${books.length} | שויכו:${assigned} ללא:${nomatch}`);
}
console.log(`\n=== סיום: ${done} ספרים | שויך ז'אנר: ${assigned} | ללא התאמה: ${nomatch} | היה כבר: ${hadGenre} ===`);
const { data: gcount } = await sb.from("genres").select("name");
console.log("ז'אנרים שנוצרו:", (gcount || []).map((g) => g.name).join(", "));
