import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportClient } from "./import-client";
import Link from "next/link";

export default async function ImportPage() {
  await requireAdmin();
  const configured = !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link
        href="/library"
        className="text-sm text-ink-soft hover:text-ink inline-block mb-4"
      >
        ← חזרה לספרייה
      </Link>
      <PageHeader
        title="הוספת ספרים מצילום"
        subtitle="צלמי מדף או ערימת ספרים — והמערכת תזהה ותוסיף אותם אוטומטית"
      />
      {!configured && (
        <div className="card p-4 mb-4 bg-primary-soft border border-line">
          <p className="text-sm text-ink">
            ⚙️ שירות זיהוי התמונות עדיין לא הופעל. כדי להפעילו יש להוסיף מפתח{" "}
            <code dir="ltr">ANTHROPIC_API_KEY</code> בהגדרות. אחרי ההגדרה הפיצ׳ר יעבוד מיד.
          </p>
        </div>
      )}
      <ImportClient />
    </div>
  );
}
