import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createAgent } from "@/lib/agents";
import { accessToken } from "@/lib/workspaces";

export async function POST(request: Request) {
  const token = await accessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = (await cookies()).get("workspace_id")?.value;
  if (!workspaceId) {
    return NextResponse.json({ message: "Choose a workspace" }, { status: 400 });
  }

  let name = "";
  let description = "";
  try {
    const body = (await request.json()) as { name?: unknown; description?: unknown };
    name = typeof body.name === "string" ? body.name : "";
    description = typeof body.description === "string" ? body.description : "";
  } catch {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  try {
    const result = await createAgent(token, workspaceId, name, description);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json(result.agent, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the agent";
    return NextResponse.json({ message }, { status: 503 });
  }
}
