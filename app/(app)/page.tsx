import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const profile = await requireProfile();
  redirect(profile.role === "admin" ? "/dashboard" : "/library");
}
