import type { BookMetadata, MetadataProvider } from "./types";

/**
 * Google Books provider. Free, no API key required for basic use.
 * https://www.googleapis.com/books/v1/volumes
 */

interface GVolume {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function mapVolume(v: GVolume): BookMetadata | null {
  const info = v.volumeInfo;
  if (!info?.title) return null;

  const ids = info.industryIdentifiers ?? [];
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier ?? null;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier ?? null;

  const date = info.publishedDate ?? null;
  const year = date ? parseInt(date.slice(0, 4), 10) : null;

  // Prefer https and a larger cover
  const cover =
    info.imageLinks?.thumbnail?.replace("http://", "https://").replace("&edge=curl", "") ??
    null;

  return {
    title: info.title,
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    isbn_13: isbn13,
    isbn_10: isbn10,
    publisher: info.publisher ?? null,
    published_year: Number.isFinite(year) ? year : null,
    published_date: date && date.length === 10 ? date : null,
    language: info.language ?? null,
    page_count: info.pageCount ?? null,
    description: info.description ?? null,
    cover_url: cover,
    categories: info.categories ?? [],
    source: "google_books",
    confidence: "medium",
  };
}

export const googleBooks: MetadataProvider = {
  name: "google_books",

  async lookupByISBN(isbn) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
      isbn,
    )}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0] as GVolume | undefined;
    if (!item) return null;
    const meta = mapVolume(item);
    // ISBN lookups are a strong signal
    if (meta) meta.confidence = "high";
    return meta;
  },

  async search(query) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query,
    )}&maxResults=10`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.items ?? []) as GVolume[];
    return items.map(mapVolume).filter((x): x is BookMetadata => x !== null);
  },
};
