import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export type Workspace = {
  id: string;
  name: string;
  plan: string;
  role: string;
  created_at: string;
};

export async function accessToken(): Promise<string | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return null;
  }
  const issued = await auth.api.getToken({ headers: requestHeaders });
  return issued.token;
}

export async function listWorkspaces(token: string): Promise<Workspace[]> {
  const response = await callApi(token, "/workspaces");
  if (!response.ok) {
    throw new Error("Could not load workspaces");
  }
  return (await response.json()) as Workspace[];
}

export async function getWorkspace(
  token: string,
  workspaceId: string,
): Promise<Workspace | null> {
  const response = await callApi(token, `/workspaces/${workspaceId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not load the workspace");
  }
  return (await response.json()) as Workspace;
}

type CreateResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; status: number; message: string };

export async function createWorkspace(token: string, name: string): Promise<CreateResult> {
  const response = await callApi(token, "/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readError(response),
    };
  }
  return { ok: true, workspace: (await response.json()) as Workspace };
}

async function callApi(token: string, path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.API_URL ?? "http://127.0.0.1:8000";
  try {
    return await fetch(new URL(path, base), {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach the API");
  }
}

async function readError(response: Response): Promise<string> {
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
  return "Could not save the workspace";
}
