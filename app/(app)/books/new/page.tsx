import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewBookForm } from "./new-book-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

export default async function NewBookPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: genres } = await supabase.from("genres").select("id, name").order("name");
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link
        href="/library"
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← חזרה לספרייה
      </Link>
      <PageHeader
        title="הוספת ספר"
        subtitle="חפשי לפי ISBN למילוי אוטומטי, או מלאי ידנית"
      />
      <NewBookForm genres={genres ?? []} />
    </div>
  );
}
