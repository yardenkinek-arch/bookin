import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Returns the signed-in user's profile, or null.
 * Wrapped in React cache() so the layout + page (same request) share a single
 * auth check + profile fetch instead of hitting Supabase twice per render.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ?? null;
});

/** Like getProfile but redirects to /login when signed out. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Redirects to the library if the current user is not an admin. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}
