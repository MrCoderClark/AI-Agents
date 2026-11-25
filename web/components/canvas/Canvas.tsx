import {
  createAgentNode,
  createRuntimeNode,
  validateGraph,
  type GraphNode,
} from "@ai-agents/graph";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useViewport,
  type Connection,
  type NodeChangeset,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, type DragEvent } from "react";

import { readPaletteDrag, type PaletteDrag } from "@/lib/graph/drag";
import { useGraphStore } from "@/lib/graph/store";

import { EdgePill } from "./EdgePill";
import { NodeCard } from "./NodeCard";

const nodeTypes = { graph: NodeCard };
const edgeTypes = { pill: EdgePill };

export function Canvas() {
  const doc = useGraphStore((state) => state.doc);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeId = useGraphStore((state) => state.selectedEdgeId);
  const moveNode = useGraphStore((state) => state.moveNode);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const addEdge = useGraphStore((state) => state.addEdge);
  const addNode = useGraphStore((state) => state.addNode);
  const setViewport = useGraphStore((state) => state.setViewport);
  const { screenToFlowPosition, zoomTo, fitView } = useReactFlow();
  const initialViewport = useRef(doc.viewport);

  const issues = useMemo(() => validateGraph(doc), [doc]);
  const nodes = useMemo(
    () =>
      doc.nodes.map((node) => ({
        id: node.id,
        type: "graph" as const,
        position: node.position,
        data: {
          node,
          errors: issues.filter((issue) => issue.nodeId === node.id && issue.severity === "error")
            .length,
          warnings: issues.filter(
            (issue) => issue.nodeId === node.id && issue.severity === "warning",
          ).length,
        },
        selected: node.id === selectedNodeId,
        ariaLabel: node.kind === "agent" ? `${node.title}, agent` : `${node.title}, ${node.runtime}`,
      })),
    [doc.nodes, issues, selectedNodeId],
  );
  const edges = useMemo(
    () =>
      doc.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        label: edge.label,
        type: "pill" as const,
        selected: edge.id === selectedEdgeId,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.id === selectedEdgeId ? "var(--edge-active)" : "var(--edge)",
        },
      })),
    [doc.edges, selectedEdgeId],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "1") {
        void zoomTo(0.5);
      } else if (event.key === "2") {
        void zoomTo(1);
      } else if (event.key === "3") {
        void fitView();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fitView, zoomTo]);

  function onNodesChange(changes: NodeChangeset<(typeof nodes)[number]>) {
    for (const change of changes.getByType("position")) {
      if (change.position) {
        moveNode(change.id, change.position);
      }
    }
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }
    addEdge({
      id: crypto.randomUUID(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
    });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const raw =
      event.dataTransfer.getData("application/x-graph-node") ||
      event.dataTransfer.getData("text/plain");
    const drag = readPaletteDrag(raw);
    if (!drag) {
      return;
    }
    addNode(
      nodeFromDrag(
        drag,
        crypto.randomUUID(),
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      ),
    );
  }

  return (
    <div className="relative h-full min-h-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          const nodeId = selectedNodes[0]?.id ?? null;
          selectNode(nodeId);
          selectEdge(nodeId ? null : (selectedEdges[0]?.id ?? null));
        }}
        onMoveEnd={(_event, viewport) => setViewport(viewport)}
        defaultViewport={initialViewport.current}
        forceColorMode="dark"
        panOnDrag
        panActivationKeyCode="Space"
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        nodesFocusable
        edgesFocusable
        className="bg-canvas"
      >
        <Background gap={20} size={1} color="var(--text-muted)" className="opacity-[0.08]" />
        <Controls showInteractive position="bottom-left" />
        <MiniMap
          position="bottom-right"
          style={{ width: 160, height: 100 }}
          className="hidden min-[900px]:block"
          maskColor="var(--bg-canvas)"
          nodeColor="var(--bg-elevated)"
          ariaLabel="Graph minimap"
        />
      </ReactFlow>
      <div className="sr-only" role="tree" aria-label="Graph">
        {doc.nodes.map((node) => (
          <div key={node.id} role="treeitem" aria-selected={node.id === selectedNodeId} tabIndex={-1}>
            {node.kind === "agent" ? `${node.title}, agent` : `${node.title}, ${node.runtime}`}
          </div>
        ))}
      </div>
      {doc.nodes.length === 0 ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Drag a runtime or an agent onto the canvas.
        </p>
      ) : null}
    </div>
  );
}

export function nodeFromDrag(
  drag: PaletteDrag,
  id: string,
  position: { x: number; y: number },
): GraphNode {
  if (drag.kind === "agent") {
    return createAgentNode(id, position);
  }
  return createRuntimeNode(id, drag.runtime, position);
}

export function ZoomReadout() {
  const { zoom } = useViewport();
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {Math.round(zoom * 100)}%
    </span>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
