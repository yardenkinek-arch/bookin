import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, getSeriesOverview } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [stats, series, notif] = await Promise.all([
    getDashboardStats(),
    getSeriesOverview(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", admin.id)
      .eq("read", false),
  ]);

  const incompleteSeries = series.filter(
    (s) => !s.complete && s.ownedCount > 0,
  ).length;

  const cards = [
    { label: "ספרים בספרייה", value: stats.books, href: "/library", icon: "📚" },
    { label: "סדרות", value: stats.series, href: "/series", icon: "📖" },
    { label: "סדרות לא שלמות", value: incompleteSeries, href: "/series", icon: "🧩" },
    { label: "ברשימת קניות", value: stats.shopping, href: "/shopping", icon: "🛒" },
    { label: "טעוני עיון", value: stats.openFlags, href: "/review", icon: "⚠️", alert: stats.openFlags > 0 },
    { label: "התראות חדשות", value: notif.count ?? 0, href: "/notifications", icon: "🔔", alert: (notif.count ?? 0) > 0 },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">
          שלום {admin.display_name} 👋
        </h1>
        <p className="text-ink-soft text-sm mt-0.5">הנה תמונת מצב של הספרייה</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`card p-4 hover:shadow-md transition ${
              c.alert ? "border-primary/40 bg-primary-soft/30" : ""
            }`}
          >
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-3xl font-bold text-ink">{c.value}</div>
            <div className="text-sm text-ink-soft mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/books/new"
          className="rounded-lg bg-primary hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 transition"
        >
          + הוספת ספר
        </Link>
        <Link
          href="/search"
          className="rounded-lg bg-surface border border-line text-ink text-sm font-semibold px-4 py-2.5 hover:bg-surface-2 transition"
        >
          🔍 חיפוש
        </Link>
        <Link
          href="/users"
          className="rounded-lg bg-surface border border-line text-ink text-sm font-semibold px-4 py-2.5 hover:bg-surface-2 transition"
        >
          👨‍👩‍👧‍👧 משתמשים
        </Link>
      </div>
    </div>
  );
}
