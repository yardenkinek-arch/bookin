import { createServiceClient } from "@/lib/supabase/server";

/**
 * Send a notification to every admin. Uses the service-role client so it can
 * write rows the sender wouldn't otherwise be allowed to create.
 */
export async function notifyAdmins(n: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const svc = createServiceClient();
  const { data: admins } = await svc
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (!admins?.length) return;

  await svc.from("notifications").insert(
    admins.map((a: { id: string }) => ({
      user_id: a.id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  );
}
