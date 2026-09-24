// Enrich books with cover (downloaded to Supabase Storage) + description + year
// from Simania (simania.co.il), the Israeli book database. Conservative matching.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const UA = "Mozilla/5.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[׳״'"״׳`.,:;!?()\[\]{}<>–—\-–—\/]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter((w) => w.length > 1);
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
const cleanDesc = (s) => (s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim().slice(0, 2500);

function coverPath(imageLink) {
  if (!imageLink) return null;
  const m = imageLink.match(/imageName=([^&]+)/);
  const path = m ? "/bookimages/" + decodeURIComponent(m[1]) : imageLink;
  return "https://simania.co.il" + (path.startsWith("/") ? path : "/" + path);
}

async function searchSimania(title) {
  const url = "https://simania.co.il/api/search?query=" + encodeURIComponent(title);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) return [];
    const d = await r.json();
    return d?.success ? (d.data?.books || []) : [];
  } catch { return []; }
}

// Pick best conservative match; returns candidate or null.
function pickMatch(book, ourAuthor, candidates) {
  const bt = toks(book.title), bn = norm(book.title);
  const at = toks(ourAuthor);
  let best = null, bestScore = -1;
  for (const c of candidates) {
    const cn = norm(c.NAME);
    let titleScore = jac(bt, toks(c.NAME));
    if (cn === bn) titleScore = 1;
    else if (cn && (cn.includes(bn) || bn.includes(cn))) titleScore = Math.max(titleScore, 0.75);
    let authorScore = null;
    if (at.length && c.AUTHOR) authorScore = jac(at, toks(c.AUTHOR));
    // Conservative acceptance (avoid attaching the wrong same-title book, §76):
    // - If both sides have an author, the authors MUST agree (>=0.4) — a strong
    //   title match alone is NOT enough (different books share titles).
    // - If we have no author, or the candidate has none, accept on a strong title.
    let accept;
    if (authorScore !== null) accept = titleScore >= 0.6 && authorScore >= 0.4;
    else accept = titleScore >= 0.85;
    if (!accept) continue;
    const combined = titleScore * 2 + (authorScore || 0);
    if (combined > bestScore) { bestScore = combined; best = c; }
  }
  return best;
}

async function downloadCover(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    // Validate real JPEG (FFD8) and not a tiny placeholder.
    if (buf.length < 3000 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    return buf;
  } catch { return null; }
}

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : null;
let q = sb
  .from("books")
  .select("id,title,cover_url,description,published_year,book_authors(author:authors(name))")
  .is("deleted_at", null)
  .order("created_at");
if (LIMIT) q = q.limit(LIMIT);
const { data: books } = await q;

let done = 0, covered = 0, described = 0, yeared = 0, matched = 0, noMatch = 0;
for (const b of books) {
  done++;
  const needCover = !b.cover_url, needDesc = !b.description, needYear = !b.published_year;
  if (!needCover && !needDesc && !needYear) continue;
  const ourAuthor = b.book_authors?.[0]?.author?.name || "";
  const cands = await searchSimania(b.title);
  await sleep(400);
  const m = cands.length ? pickMatch(b, ourAuthor, cands) : null;
  if (!m) { noMatch++; if (done % 25 === 0) console.log(`... ${done}/${books.length} | כריכות:${covered} תקצירים:${described} ללא התאמה:${noMatch}`); continue; }
  matched++;
  const upd = {};
  if (needCover && m.hasImage) {
    const url = coverPath(m.imageLink);
    if (url) {
      const buf = await downloadCover(url);
      if (buf) {
        const path = `${b.id}.jpg`;
        const { error } = await sb.storage.from("covers").upload(path, buf, { contentType: "image/jpeg", upsert: true });
        if (!error) { upd.cover_url = sb.storage.from("covers").getPublicUrl(path).data.publicUrl; covered++; }
      }
      await sleep(150);
    }
  }
  if (needDesc && m.DESCRIPTION && m.DESCRIPTION.trim().length > 20) { upd.description = cleanDesc(m.DESCRIPTION); described++; }
  if (needYear && Number.isFinite(+m.YEAR) && +m.YEAR > 1900 && +m.YEAR <= 2026) { upd.published_year = +m.YEAR; yeared++; }
  if (Object.keys(upd).length) {
    upd.metadata_updated_at = new Date().toISOString();
    await sb.from("books").update(upd).eq("id", b.id);
  }
  if (done % 25 === 0) console.log(`... ${done}/${books.length} | כריכות:${covered} תקצירים:${described} שנים:${yeared} התאמות:${matched} ללא:${noMatch}`);
}
console.log(`\n=== סיום ===`);
console.log(`עברתי: ${done} | התאמות בסימניה: ${matched} | ללא התאמה: ${noMatch}`);
console.log(`כריכות שנוספו: ${covered} | תקצירים: ${described} | שנים: ${yeared}`);
