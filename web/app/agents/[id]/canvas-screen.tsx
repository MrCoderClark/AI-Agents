"use client";

import type { GraphDoc } from "@ai-agents/graph";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useLayoutEffect, useRef } from "react";

import "@xyflow/react/dist/style.css";

import { Canvas, nodeFromDrag, ZoomReadout } from "@/components/canvas/Canvas";
import { Palette } from "@/components/canvas/Palette";
import { Inspector } from "@/components/inspector/Inspector";
import type { PaletteDrag } from "@/lib/graph/drag";
import { useGraphStore } from "@/lib/graph/store";

type CanvasScreenProps = {
  agentId: string;
  agentName: string;
  initialDoc: GraphDoc;
};

export function CanvasScreen({ agentId, agentName, initialDoc }: CanvasScreenProps) {
  const addNode = useGraphStore((state) => state.addNode);
  const toggleInspector = useGraphStore((state) => state.toggleInspector);
  const removeSelection = useGraphStore((state) => state.removeSelection);
  const initialDocRef = useRef(initialDoc);
  const seenAgent = useRef(agentId);
  if (seenAgent.current !== agentId) {
    seenAgent.current = agentId;
    initialDocRef.current = initialDoc;
  }

  useLayoutEffect(() => {
    useGraphStore.getState().hydrate(agentId, initialDocRef.current);
  }, [agentId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === ".") {
        event.preventDefault();
        toggleInspector();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelection();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeSelection, toggleInspector]);

  function onAdd(drag: PaletteDrag) {
    const count = useGraphStore.getState().doc.nodes.length;
    addNode(nodeFromDrag(drag, crypto.randomUUID(), { x: 80 + count * 32, y: 80 + count * 32 }));
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-full min-h-0">
        <Palette onAdd={onAdd} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar agentName={agentName} />
          <Canvas />
        </div>
        <Inspector />
      </div>
    </ReactFlowProvider>
  );
}

function Toolbar({ agentName }: { agentName: string }) {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-4 py-3">
      <a className="shrink-0 text-sm text-primary" href="/agents">
        Agents
      </a>
      <h1 className="min-w-0 flex-1 truncate text-3xl font-bold text-foreground" title={agentName}>
        {agentName}
      </h1>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Branch
        <select
          className="rounded-md border border-border bg-canvas px-2 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
          disabled
          title="Branches start in a later phase"
          defaultValue="draft"
        >
          <option value="draft">draft</option>
        </select>
      </label>
      <ZoomReadout />
      <button
        className="rounded-md border border-border px-4 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:text-text-muted"
        type="button"
        disabled
        title="Test runs start in a later phase"
      >
        Test
      </button>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-elevated disabled:text-text-muted"
        type="button"
        disabled
        title="Publish starts in a later phase"
      >
        Publish
      </button>
    </header>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
