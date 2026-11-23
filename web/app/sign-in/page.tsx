import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Sign in</h1>
        <p className="text-base text-muted-foreground">
          Use the email and password for your agent workspace.
        </p>
      </header>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-e1">
        <SignInForm />
      </section>
      <Link className="text-sm text-primary" href="/sign-up">
        Create an account
      </Link>
    </main>
  );
}
