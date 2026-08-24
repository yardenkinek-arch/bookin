import type { BookMetadata, MetadataProvider } from "./types";
import { googleBooks } from "./google-books";
import { openLibrary } from "./open-library";

export type { BookMetadata } from "./types";

/**
 * Book Metadata Service — a swappable aggregation layer (spec §50).
 *
 * Principles:
 *   - Never invent data. If no provider returns a confident match, we say so.
 *   - Providers are ordered; the first confident hit wins, and we merge in
 *     missing fields from the second (e.g. a cover) without overwriting.
 *   - The caller always gets `source` + `confidence` for provenance (§51).
 */
const PROVIDERS: MetadataProvider[] = [googleBooks, openLibrary];

/** Fill empty fields of `base` from `extra` without overwriting existing ones. */
function mergeFill(base: BookMetadata, extra: BookMetadata): BookMetadata {
  const out: BookMetadata = { ...base };
  for (const key of Object.keys(extra) as (keyof BookMetadata)[]) {
    const current = out[key];
    const incoming = extra[key];
    const isEmpty =
      current === null ||
      current === undefined ||
      (Array.isArray(current) && current.length === 0);
    if (isEmpty && incoming != null) {
      // @ts-expect-error index assignment across union
      out[key] = incoming;
    }
  }
  return out;
}

export interface LookupResult {
  status: "found" | "not_found";
  book?: BookMetadata;
}

/** Look up a single book by ISBN across providers. */
export async function lookupByISBN(isbnRaw: string): Promise<LookupResult> {
  const isbn = isbnRaw.replace(/[^0-9Xx]/g, "");
  if (isbn.length !== 10 && isbn.length !== 13) {
    return { status: "not_found" };
  }

  const results = await Promise.allSettled(
    PROVIDERS.map((p) => p.lookupByISBN(isbn)),
  );

  const hits = results
    .filter(
      (r): r is PromiseFulfilledResult<BookMetadata> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value);

  if (hits.length === 0) return { status: "not_found" };

  // Merge secondary hits into the primary to backfill missing fields.
  let merged = hits[0];
  for (let i = 1; i < hits.length; i++) merged = mergeFill(merged, hits[i]);

  return { status: "found", book: merged };
}

/** Free-text / title-author search. Returns ranked candidates. */
export async function searchBooks(query: string): Promise<BookMetadata[]> {
  const q = query.trim();
  if (!q) return [];

  const results = await Promise.allSettled(PROVIDERS.map((p) => p.search(q)));
  const all = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );

  // De-duplicate by isbn13 || title+firstAuthor
  const seen = new Map<string, BookMetadata>();
  for (const b of all) {
    const key =
      b.isbn_13 ?? `${b.title}::${b.authors[0] ?? ""}`.toLowerCase();
    if (!seen.has(key)) seen.set(key, b);
  }
  return [...seen.values()].slice(0, 20);
}
