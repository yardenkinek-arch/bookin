import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { FlagStatusControl } from "./review-client";
import Link from "next/link";

export default async function ReviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: flags } = await supabase
    .from("review_flags")
    .select(
      `id, page, status, created_at,
       book:books ( id, title, cover_url ),
       reporter:profiles!review_flags_reported_by_fkey ( display_name ),
       review_notes ( body )`,
    )
    .order("created_at", { ascending: false });

  const list = flags ?? [];
  const open = list.filter((f) => f.status === "new" || f.status === "in_review");
  const closed = list.filter((f) => f.status !== "new" && f.status !== "in_review");

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="⚠️ ספרים טעוני עיון"
        subtitle="מידע פרטי — גלוי למנהלת בלבד"
      />

      {list.length === 0 ? (
        <EmptyState icon="✅" title="אין דיווחים פתוחים" hint="הכל תקין כרגע." />
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {open.map((f) => (
              <FlagCard key={f.id} flag={f} />
            ))}
            {open.length === 0 && (
              <p className="text-ink-soft text-sm">אין דיווחים פתוחים.</p>
            )}
          </div>

          {closed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-soft mb-2">היסטוריה</h2>
              <div className="space-y-3 opacity-70">
                {closed.map((f) => (
                  <FlagCard key={f.id} flag={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function FlagCard({ flag }: { flag: any }) {
  return (
    <div className="card p-4 border-warn/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/books/${flag.book?.id}`}
            className="font-semibold text-ink hover:text-primary transition"
          >
            {flag.book?.title ?? "ספר"}
          </Link>
          <p className="text-xs text-ink-soft mt-0.5">
            דווח ע"י {flag.reporter?.display_name ?? "לא ידוע"}
            {flag.page ? ` · עמוד ${flag.page}` : ""} ·{" "}
            {new Date(flag.created_at).toLocaleDateString("he-IL")}
          </p>
        </div>
      </div>
      {flag.review_notes?.map((n: { body: string }, i: number) => (
        <p key={i} className="mt-2 text-sm text-ink bg-surface-2 rounded-lg px-3 py-2">
          {n.body}
        </p>
      ))}
      <div className="mt-3">
        <FlagStatusControl flagId={flag.id} status={flag.status} />
      </div>
    </div>
  );
}
