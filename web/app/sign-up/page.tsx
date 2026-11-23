import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Create an account</h1>
        <p className="text-base text-muted-foreground">
          Email and password sign-up for the agent workspace.
        </p>
      </header>
      <section className="rounded-lg border border-border bg-surface p-6 shadow-e1">
        <SignUpForm />
      </section>
      <Link className="text-sm text-primary" href="/sign-in">
        Sign in
      </Link>
    </main>
  );
}
