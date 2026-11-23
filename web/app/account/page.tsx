import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-bold text-foreground">Account</h1>
      <p className="text-base text-foreground">{session.user.email}</p>
      <p className="font-mono text-xs text-muted-foreground">{session.user.id}</p>
    </main>
  );
}
