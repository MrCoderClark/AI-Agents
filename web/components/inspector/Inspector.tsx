import { validateGraph, type GraphEdge, type GraphNode } from "@ai-agents/graph";

import { useGraphStore } from "@/lib/graph/store";

import { AgentForm } from "./AgentForm";
import { IssueList } from "./IssueList";
import { RuntimeForm } from "./RuntimeForm";

export function Inspector() {
  const doc = useGraphStore((state) => state.doc);
  const open = useGraphStore((state) => state.inspectorOpen);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeId = useGraphStore((state) => state.selectedEdgeId);
  const toggleInspector = useGraphStore((state) => state.toggleInspector);
  const node = doc.nodes.find((item) => item.id === selectedNodeId) ?? null;
  const edge = doc.edges.find((item) => item.id === selectedEdgeId) ?? null;
  const graphIssues = validateGraph(doc).filter((issue) => issue.nodeId === undefined);

  if (!open) {
    return (
      <button
        className="w-14 shrink-0 border-l border-border bg-surface px-2 text-xs text-foreground enabled:hover:bg-elevated"
        type="button"
        aria-expanded={false}
        onClick={toggleInspector}
      >
        Inspector
      </button>
    );
  }

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-4"
      aria-label="Inspector"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Inspector</h2>
        <button
          className="rounded-md border border-border px-2 py-2 text-xs text-foreground enabled:hover:bg-elevated"
          type="button"
          aria-expanded
          onClick={toggleInspector}
        >
          Collapse
        </button>
      </header>
      {node ? <NodeFields node={node} /> : null}
      {!node && edge ? <EdgeFields edge={edge} /> : null}
      {!node && !edge ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Select a node to edit it.</p>
          <p className="text-sm text-foreground">{doc.nodes.length} nodes</p>
          <IssueList issues={graphIssues} />
        </div>
      ) : null}
    </aside>
  );
}

function NodeFields({ node }: { node: GraphNode }) {
  if (node.kind === "agent") {
    return <AgentForm node={node} />;
  }
  return <RuntimeForm node={node} />;
}

function EdgeFields({ edge }: { edge: GraphEdge }) {
  const replaceEdge = useGraphStore((state) => state.replaceEdge);
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Edge label
        <input
          className="rounded-md border border-border bg-canvas px-3 py-2 text-sm text-foreground"
          value={edge.label ?? ""}
          onChange={(event) => {
            const label = event.target.value;
            replaceEdge({ ...edge, label: label.length > 0 ? label : undefined });
          }}
        />
      </label>
    </form>
  );
}
