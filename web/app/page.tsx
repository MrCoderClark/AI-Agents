import "@ai-agents/api-client";
import "@ai-agents/graph";
import type { ReactNode } from "react";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">AI Agents Builder</h1>
        <p className="text-base text-muted-foreground">
          Monorepo shell for the agent workspace.
        </p>
        <a className="text-sm text-primary" href="/sign-in">
          Sign in
        </a>
      </header>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-e1">
        <h2 className="text-lg font-semibold text-foreground">Workspaces</h2>
        <a className="text-sm text-primary" href="/workspaces">
          Open workspaces
        </a>
        <a className="text-sm text-primary" href="/agents">
          Open agents
        </a>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Run status</h2>
        <ul className="flex flex-col gap-2">
          <StatusRow tone="text-success" shape="circle">
            Healthy
          </StatusRow>
          <StatusRow tone="text-warning" shape="triangle">
            Degraded
          </StatusRow>
          <StatusRow tone="text-danger" shape="square">
            Failed
          </StatusRow>
        </ul>
      </section>
    </main>
  );
}

type StatusShape = "circle" | "triangle" | "square";

function StatusRow({
  tone,
  shape,
  children,
}: {
  tone: string;
  shape: StatusShape;
  children: ReactNode;
}) {
  return (
    <li className={`flex items-center gap-2 text-sm ${tone}`}>
      <StatusIcon shape={shape} />
      {children}
    </li>
  );
}

function StatusIcon({ shape }: { shape: StatusShape }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      {shape === "circle" ? <circle cx="8" cy="8" r="5" fill="currentColor" /> : null}
      {shape === "triangle" ? (
        <path d="M8 2.5 14 13.5H2Z" fill="currentColor" />
      ) : null}
      {shape === "square" ? (
        <rect x="3" y="3" width="10" height="10" fill="currentColor" />
      ) : null}
    </svg>
  );
}
