import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [read, favorites, ratings] = await Promise.all([
    supabase
      .from("user_book_status")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .in("status", ["read", "reread"]),
    supabase
      .from("favorites")
      .select("book_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("user_book_ratings")
      .select("book_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <PageHeader title="הפרופיל שלי" />

      <div className="card p-5 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white text-2xl font-bold">
          {profile.display_name.charAt(0)}
        </span>
        <div>
          <h2 className="text-xl font-bold text-ink">{profile.display_name}</h2>
          <p className="text-ink-soft text-sm">
            {profile.role === "admin" ? "מנהלת המערכת" : "בן/בת משפחה"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat label="ספרים שקראתי" value={read.count ?? 0} />
        <Stat label="מועדפים" value={favorites.count ?? 0} />
        <Stat label="דירגתי" value={ratings.count ?? 0} />
      </div>

      {profile.role === "admin" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/users"
            className="rounded-lg bg-surface border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2 transition"
          >
            👨‍👩‍👧‍👧 ניהול משתמשים
          </Link>
          <a
            href="/api/export"
            className="rounded-lg bg-surface border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2 transition"
          >
            ⬇️ ייצוא הספרייה (CSV)
          </a>
        </div>
      )}

      <form action={signOut} className="mt-6">
        <button className="w-full rounded-lg border border-line py-2.5 text-sm font-medium text-danger hover:bg-primary-soft transition">
          התנתקות
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-soft mt-0.5">{label}</div>
    </div>
  );
}
