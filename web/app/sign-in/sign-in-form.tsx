"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      return;
    }
    router.push("/account");
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Email
        <input
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Password
        <input
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground enabled:hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted"
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
