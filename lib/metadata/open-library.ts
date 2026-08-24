import type { BookMetadata, MetadataProvider } from "./types";

/**
 * Open Library provider. Free, no key. Good fallback / cross-check.
 * https://openlibrary.org/isbn/{isbn}.json
 */
export const openLibrary: MetadataProvider = {
  name: "open_library",

  async lookupByISBN(isbn) {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const b = await res.json();
    if (!b?.title) return null;

    // authors come as refs; resolve names best-effort (single round)
    let authors: string[] = [];
    if (Array.isArray(b.authors)) {
      authors = (
        await Promise.all(
          b.authors.slice(0, 3).map(async (a: { key?: string }) => {
            if (!a.key) return null;
            const r = await fetch(`https://openlibrary.org${a.key}.json`);
            if (!r.ok) return null;
            const j = await r.json();
            return j?.name ?? null;
          }),
        )
      ).filter((n): n is string => !!n);
    }

    const date: string | null = b.publish_date ?? null;
    const yearMatch = date?.match(/\d{4}/);
    const coverId = Array.isArray(b.covers) ? b.covers[0] : null;

    return {
      title: b.title,
      subtitle: b.subtitle ?? null,
      authors,
      isbn_13: Array.isArray(b.isbn_13) ? b.isbn_13[0] : null,
      isbn_10: Array.isArray(b.isbn_10) ? b.isbn_10[0] : isbn,
      publisher: Array.isArray(b.publishers) ? b.publishers[0] : null,
      published_year: yearMatch ? parseInt(yearMatch[0], 10) : null,
      published_date: null,
      language: Array.isArray(b.languages)
        ? b.languages[0]?.key?.replace("/languages/", "")
        : null,
      page_count: b.number_of_pages ?? null,
      description:
        typeof b.description === "string" ? b.description : b.description?.value ?? null,
      cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
      categories: [],
      source: "open_library",
      confidence: "high",
    };
  },

  async search(query) {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,first_publish_year,isbn,cover_i,language,number_of_pages_median`,
      { next: { revalidate: 60 * 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs ?? []).map(
      (d: {
        title: string;
        author_name?: string[];
        first_publish_year?: number;
        isbn?: string[];
        cover_i?: number;
        language?: string[];
        number_of_pages_median?: number;
      }): BookMetadata => ({
        title: d.title,
        authors: d.author_name ?? [],
        isbn_13: d.isbn?.find((i) => i.length === 13) ?? null,
        isbn_10: d.isbn?.find((i) => i.length === 10) ?? null,
        published_year: d.first_publish_year ?? null,
        language: d.language?.[0] ?? null,
        page_count: d.number_of_pages_median ?? null,
        cover_url: d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : null,
        source: "open_library",
        confidence: "medium",
      }),
    );
  },
};
