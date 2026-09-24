import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
const DIR = "C:/Users/yarde/AppData/Local/Temp/claude/G-------------------------------------------------------------------------2026/65c07a1a-6839-4612-a19e-5664e351096e/scratchpad/";
const env = Object.fromEntries(readFileSync("C:/Users/yarde/family-library/.env.local", "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const norm = (s) => (s || "").replace(/[\u0591-\u05C7]/g, "").replace(/[\u05F3\u05F4'"״׳`.,:!?()\[\]{}<>–—\-\u2013\u2014]/g, " ").replace(/\s+/g, " ").trim();
const toks = (s) => norm(s).split(" ").filter((w) => w.length > 1);
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

const { data: books } = await sb.from("books").select("title,book_authors(author:authors(name))").is("deleted_at", null);
const app = books.map((b) => ({ title: b.title, author: (b.book_authors[0]?.author?.name) || "", n: norm(b.title), t: toks(b.title) }));
const appExact = new Set(app.map((b) => b.n));

// her list
const lines = readFileSync(DIR + "her_list.txt", "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const her = []; const seen = new Set();
for (const line of lines) { const i = line.lastIndexOf(" - "); const title = i > 0 ? line.slice(0, i).trim() : line; const author = i > 0 ? line.slice(i + 3).trim() : ""; if (seen.has(norm(title))) continue; seen.add(norm(title)); her.push({ title, author }); }

// what I ADDED this round
const added = JSON.parse(readFileSync("C:/Users/yarde/family-library/scripts/import/add_from_list.json", "utf8")).map((b) => b.title);
added.push("מי מפחד מאושר");
const addedNorm = new Set(added.map(norm));

// categorize her list
const notAdded = []; // already in app (dup)
for (const h of her) {
  if (addedNorm.has(norm(h.title))) continue; // I added it
  // find app match
  if (appExact.has(norm(h.title))) { notAdded.push({ her: h.title + " — " + h.author, app: h.title }); continue; }
  let best = null, sc = 0;
  for (const b of app) { let s = jac(toks(h.title), b.t); if (b.n.includes(norm(h.title)) || norm(h.title).includes(b.n)) s = Math.max(s, 0.85); if (s > sc) { sc = s; best = b; } }
  if (sc >= 0.5) notAdded.push({ her: h.title + " — " + h.author, app: best.title + (best.author ? " — " + best.author : "") });
  else notAdded.push({ her: h.title + " — " + h.author, app: "(לא נמצאה התאמה ברורה)" });
}

// app books NOT in her list
const herNorms = her.map((h) => norm(h.title));
const herTokens = her.map((h) => toks(h.title));
const appNotInList = [];
for (const b of app) {
  if (herNorms.includes(b.n)) continue;
  let match = false;
  for (let i = 0; i < her.length; i++) { let s = jac(b.t, herTokens[i]); if (b.n.includes(herNorms[i]) || herNorms[i].includes(b.n)) s = 0.85; if (s >= 0.6) { match = true; break; } }
  if (!match) appNotInList.push(b.title + (b.author ? " — " + b.author : ""));
}

writeFileSync(DIR + "L1_added.txt", "ספרים שהוספתי לאפליקציה מהרשימה (" + added.length + "):\n\n" + added.map((t, i) => (i + 1) + ". " + t).join("\n"), "utf8");
writeFileSync(DIR + "L2_not_added.txt", "ספרים שלא הוספתי כי כבר קיימים באפליקציה (" + notAdded.length + "):\n\n" + notAdded.map((x, i) => (i + 1) + ". " + x.her + "   →   קיים כ: " + x.app).join("\n"), "utf8");
writeFileSync(DIR + "L3_app_not_in_list.txt", "ספרים שכבר באפליקציה אך לא היו ברשימה ששלחת (" + appNotInList.length + "):\n\n" + appNotInList.sort().map((t, i) => (i + 1) + ". " + t).join("\n"), "utf8");

console.log("L1 הוספתי:", added.length);
console.log("L2 לא הוספתי (כפילויות):", notAdded.length);
console.log("L3 באפליקציה ולא ברשימה:", appNotInList.length);
