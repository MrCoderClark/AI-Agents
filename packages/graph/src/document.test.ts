import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAgentNode,
  createRuntimeNode,
  emptyGraph,
  parseGraph,
  serializeGraph,
  validateGraph,
} from "./document.ts";

test("an empty graph is valid", () => {
  assert.deepEqual(validateGraph(emptyGraph()), []);
});

test("agent and runtime nodes round-trip through the serializer", () => {
  const doc = emptyGraph();
  doc.nodes.push(createAgentNode("agent-1", { x: 10, y: 20 }));
  doc.nodes.push(createRuntimeNode("runtime-1", "node", { x: 40, y: 80 }));
  doc.edges.push({
    id: "edge-1",
    source: "agent-1",
    target: "runtime-1",
    label: "diff",
  });
  const parsed = parseGraph(JSON.parse(serializeGraph(doc)));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.doc, doc);
    assert.deepEqual(validateGraph(parsed.doc), [
      {
        severity: "warning",
        nodeId: "agent-1",
        path: "nodes.agent-1.model",
        message: "Model is empty.",
      },
    ]);
  }
});

test("a tool node is rejected", () => {
  const parsed = parseGraph({
    schemaVersion: 1,
    nodes: [{ kind: "tool", id: "tool-1" }],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  assert.equal(parsed.ok, false);
});

test("an edge to a missing node is an error", () => {
  const doc = emptyGraph();
  doc.nodes.push(createRuntimeNode("runtime-1", "python", { x: 0, y: 0 }));
  doc.edges.push({ id: "edge-1", source: "runtime-1", target: "missing" });
  const issues = validateGraph(doc);
  assert.equal(issues.some((issue) => issue.path === "edges.edge-1"), true);
});

test("150 nodes warn and 201 nodes fail", () => {
  const warning = emptyGraph();
  const failure = emptyGraph();
  for (let index = 0; index < 150; index += 1) {
    warning.nodes.push(createRuntimeNode(`py-${index}`, "python", { x: index, y: 0 }));
  }
  for (let index = 0; index < 201; index += 1) {
    failure.nodes.push(createRuntimeNode(`js-${index}`, "node", { x: index, y: 0 }));
  }
  assert.equal(
    validateGraph(warning).some((issue) => issue.severity === "warning" && issue.path === "nodes"),
    true,
  );
  assert.equal(
    validateGraph(failure).some((issue) => issue.severity === "error" && issue.path === "nodes"),
    true,
  );
});

test("a python node cannot claim the Node.js version", () => {
  const doc = emptyGraph();
  const node = createRuntimeNode("runtime-1", "python", { x: 0, y: 0 });
  node.version = "24";
  doc.nodes.push(node);
  assert.equal(
    validateGraph(doc).some((issue) => issue.path === "nodes.runtime-1.version"),
    true,
  );
});
