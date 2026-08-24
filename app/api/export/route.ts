import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** CSV export of the library. Admin only. */
export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: books } = await supabase
    .from("books")
    .select(
      `title, title_original, isbn_13, isbn_10, publisher, published_year,
       page_count, language, series:series(name), series_position,
       book_authors ( author:authors ( name ) )`,
    )
    .is("deleted_at", null)
    .order("title");

  const headers = [
    "title",
    "title_original",
    "authors",
    "series",
    "series_position",
    "isbn_13",
    "isbn_10",
    "publisher",
    "published_year",
    "page_count",
    "language",
  ];

  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (books ?? []).map((b: any) => {
    const authors = (b.book_authors ?? [])
      .map((ba: any) => ba.author?.name)
      .filter(Boolean)
      .join("; ");
    return [
      b.title,
      b.title_original,
      authors,
      b.series?.name,
      b.series_position,
      b.isbn_13,
      b.isbn_10,
      b.publisher,
      b.published_year,
      b.page_count,
      b.language,
    ]
      .map(esc)
      .join(",");
  });

  // BOM so Excel opens Hebrew correctly
  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="library-export.csv"`,
    },
  });
}
