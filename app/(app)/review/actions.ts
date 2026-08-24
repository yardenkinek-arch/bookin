"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ReviewStatus } from "@/types/database";

export async function setFlagStatus(flagId: string, status: ReviewStatus) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const resolved = status === "resolved" || status === "approved" || status === "not_problematic";
  await supabase
    .from("review_flags")
    .update({
      status,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? admin.id : null,
    })
    .eq("id", flagId);

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "flag.status",
    entity: "review_flag",
    entity_id: flagId,
    details: { status },
  });

  revalidatePath("/review");
}
