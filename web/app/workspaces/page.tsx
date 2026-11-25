import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { accessToken, listWorkspaces, type Workspace } from "@/lib/workspaces";

import { CreateWorkspaceForm } from "./create-workspace-form";

export const dynamic = "force-dynamic";

type WorkspacesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function WorkspacesPage({ searchParams }: WorkspacesPageProps) {
  const token = await accessToken();
  if (!token) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  let workspaces: Workspace[] = [];
  let loadError: string | null = null;
  try {
    workspaces = await listWorkspaces(token);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load workspaces";
  }

  const activeId = (await cookies()).get("workspace_id")?.value;
  const actionError =
    params.error === "missing"
      ? "That workspace is not available."
      : params.error === "load"
        ? "Could not use that workspace."
        : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
        <p className="text-base text-muted-foreground">
          Create a workspace for your team. Agents will live inside it.
        </p>
        <a className="text-sm text-primary" href="/account">
          Account
        </a>
        <a className="text-sm text-primary" href="/agents">
          Agents
        </a>
      </header>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-e1">
        <h2 className="text-lg font-semibold text-foreground">New workspace</h2>
        <CreateWorkspaceForm />
      </section>
      {loadError ? (
        <p className="text-sm text-danger" role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-danger" role="alert">
          {actionError}
        </p>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Your workspaces</h2>
        {workspaces.length === 0 && !loadError ? (
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {workspaces.map((workspace) => (
              <WorkspaceRow
                key={workspace.id}
                workspace={workspace}
                active={workspace.id === activeId}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function WorkspaceRow({ workspace, active }: { workspace: Workspace; active: boolean }) {
  return (
    <li
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3"
      aria-current={active ? "true" : undefined}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{workspace.name}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {workspace.role === "owner" ? "Owner" : workspace.role} · {workspace.plan}
        </p>
        <time className="font-mono text-xs text-muted-foreground" dateTime={workspace.created_at}>
          {formatCreated(workspace.created_at)}
        </time>
      </div>
      <form action="/api/workspaces/active" method="post">
        <input type="hidden" name="id" value={workspace.id} />
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground enabled:hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted"
          type="submit"
          disabled={active}
        >
          {active ? "Active" : "Use this workspace"}
        </button>
      </form>
    </li>
  );
}

function formatCreated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
