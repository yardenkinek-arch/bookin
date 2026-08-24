import { requireProfile } from "@/lib/auth";
import { getSeriesOverview } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import Link from "next/link";

export default async function SeriesPage() {
  await requireProfile();
  const series = await getSeriesOverview();

  const inProgress = series.filter((s) => !s.complete && s.ownedCount > 0);
  const completed = series.filter((s) => s.complete);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader title="הסדרות שלנו" subtitle={`${series.length} סדרות`} />

      {series.length === 0 ? (
        <EmptyState icon="📖" title="אין עדיין סדרות" hint="סדרות מזוהות אוטומטית מפרטי הספרים." />
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-soft mb-2">באמצע / חסרים ספרים</h2>
              <div className="space-y-2">
                {inProgress.map((s) => (
                  <SeriesRow key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-soft mb-2">הושלמו ✓</h2>
              <div className="space-y-2">
                {completed.map((s) => (
                  <SeriesRow key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeriesRow({
  s,
}: {
  s: Awaited<ReturnType<typeof getSeriesOverview>>[number];
}) {
  const total = s.total_books ?? s.ownedCount;
  const pct = total ? Math.round((s.ownedCount / total) * 100) : 0;
  return (
    <Link
      href={`/series/${s.id}`}
      className="card p-4 flex items-center gap-4 hover:shadow-md transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-ink truncate">{s.name}</h3>
          <span className="text-sm text-ink-soft shrink-0">
            {s.ownedCount}
            {s.total_books ? `/${s.total_books}` : ""}
            {s.complete && " ✓"}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${s.complete ? "bg-success" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {s.missingPositions.length > 0 && (
          <p className="text-xs text-ink-soft mt-1.5">
            חסרים: {s.missingPositions.map((n) => `#${n}`).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}
