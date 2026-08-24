import { requireAdmin } from "@/lib/auth";
import { NewBookForm } from "./new-book-form";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

export default async function NewBookPage() {
  await requireAdmin();
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
      <NewBookForm />
    </div>
  );
}
