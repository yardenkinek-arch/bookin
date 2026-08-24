import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { markAllRead } from "./actions";
import Link from "next/link";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = notes ?? [];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader
        title="התראות 🔔"
        action={
          list.some((n) => !n.read) ? (
            <form action={markAllRead}>
              <button className="text-sm text-primary hover:underline">
                סמן הכל כנקרא
              </button>
            </form>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState icon="🔔" title="אין התראות" />
      ) : (
        <div className="space-y-2">
          {list.map((n) => {
            const Wrapper = n.link ? Link : "div";
            return (
              <Wrapper
                key={n.id}
                href={n.link ?? "#"}
                className={`card p-4 block ${
                  !n.read ? "border-r-4 border-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{n.title}</h3>
                  <span className="text-xs text-ink-soft shrink-0">
                    {new Date(n.created_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
                {n.body && (
                  <p className="text-sm text-ink-soft mt-0.5">{n.body}</p>
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
