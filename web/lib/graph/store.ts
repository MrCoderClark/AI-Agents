"use client";

import type { GraphDoc, GraphEdge, GraphNode } from "@ai-agents/graph";
import { emptyGraph } from "@ai-agents/graph";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type GraphStore = {
  key: string | null;
  doc: GraphDoc;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  inspectorOpen: boolean;
  paletteCollapsed: boolean;
  hydrate: (key: string, doc: GraphDoc) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  toggleInspector: () => void;
  togglePalette: () => void;
  addNode: (node: GraphNode) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  replaceNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  replaceEdge: (edge: GraphEdge) => void;
  setViewport: (viewport: GraphDoc["viewport"]) => void;
  removeSelection: () => void;
};

export const useGraphStore = create<GraphStore>()(
  immer((set) => ({
    key: null,
    doc: emptyGraph(),
    selectedNodeId: null,
    selectedEdgeId: null,
    inspectorOpen: true,
    paletteCollapsed: false,
    hydrate: (key, doc) =>
      set((state) => {
        if (state.key === key) {
          return;
        }
        state.key = key;
        state.doc = doc;
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
        state.inspectorOpen = true;
      }),
    selectNode: (id) =>
      set((state) => {
        if (state.selectedNodeId === id) {
          return;
        }
        state.selectedNodeId = id;
        if (id) {
          state.selectedEdgeId = null;
        }
      }),
    selectEdge: (id) =>
      set((state) => {
        if (state.selectedEdgeId === id) {
          return;
        }
        state.selectedEdgeId = id;
      }),
    toggleInspector: () =>
      set((state) => {
        state.inspectorOpen = !state.inspectorOpen;
      }),
    togglePalette: () =>
      set((state) => {
        state.paletteCollapsed = !state.paletteCollapsed;
      }),
    addNode: (node) =>
      set((state) => {
        state.doc.nodes.push(node);
        state.selectedNodeId = node.id;
        state.selectedEdgeId = null;
        state.inspectorOpen = true;
      }),
    moveNode: (id, position) =>
      set((state) => {
        const node = state.doc.nodes.find((item) => item.id === id);
        if (!node) {
          return;
        }
        if (node.position.x === position.x && node.position.y === position.y) {
          return;
        }
        node.position = { x: position.x, y: position.y };
      }),
    replaceNode: (node) =>
      set((state) => {
        const index = state.doc.nodes.findIndex((item) => item.id === node.id);
        const current = state.doc.nodes[index];
        if (!current || current.kind !== node.kind) {
          return;
        }
        state.doc.nodes[index] = node;
      }),
    addEdge: (edge) =>
      set((state) => {
        if (edge.source === edge.target) {
          return;
        }
        const ids = new Set(state.doc.nodes.map((node) => node.id));
        if (!ids.has(edge.source) || !ids.has(edge.target)) {
          return;
        }
        const exists = state.doc.edges.some(
          (item) =>
            item.source === edge.source &&
            item.target === edge.target &&
            item.sourceHandle === edge.sourceHandle,
        );
        if (exists) {
          return;
        }
        state.doc.edges.push(edge);
        state.selectedEdgeId = edge.id;
        state.selectedNodeId = null;
      }),
    replaceEdge: (edge) =>
      set((state) => {
        const index = state.doc.edges.findIndex((item) => item.id === edge.id);
        if (index < 0) {
          return;
        }
        state.doc.edges[index] = edge;
      }),
    setViewport: (viewport) =>
      set((state) => {
        const current = state.doc.viewport;
        if (
          current.x === viewport.x &&
          current.y === viewport.y &&
          current.zoom === viewport.zoom
        ) {
          return;
        }
        state.doc.viewport = viewport;
      }),
    removeSelection: () =>
      set((state) => {
        if (state.selectedNodeId) {
          const id = state.selectedNodeId;
          state.doc.nodes = state.doc.nodes.filter((node) => node.id !== id);
          state.doc.edges = state.doc.edges.filter(
            (edge) => edge.source !== id && edge.target !== id,
          );
          state.selectedNodeId = null;
          return;
        }
        if (state.selectedEdgeId) {
          const id = state.selectedEdgeId;
          state.doc.edges = state.doc.edges.filter((edge) => edge.id !== id);
          state.selectedEdgeId = null;
        }
      }),
  })),
);
