import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportClient } from "./import-client";
import { listInboxAction } from "./actions";
import Link from "next/link";

export default async function ImportPage() {
  await requireAdmin();
  const inbox = await listInboxAction();
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
        subtitle="צלמי מדף או ערימת ספרים — קלוד יזהה ויוסיף אותם לספרייה"
      />
      <ImportClient initialInbox={inbox} />
    </div>
  );
}
