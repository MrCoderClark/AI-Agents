import { apiFetch } from "@/lib/workspaces";

export type Agent = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: string;
  current_version_id: string | null;
  created_at: string;
};

export async function listAgents(token: string, workspaceId: string): Promise<Agent[]> {
  const response = await apiFetch(token, `/workspaces/${workspaceId}/agents`);
  if (!response.ok) {
    throw new Error("Could not load agents");
  }
  return (await response.json()) as Agent[];
}

type CreateResult =
  | { ok: true; agent: Agent }
  | { ok: false; status: number; message: string };

export async function createAgent(
  token: string,
  workspaceId: string,
  name: string,
  description: string,
): Promise<CreateResult> {
  const response = await apiFetch(token, `/workspaces/${workspaceId}/agents`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    return { ok: false, status: response.status, message: await readError(response) };
  }
  return { ok: true, agent: (await response.json()) as Agent };
}

export async function getAgent(
  token: string,
  workspaceId: string,
  agentId: string,
): Promise<Agent | null> {
  const response = await apiFetch(token, `/workspaces/${workspaceId}/agents/${agentId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await readError(response, "Could not load the agent"));
  }
  return (await response.json()) as Agent;
}

export async function deleteAgent(
  token: string,
  workspaceId: string,
  agentId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const response = await apiFetch(
    token,
    `/workspaces/${workspaceId}/agents/${agentId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    return { ok: false, status: response.status, message: await readError(response) };
  }
  return { ok: true };
}

async function readError(
  response: Response,
  fallback = "Could not save the agent",
): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  if (response.status === 422) {
    return "Name is required";
  }
  return fallback;
}
