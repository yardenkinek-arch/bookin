import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const fixes = [
  { match: "כראמל 3: סכנה בביצה", title: "כראמל 7: סכנה בביצה", pos: 7 },
  { match: "ואגה ג'ין: וסודות היער", title: "וגה ג'יין: וסודות הכישוף" },
  { match: "ואגה ג'ין: ומבוך המפלצות", title: "וגה ג'יין: ומבוך המפלצות" },
  { match: "שרשרת הברכות", title: "אותיות במיץ שטויות" },
  { match: "הרעשנים 1", title: "הרעשנים 1: יוצאים משליטה" },
  { match: "הרעשנים 6: מסיבה במיוחד", title: "הרעשנים 6: מסיבה רועשת במיוחד" },
  { match: "לכל פאים והרוחות", title: "לכל השדים והרוחות" },
];
for (const f of fixes) {
  const { data: b } = await sb.from("books").select("id").ilike("title", f.match).is("deleted_at", null).maybeSingle();
  if (!b) { console.log("⚠️ לא נמצא:", f.match); continue; }
  const upd = { title: f.title };
  if (f.pos !== undefined) upd.series_position = f.pos;
  await sb.from("books").update(upd).eq("id", b.id);
  console.log(`✅ תוקן: "${f.match}" → "${f.title}"`);
}

// add כראמל 3: נער החידות
async function upsertSeries(name){const {data:e}=await sb.from("series").select("id").ilike("name",name).is("deleted_at",null).maybeSingle();if(e)return e.id;const {data:c}=await sb.from("series").insert({name,confidence:"high"}).select("id").single();return c?.id;}
async function upsertAuthor(name){const {data:e}=await sb.from("authors").select("id").ilike("name",name).is("deleted_at",null).maybeSingle();if(e)return e.id;const {data:c}=await sb.from("authors").insert({name}).select("id").single();return c?.id;}
const { data: exists } = await sb.from("books").select("id").ilike("title", "כראמל 3: נער החידות").is("deleted_at", null).maybeSingle();
if (!exists) {
  const sid = await upsertSeries("כראמל");
  const { data: nb } = await sb.from("books").insert({ title: "כראמל 3: נער החידות", series_id: sid, series_position: 3, source: "manual", source_confidence: "high" }).select("id").single();
  const aid = await upsertAuthor("מאירה ברנע-גולדברג");
  if (aid && nb) await sb.from("book_authors").insert({ book_id: nb.id, author_id: aid, position: 0 });
  console.log("✅ נוסף: כראמל 3: נער החידות — מאירה ברנע-גולדברג");
}
const { count } = await sb.from("books").select("id", { count: "exact", head: true }).is("deleted_at", null);
console.log("=== סה\"כ ספרים:", count, "===");
