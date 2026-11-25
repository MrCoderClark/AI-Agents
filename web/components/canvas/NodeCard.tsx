import type { GraphNode } from "@ai-agents/graph";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { RuntimeBadge } from "./RuntimeBadge";

export type CardData = {
  node: GraphNode;
  errors: number;
  warnings: number;
};

export function NodeCard({ data, selected }: NodeProps<Node<CardData>>) {
  const { node, errors, warnings } = data;
  const subtitle =
    node.kind === "agent" ? node.model || "No model" : node.entry || "No entry command";
  return (
    <article
      className={`flex w-56 flex-col gap-2 rounded-lg border bg-surface p-3 shadow-e1 ${
        selected ? "border-accent shadow-e2" : "border-border-strong"
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <header className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium text-foreground">{node.title}</h3>
        <p className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
            <circle cx="8" cy="8" r="4" fill="currentColor" />
          </svg>
          Idle
        </p>
      </header>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      {node.kind === "runtime" ? <RuntimeBadge runtime={node.runtime} /> : null}
      {node.kind === "runtime" && node.tools.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {node.tools.map((tool) => (
            <li
              key={tool}
              className="rounded-md bg-elevated px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tool}
            </li>
          ))}
        </ul>
      ) : null}
      {errors > 0 ? (
        <p className="flex items-center gap-1 text-xs text-danger">
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
            <rect x="3" y="3" width="10" height="10" fill="currentColor" />
          </svg>
          {errors === 1 ? "1 error" : `${errors} errors`}
        </p>
      ) : null}
      {warnings > 0 ? (
        <p className="flex items-center gap-1 text-xs text-warning">
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
            <path d="M8 2.5 14 13.5H2Z" fill="currentColor" />
          </svg>
          {warnings === 1 ? "1 warning" : `${warnings} warnings`}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </article>
  );
}
