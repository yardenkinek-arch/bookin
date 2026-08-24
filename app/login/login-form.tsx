"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="card p-6 shadow-sm">
      <div className="flex rounded-lg bg-surface-2 p-1 mb-5 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("in")}
          className={`flex-1 rounded-md py-2 transition ${
            mode === "in" ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
          }`}
        >
          כניסה
        </button>
        <button
          type="button"
          onClick={() => setMode("up")}
          className={`flex-1 rounded-md py-2 transition ${
            mode === "up" ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
          }`}
        >
          חשבון חדש
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "up" && (
          <Field
            label="השם שלך"
            name="display_name"
            type="text"
            placeholder="למשל: הלליה"
            autoComplete="name"
          />
        )}
        <Field
          label="אימייל"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          dir="ltr"
        />
        <Field
          label="סיסמה"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
          dir="ltr"
        />

        {state?.error && (
          <p className="text-sm text-danger bg-primary-soft rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary hover:bg-primary-600 text-white font-semibold py-2.5 transition disabled:opacity-60"
        >
          {pending
            ? "רגע..."
            : mode === "in"
              ? "כניסה לספרייה"
              : "יצירת חשבון"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft transition"
      />
    </label>
  );
}
