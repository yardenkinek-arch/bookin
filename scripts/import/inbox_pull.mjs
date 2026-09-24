// Download all photos waiting in the app's import inbox to a local folder,
// so Claude can read them, identify the books, and import them.
// Usage: node scripts/import/inbox_pull.mjs [targetDir]
//        node scripts/import/inbox_pull.mjs --clear   (delete the inbox after import)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "import-inbox";

async function listAll() {
  const out = [];
  const { data: folders } = await sb.storage.from(BUCKET).list("", { limit: 200 });
  for (const folder of folders ?? []) {
    if (folder.id !== null) continue;
    const { data: files } = await sb.storage.from(BUCKET).list(folder.name, { limit: 1000 });
    for (const f of files ?? []) out.push(`${folder.name}/${f.name}`);
  }
  return out;
}

if (process.argv.includes("--clear")) {
  const names = await listAll();
  if (names.length) await sb.storage.from(BUCKET).remove(names);
  console.log("cleared", names.length, "images from inbox");
  process.exit(0);
}

const target = (process.argv[2] && !process.argv[2].startsWith("--")) ? process.argv[2] : new URL("./_inbox/", import.meta.url).pathname.replace(/^\//, "");
mkdirSync(target, { recursive: true });
const names = await listAll();
if (!names.length) { console.log("inbox empty"); process.exit(0); }
const manifest = [];
let n = 0;
for (const name of names) {
  const { data, error } = await sb.storage.from(BUCKET).download(name);
  if (error || !data) { console.log("skip", name, error?.message); continue; }
  const buf = Buffer.from(await data.arrayBuffer());
  const local = `${target}/${String(++n).padStart(2, "0")}.jpg`;
  writeFileSync(local, buf);
  manifest.push({ inbox: name, local });
  console.log(local);
}
writeFileSync(`${target}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`\n${n} images -> ${target}`);
console.log("manifest:", `${target}/manifest.json`);
