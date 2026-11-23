import { NextResponse } from "next/server";

import { accessToken, getWorkspace } from "@/lib/workspaces";

const month = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const token = await accessToken();
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string" || id === "") {
    return NextResponse.redirect(new URL("/workspaces", request.url), 303);
  }

  let workspace: Awaited<ReturnType<typeof getWorkspace>>;
  try {
    workspace = await getWorkspace(token, id);
  } catch {
    return NextResponse.redirect(new URL("/workspaces?error=load", request.url), 303);
  }
  if (!workspace) {
    return NextResponse.redirect(new URL("/workspaces?error=missing", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/workspaces", request.url), 303);
  response.cookies.set("workspace_id", workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: month,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
