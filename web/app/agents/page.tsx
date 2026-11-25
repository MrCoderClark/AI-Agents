import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { listAgents, type Agent } from "@/lib/agents";
import { accessToken, getWorkspace } from "@/lib/workspaces";

import { CreateAgentForm } from "./create-agent-form";

export const dynamic = "force-dynamic";

type AgentsPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const token = await accessToken();
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = (await cookies()).get("workspace_id")?.value;
  if (!workspaceId) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-muted-foreground">Choose a workspace before creating an agent.</p>
        <a className="text-sm text-primary" href="/workspaces">
          Workspaces
        </a>
      </main>
    );
  }

  let workspace: Awaited<ReturnType<typeof getWorkspace>> = null;
  let workspaceError: string | null = null;
  try {
    workspace = await getWorkspace(token, workspaceId);
  } catch (error) {
    workspaceError =
      error instanceof Error ? error.message : "Could not load the workspace";
  }
  if (workspaceError) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-danger" role="alert">
          {workspaceError}
        </p>
        <a className="text-sm text-primary" href="/workspaces">
          Workspaces
        </a>
      </main>
    );
  }
  if (!workspace) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Agents</h1>
        <p className="text-sm text-danger" role="alert">
          That workspace is not available.
        </p>
        <a className="text-sm text-primary" href="/workspaces">
          Workspaces
        </a>
      </main>
    );
  }

  const params = await searchParams;
  let agents: Agent[] = [];
  let loadError: string | null = null;
  try {
    agents = await listAgents(token, workspaceId);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load agents";
  }
  const actionError =
    params.error === "delete"
      ? "Could not delete that agent."
      : params.error === "load"
        ? "Could not reach the API."
        : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Agents</h1>
        <p className="text-base text-muted-foreground">{workspace.name}</p>
        <a className="text-sm text-primary" href="/workspaces">
          Workspaces
        </a>
      </header>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-e1">
        <h2 className="text-lg font-semibold text-foreground">New agent</h2>
        <CreateAgentForm />
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
        <h2 className="text-lg font-semibold text-foreground">Your agents</h2>
        {agents.length === 0 && !loadError ? (
          <p className="text-sm text-muted-foreground">No agents yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-col gap-1">
        <a className="text-sm font-medium text-foreground hover:text-primary" href={`/agents/${agent.id}`}>
          {agent.name}
        </a>
        {agent.description ? (
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        ) : null}
        <StatusLabel status={agent.status} />
      </div>
      <form action="/api/agents/delete" method="post">
        <input type="hidden" name="id" value={agent.id} />
        <button
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground enabled:hover:bg-elevated"
          type="submit"
        >
          Delete
        </button>
      </form>
    </li>
  );
}

function StatusLabel({ status }: { status: string }) {
  const label = status === "live" ? "Live" : status === "paused" ? "Paused" : "Draft";
  const tone =
    status === "live"
      ? "text-success"
      : status === "paused"
        ? "text-warning"
        : "text-muted-foreground";
  const shape = status === "paused" ? "square" : status === "live" ? "triangle" : "circle";
  return (
    <p className={`flex items-center gap-2 text-xs ${tone}`}>
      <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
        {shape === "circle" ? <circle cx="8" cy="8" r="5" fill="currentColor" /> : null}
        {shape === "triangle" ? <path d="M8 2.5 14 13.5H2Z" fill="currentColor" /> : null}
        {shape === "square" ? <rect x="3" y="3" width="10" height="10" fill="currentColor" /> : null}
      </svg>
      {label}
    </p>
  );
}
