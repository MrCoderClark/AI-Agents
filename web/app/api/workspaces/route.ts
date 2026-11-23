import { NextResponse } from "next/server";

import { accessToken, createWorkspace } from "@/lib/workspaces";

export async function POST(request: Request) {
  const token = await accessToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let name = "";
  try {
    const body = (await request.json()) as { name?: unknown };
    name = typeof body.name === "string" ? body.name : "";
  } catch {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  try {
    const result = await createWorkspace(token, name);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json(result.workspace, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the workspace";
    return NextResponse.json({ message }, { status: 503 });
  }
}
