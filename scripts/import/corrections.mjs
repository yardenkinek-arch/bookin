import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corrections = [
  { match: "אני מייקי", title: "אני מלכה?" },
  { match: "ג'ואי ואיה", title: "ג'ימי ומיה", authors: ["טרי ליבנסון"] },
  { match: "מי לפחד אליי", title: "מי מפחד מאושר", authors: ["מיכל אור"] },
  { match: "יד אחת", title: "יד אחות" },
  { match: "גרוויטי פולס: נבואות נסתרים", title: "גרוויטי פולס: כוחות נסתרים", authors: ["טרייסי וסט"] },
  { match: "פרסי ג'קסון: האולימפי האחרון", title: "פרסי ג'קסון: תקוות האולימפוס" },
  { match: "נס המלטונין", title: "נס המלאטונין", authors: ["ד\"ר וולטר פיירפאולי", "ד\"ר וויליאם רגלסון"] },
  { match: "אליפים", title: "אלופים" },
  { match: "יומן דרק פאלון: החיים שלי בקומיקס", title: "החיים שלי בקומיקס", authors: ["ג'נט טשג'יאן"], clearSeries: true },
  { match: "יומן דרק פאלון: החיים שלי בסרט", title: "החיים שלי בסרט", authors: ["ג'נט טשג'יאן"], clearSeries: true },
  { match: "יומן דרק פאלון: החיים שלי בספר", title: "החיים שלי בספר", authors: ["ג'נט טשג'יאן"], clearSeries: true },
];

async function upsertAuthor(name) {
  const { data: e } = await sb.from("authors").select("id").ilike("name", name).is("deleted_at", null).maybeSingle();
  if (e) return e.id;
  const { data: c } = await sb.from("authors").insert({ name }).select("id").single();
  return c?.id;
}

for (const c of corrections) {
  const { data: book } = await sb.from("books").select("id,title").ilike("title", c.match).is("deleted_at", null).maybeSingle();
  if (!book) { console.log("⚠️ לא נמצא:", c.match); continue; }
  const upd = {};
  if (c.title) upd.title = c.title;
  if (c.clearSeries) upd.series_id = null;
  if (Object.keys(upd).length) await sb.from("books").update(upd).eq("id", book.id);
  if (c.authors) {
    await sb.from("book_authors").delete().eq("book_id", book.id);
    for (let i = 0; i < c.authors.length; i++) {
      const aid = await upsertAuthor(c.authors[i]);
      if (aid) await sb.from("book_authors").insert({ book_id: book.id, author_id: aid, position: i });
    }
  }
  console.log(`✅ תוקן: "${c.match}" → "${c.title || book.title}"${c.authors ? " | " + c.authors.join(", ") : ""}`);
}
console.log("=== סיום תיקונים ===");
