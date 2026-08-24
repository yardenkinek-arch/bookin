import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

export default async function UsersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [profilesRes, statusRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role"),
    supabase
      .from("user_book_status")
      .select("user_id, status")
      .in("status", ["read", "reread"]),
  ]);

  const counts = new Map<string, number>();
  for (const s of statusRes.data ?? []) {
    counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1);
  }

  const users = (profilesRes.data ?? []).sort(
    (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader
        title="המשפחה 👨‍👩‍👧‍👧"
        subtitle="כמה ספרים כל אחד קרא"
      />
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card p-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-white font-bold">
              {u.display_name.charAt(0)}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-ink">{u.display_name}</p>
              <p className="text-xs text-ink-soft">
                {u.role === "admin" ? "מנהלת" : "בן/בת משפחה"}
              </p>
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold text-primary">
                {counts.get(u.id) ?? 0}
              </span>
              <span className="text-xs text-ink-soft block">ספרים</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
