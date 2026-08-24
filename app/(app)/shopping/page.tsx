import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { AddShoppingForm, ShoppingItemRow } from "./shopping-client";

export default async function ShoppingPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("shopping_list")
    .select(
      "id, title, author_name, isbn, priority, note, purchased, created_at, added_by:profiles!shopping_list_added_by_fkey ( display_name )",
    )
    .order("purchased", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (items ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    author_name: string | null;
    priority: "low" | "normal" | "high";
    note: string | null;
    purchased: boolean;
    added_by: { display_name: string } | null;
  }>;
  const active = list.filter((i) => !i.purchased);
  const purchased = list.filter((i) => i.purchased);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <PageHeader title="רוצים לקנות 🛒" subtitle={`${active.length} ספרים`} />

      <AddShoppingForm />

      <div className="mt-6 space-y-2">
        {active.length === 0 && (
          <p className="text-center text-ink-soft py-8">
            הרשימה ריקה. אפשר להוסיף ספר למעלה.
          </p>
        )}
        {active.map((item) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            isAdmin={profile.role === "admin"}
          />
        ))}
      </div>

      {purchased.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-ink-soft mb-2">נקנו ✓</h2>
          <div className="space-y-2 opacity-60">
            {purchased.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                isAdmin={profile.role === "admin"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
