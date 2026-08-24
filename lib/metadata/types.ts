import type { ConfidenceLevel, MetadataSource } from "@/types/database";

/** Normalized book metadata returned by any provider. */
export interface BookMetadata {
  title: string;
  title_original?: string | null;
  subtitle?: string | null;
  authors: string[];
  isbn_10?: string | null;
  isbn_13?: string | null;
  publisher?: string | null;
  published_year?: number | null;
  published_date?: string | null;
  language?: string | null;
  page_count?: number | null;
  description?: string | null;
  cover_url?: string | null;
  categories?: string[];
  series_name?: string | null;
  series_position?: number | null;
  source: MetadataSource;
  confidence: ConfidenceLevel;
}

export interface MetadataProvider {
  name: MetadataSource;
  lookupByISBN(isbn: string): Promise<BookMetadata | null>;
  search(query: string): Promise<BookMetadata[]>;
}
