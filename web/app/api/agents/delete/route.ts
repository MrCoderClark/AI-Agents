import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { deleteAgent } from "@/lib/agents";
import { accessToken } from "@/lib/workspaces";

export async function POST(request: Request) {
  const token = await accessToken();
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }
  const workspaceId = (await cookies()).get("workspace_id")?.value;
  if (!workspaceId) {
    return NextResponse.redirect(new URL("/workspaces", request.url), 303);
  }

  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string" || id === "") {
    return NextResponse.redirect(new URL("/agents", request.url), 303);
  }

  try {
    const result = await deleteAgent(token, workspaceId, id);
    if (!result.ok) {
      return NextResponse.redirect(new URL("/agents?error=delete", request.url), 303);
    }
  } catch {
    return NextResponse.redirect(new URL("/agents?error=load", request.url), 303);
  }
  return NextResponse.redirect(new URL("/agents", request.url), 303);
}
