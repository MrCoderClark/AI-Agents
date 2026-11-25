"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function CreateAgentForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const description = String(data.get("description") ?? "");
    setPending(true);
    setError(null);
    let response: Response;
    try {
      response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
    } catch {
      setPending(false);
      setError("Could not save the agent");
      return;
    }
    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Could not save the agent");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Name
        <input
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          name="name"
          type="text"
          maxLength={80}
          required
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Description
        <textarea
          className="min-h-20 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          name="description"
          maxLength={2000}
          disabled={pending}
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
        {pending ? "Creating" : "Create agent"}
      </button>
    </form>
  );
}
