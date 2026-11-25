import { emptyGraph } from "@ai-agents/graph";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAgent } from "@/lib/agents";
import { accessToken } from "@/lib/workspaces";

import { CanvasScreen } from "./canvas-screen";

export const dynamic = "force-dynamic";

type AgentCanvasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AgentCanvasPage({ params }: AgentCanvasPageProps) {
  const { id } = await params;
  const token = await accessToken();
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = (await cookies()).get("workspace_id")?.value;
  if (!workspaceId) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Canvas</h1>
        <p className="text-sm text-muted-foreground">Choose a workspace before opening an agent.</p>
        <a className="text-sm text-primary" href="/workspaces">
          Workspaces
        </a>
      </main>
    );
  }

  let agent: Awaited<ReturnType<typeof getAgent>> = null;
  let loadError: string | null = null;
  try {
    agent = await getAgent(token, workspaceId, id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load the agent";
  }
  if (loadError) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Canvas</h1>
        <p className="text-sm text-danger" role="alert">
          {loadError}
        </p>
        <a className="text-sm text-primary" href="/agents">
          Agents
        </a>
      </main>
    );
  }
  if (!agent) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground">Canvas</h1>
        <p className="text-sm text-danger" role="alert">
          That agent is not available.
        </p>
        <a className="text-sm text-primary" href="/agents">
          Agents
        </a>
      </main>
    );
  }

  return (
    <main className="h-dvh overflow-hidden">
      <CanvasScreen agentId={agent.id} agentName={agent.name} initialDoc={emptyGraph()} />
    </main>
  );
}
