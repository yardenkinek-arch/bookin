import { createClient } from "@/lib/supabase/server";
import type {
  Book,
  ReadingStatus,
  Series,
} from "@/types/database";

export interface BookListItem extends Book {
  authors: { id: string; name: string }[];
  series: Pick<Series, "id" | "name" | "total_books"> | null;
  myStatus: ReadingStatus | null;
  myRating: number | null;
  isFavorite: boolean;
}

/** Base select with authors + series joined. */
const BOOK_SELECT = `
  *,
  book_authors ( position, author:authors ( id, name ) ),
  series:series ( id, name, total_books )
`;

type RawBook = Book & {
  book_authors: { position: number; author: { id: string; name: string } }[];
  series: Pick<Series, "id" | "name" | "total_books"> | null;
};

/** Attach the current user's personal status/rating/favorite to a set of books. */
async function decorateWithPersonal(
  rawBooks: RawBook[],
  userId: string,
): Promise<BookListItem[]> {
  const supabase = await createClient();
  const ids = rawBooks.map((b) => b.id);
  if (ids.length === 0) return [];

  const [statuses, ratings, favorites] = await Promise.all([
    supabase
      .from("user_book_status")
      .select("book_id, status")
      .eq("user_id", userId)
      .in("book_id", ids),
    supabase
      .from("user_book_ratings")
      .select("book_id, rating")
      .eq("user_id", userId)
      .in("book_id", ids),
    supabase
      .from("favorites")
      .select("book_id")
      .eq("user_id", userId)
      .in("book_id", ids),
  ]);

  const statusMap = new Map(
    (statuses.data ?? []).map((r) => [r.book_id, r.status]),
  );
  const ratingMap = new Map(
    (ratings.data ?? []).map((r) => [r.book_id, r.rating]),
  );
  const favSet = new Set((favorites.data ?? []).map((r) => r.book_id));

  return rawBooks.map((b) => ({
    ...b,
    authors: (b.book_authors ?? [])
      .sort((a, z) => a.position - z.position)
      .map((ba) => ba.author),
    series: b.series,
    myStatus: statusMap.get(b.id) ?? null,
    myRating: ratingMap.get(b.id) ?? null,
    isFavorite: favSet.has(b.id),
  }));
}

export interface LibraryFilters {
  search?: string;
  genreId?: string;
  seriesId?: string;
  authorId?: string;
  status?: ReadingStatus;
  favoritesOnly?: boolean;
  sort?: "title" | "recent" | "year" | "rating";
}

/** The main library list. */
export async function getLibraryBooks(
  userId: string,
  filters: LibraryFilters = {},
): Promise<BookListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("books")
    .select(BOOK_SELECT)
    .is("deleted_at", null);

  if (filters.search) {
    const q = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${q},title_original.ilike.${q},subtitle.ilike.${q}`,
    );
  }
  if (filters.seriesId) query = query.eq("series_id", filters.seriesId);

  switch (filters.sort) {
    case "year":
      query = query.order("published_year", { ascending: false, nullsFirst: false });
      break;
    case "recent":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("title", { ascending: true });
  }

  const { data, error } = await query.limit(2000);
  if (error) throw error;

  let books = await decorateWithPersonal(
    (data ?? []) as unknown as RawBook[],
    userId,
  );

  // JS-side filters that depend on joins / personal data
  if (filters.authorId) {
    books = books.filter((b) => b.authors.some((a) => a.id === filters.authorId));
  }
  if (filters.status) {
    books = books.filter((b) => (b.myStatus ?? "unread") === filters.status);
  }
  if (filters.favoritesOnly) {
    books = books.filter((b) => b.isFavorite);
  }
  return books;
}

/** A single book with everything needed for the detail page. */
export async function getBookDetail(bookId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      `${BOOK_SELECT}, book_genres ( genre:genres ( id, name ) )`,
    )
    .eq("id", bookId)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;

  const [decorated] = await decorateWithPersonal(
    [data as unknown as RawBook],
    userId,
  );

  // Personal note + tags for current user
  const [note, tags, familyStatuses, profiles] = await Promise.all([
    supabase
      .from("user_notes")
      .select("id, body")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle(),
    supabase
      .from("user_book_tags")
      .select("id, tag")
      .eq("user_id", userId)
      .eq("book_id", bookId),
    supabase
      .from("user_book_status")
      .select("user_id, status")
      .eq("book_id", bookId),
    supabase.from("profiles").select("id, display_name, role"),
  ]);

  const genres =
    (
      data as unknown as RawBook & {
        book_genres?: { genre: { id: string; name: string } }[];
      }
    ).book_genres?.map((g) => g.genre) ?? [];

  return {
    book: decorated,
    genres,
    myNote: note.data ?? null,
    myTags: tags.data ?? [],
    // familyStatuses is RLS-limited: members only see their own row; admin sees all
    familyStatuses: familyStatuses.data ?? [],
    profiles: profiles.data ?? [],
  };
}

export interface SeriesOverview {
  id: string;
  name: string;
  total_books: number | null;
  ownedPositions: number[]; // positions we have
  ownedCount: number;
  missingPositions: number[]; // positions we lack (when total known)
  complete: boolean;
}

/** All series with owned/total progress and which positions are missing. */
export async function getSeriesOverview(): Promise<SeriesOverview[]> {
  const supabase = await createClient();
  const [seriesRes, booksRes] = await Promise.all([
    supabase.from("series").select("id, name, total_books").is("deleted_at", null),
    supabase
      .from("books")
      .select("series_id, series_position")
      .not("series_id", "is", null)
      .is("deleted_at", null),
  ]);

  const books = booksRes.data ?? [];
  return (seriesRes.data ?? [])
    .map((s): SeriesOverview => {
      const owned = books
        .filter((b) => b.series_id === s.id && b.series_position != null)
        .map((b) => Number(b.series_position));
      const ownedSet = new Set(owned.map((n) => Math.floor(n)));
      const ownedCount = books.filter((b) => b.series_id === s.id).length;

      let missing: number[] = [];
      if (s.total_books) {
        for (let i = 1; i <= s.total_books; i++) {
          if (!ownedSet.has(i)) missing.push(i);
        }
      }
      return {
        id: s.id,
        name: s.name,
        total_books: s.total_books,
        ownedPositions: [...ownedSet].sort((a, b) => a - b),
        ownedCount,
        missingPositions: missing,
        complete: s.total_books != null && missing.length === 0 && ownedCount > 0,
      };
    })
    .sort((a, b) => b.ownedCount - a.ownedCount);
}

/** Books belonging to a single series, ordered by position. */
export async function getSeriesBooks(seriesId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("series_id", seriesId)
    .is("deleted_at", null)
    .order("series_position", { ascending: true, nullsFirst: false });
  return decorateWithPersonal((data ?? []) as unknown as RawBook[], userId);
}

/** Dashboard counters for admin. */
export async function getDashboardStats() {
  const supabase = await createClient();
  const [books, series, shopping, flags] = await Promise.all([
    supabase.from("books").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("series").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("shopping_list").select("id", { count: "exact", head: true }).eq("purchased", false),
    supabase.from("review_flags").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return {
    books: books.count ?? 0,
    series: series.count ?? 0,
    shopping: shopping.count ?? 0,
    openFlags: flags.count ?? 0,
  };
}
