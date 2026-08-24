import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) redirect("/");

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-2xl font-bold text-ink">הספרייה המשפחתית</h1>
          <p className="text-ink-soft mt-1 text-sm">
            כל הספרים שלנו, במקום אחד
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
