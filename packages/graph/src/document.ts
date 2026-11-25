export type OnError = "retry" | "escalate" | "continue";

export type RuntimeKind = "python" | "node";

export type SandboxProfile = "strict" | "network" | "open";

export type Position = {
  x: number;
  y: number;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonSchema = { [key: string]: JsonValue };

type BaseNode = {
  id: string;
  title: string;
  position: Position;
  onError: OnError;
  timeoutMs: number;
};

export type AgentNode = BaseNode & {
  kind: "agent";
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  outputSchema?: JsonSchema;
};

export type RuntimeNode = BaseNode & {
  kind: "runtime";
  runtime: RuntimeKind;
  version: string;
  entry: string;
  workingDirectory: string;
  dependencies: string[];
  envKeys: string[];
  tools: string[];
  sandbox: SandboxProfile;
};

export type GraphNode = AgentNode | RuntimeNode;

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
};

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type GraphDoc = {
  schemaVersion: 1;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: Viewport;
};

export type GraphIssue = {
  severity: "warning" | "error";
  nodeId?: string;
  path: string;
  message: string;
};

const ON_ERROR: readonly OnError[] = ["retry", "escalate", "continue"];
const RUNTIMES: readonly RuntimeKind[] = ["python", "node"];
const SANDBOXES: readonly SandboxProfile[] = ["strict", "network", "open"];
const NODE_CEILING = 200;
const NODE_WARNING = 150;

export function emptyGraph(): GraphDoc {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function createAgentNode(id: string, position: Position): AgentNode {
  return {
    id,
    kind: "agent",
    title: "Agent",
    position,
    onError: "retry",
    timeoutMs: 60_000,
    model: "",
    systemPrompt: "",
    temperature: 0.2,
    maxTokens: 2048,
  };
}

export function createRuntimeNode(
  id: string,
  runtime: RuntimeKind,
  position: Position,
): RuntimeNode {
  const preset = runtimePreset(runtime);
  return {
    id,
    kind: "runtime",
    title: preset.title,
    position,
    onError: "retry",
    timeoutMs: 60_000,
    runtime,
    version: preset.version,
    entry: preset.entry,
    workingDirectory: "",
    dependencies: [],
    envKeys: [],
    tools: [],
    sandbox: "strict",
  };
}

export function runtimePreset(runtime: RuntimeKind): {
  title: string;
  version: string;
  entry: string;
} {
  if (runtime === "python") {
    return { title: "Python", version: "3.13", entry: "uv run main.py" };
  }
  return { title: "Node.js", version: "24", entry: "node main.js" };
}

export function isJsonSchema(value: unknown): value is JsonSchema {
  return isJsonValue(value) && isRecord(value);
}

export function validateGraph(doc: GraphDoc): GraphIssue[] {
  const issues: GraphIssue[] = [];
  if (doc.nodes.length > NODE_CEILING) {
    issues.push({
      severity: "error",
      path: "nodes",
      message: "A graph can hold at most 200 nodes.",
    });
  } else if (doc.nodes.length >= NODE_WARNING) {
    issues.push({
      severity: "warning",
      path: "nodes",
      message: "This graph has 150 or more nodes.",
    });
  }

  const ids = new Set<string>();
  for (const node of doc.nodes) {
    if (ids.has(node.id)) {
      issues.push({
        severity: "error",
        nodeId: node.id,
        path: `nodes.${node.id}.id`,
        message: "Node id is duplicated.",
      });
    }
    ids.add(node.id);
    issues.push(...validateNode(node));
  }

  const edgeIds = new Set<string>();
  for (const edge of doc.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        severity: "error",
        path: `edges.${edge.id}.id`,
        message: "Edge id is duplicated.",
      });
    }
    edgeIds.add(edge.id);
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      issues.push({
        severity: "error",
        path: `edges.${edge.id}`,
        message: "Edge endpoints must be nodes in this graph.",
      });
    }
    if (edge.source === edge.target) {
      issues.push({
        severity: "error",
        path: `edges.${edge.id}`,
        message: "An edge cannot connect a node to itself.",
      });
    }
  }

  return issues;
}

export function serializeGraph(doc: GraphDoc): string {
  return JSON.stringify(doc);
}

export function parseGraph(
  value: unknown,
): { ok: true; doc: GraphDoc } | { ok: false; issues: GraphIssue[] } {
  const issues: GraphIssue[] = [];
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          path: "schemaVersion",
          message: "Graph schemaVersion must be 1.",
        },
      ],
    };
  }
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          path: "nodes",
          message: "Graph nodes and edges must be arrays.",
        },
      ],
    };
  }
  const viewport = readViewport(value.viewport, issues);
  const nodes: GraphNode[] = [];
  for (let index = 0; index < value.nodes.length; index += 1) {
    const node = readNode(value.nodes[index], issues, `nodes[${index}]`);
    if (node) {
      nodes.push(node);
    }
  }
  const edges: GraphEdge[] = [];
  for (let index = 0; index < value.edges.length; index += 1) {
    const edge = readEdge(value.edges[index], issues, `edges[${index}]`);
    if (edge) {
      edges.push(edge);
    }
  }
  if (!viewport || issues.some((issue) => issue.severity === "error")) {
    return { ok: false, issues };
  }
  const doc: GraphDoc = { schemaVersion: 1, nodes, edges, viewport };
  return { ok: true, doc };
}

function validateNode(node: GraphNode): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const path = `nodes.${node.id}`;
  if (node.title.trim().length === 0) {
    issues.push({
      severity: "error",
      nodeId: node.id,
      path: `${path}.title`,
      message: "Title is required.",
    });
  }
  if (!Number.isInteger(node.timeoutMs) || node.timeoutMs < 1) {
    issues.push({
      severity: "error",
      nodeId: node.id,
      path: `${path}.timeoutMs`,
      message: "Timeout must be a positive number of milliseconds.",
    });
  }
  if (node.kind === "agent") {
    if (node.model.trim().length === 0) {
      issues.push({
        severity: "warning",
        nodeId: node.id,
        path: `${path}.model`,
        message: "Model is empty.",
      });
    }
    if (node.temperature < 0 || node.temperature > 2) {
      issues.push({
        severity: "error",
        nodeId: node.id,
        path: `${path}.temperature`,
        message: "Temperature must be between 0 and 2.",
      });
    }
    if (!Number.isInteger(node.maxTokens) || node.maxTokens < 1) {
      issues.push({
        severity: "error",
        nodeId: node.id,
        path: `${path}.maxTokens`,
        message: "Max tokens must be a positive integer.",
      });
    }
    return issues;
  }
  const preset = runtimePreset(node.runtime);
  if (node.version !== preset.version) {
    issues.push({
      severity: "error",
      nodeId: node.id,
      path: `${path}.version`,
      message: `${preset.title} uses version ${preset.version}.`,
    });
  }
  if (node.entry.trim().length === 0) {
    issues.push({
      severity: "error",
      nodeId: node.id,
      path: `${path}.entry`,
      message: "Entry command is required.",
    });
  }
  return issues;
}

function readNode(value: unknown, issues: GraphIssue[], path: string): GraphNode | null {
  if (!isRecord(value)) {
    issues.push({ severity: "error", path, message: "Node must be an object." });
    return null;
  }
  const base = readBase(value, issues, path);
  if (!base) {
    return null;
  }
  if (value.kind === "agent") {
    return readAgent(value, base, issues, path);
  }
  if (value.kind === "runtime") {
    return readRuntime(value, base, issues, path);
  }
  issues.push({
    severity: "error",
    path: `${path}.kind`,
    message: "This canvas section accepts agent and runtime nodes.",
  });
  return null;
}

function readBase(
  value: Record<string, unknown>,
  issues: GraphIssue[],
  path: string,
): BaseNode | null {
  const position = readPosition(value.position, issues, `${path}.position`);
  if (typeof value.id !== "string" || value.id.length === 0 || !position) {
    issues.push({
      severity: "error",
      path,
      message: "Node id and position are required.",
    });
    return null;
  }
  if (typeof value.title !== "string" || !isOnError(value.onError)) {
    issues.push({
      severity: "error",
      path,
      message: "Node title and onError are required.",
    });
    return null;
  }
  if (typeof value.timeoutMs !== "number") {
    issues.push({
      severity: "error",
      path: `${path}.timeoutMs`,
      message: "Timeout is required.",
    });
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    position,
    onError: value.onError,
    timeoutMs: value.timeoutMs,
  };
}

function readAgent(
  value: Record<string, unknown>,
  base: BaseNode,
  issues: GraphIssue[],
  path: string,
): AgentNode | null {
  if (
    typeof value.model !== "string" ||
    typeof value.systemPrompt !== "string" ||
    typeof value.temperature !== "number" ||
    typeof value.maxTokens !== "number"
  ) {
    issues.push({
      severity: "error",
      path,
      message: "Agent node is missing model fields.",
    });
    return null;
  }
  const node: AgentNode = {
    ...base,
    kind: "agent",
    model: value.model,
    systemPrompt: value.systemPrompt,
    temperature: value.temperature,
    maxTokens: value.maxTokens,
  };
  if ("outputSchema" in value && value.outputSchema !== undefined) {
    if (!isJsonSchema(value.outputSchema)) {
      issues.push({
        severity: "error",
        path: `${path}.outputSchema`,
        message: "Output schema must be a JSON object.",
      });
      return null;
    }
    node.outputSchema = value.outputSchema;
  }
  return node;
}

function readRuntime(
  value: Record<string, unknown>,
  base: BaseNode,
  issues: GraphIssue[],
  path: string,
): RuntimeNode | null {
  if (!isRuntimeKind(value.runtime) || !isSandbox(value.sandbox)) {
    issues.push({
      severity: "error",
      path,
      message: "Runtime and sandbox are required.",
    });
    return null;
  }
  if (
    typeof value.version !== "string" ||
    typeof value.entry !== "string" ||
    typeof value.workingDirectory !== "string"
  ) {
    issues.push({
      severity: "error",
      path,
      message: "Runtime entry fields are required.",
    });
    return null;
  }
  const dependencies = readStringList(value.dependencies);
  const envKeys = readStringList(value.envKeys);
  const tools = readStringList(value.tools);
  if (!dependencies || !envKeys || !tools) {
    issues.push({
      severity: "error",
      path,
      message: "Runtime lists must be arrays of strings.",
    });
    return null;
  }
  return {
    ...base,
    kind: "runtime",
    runtime: value.runtime,
    version: value.version,
    entry: value.entry,
    workingDirectory: value.workingDirectory,
    dependencies,
    envKeys,
    tools,
    sandbox: value.sandbox,
  };
}

function readEdge(value: unknown, issues: GraphIssue[], path: string): GraphEdge | null {
  if (!isRecord(value)) {
    issues.push({ severity: "error", path, message: "Edge must be an object." });
    return null;
  }
  if (
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.target !== "string"
  ) {
    issues.push({
      severity: "error",
      path,
      message: "Edge id, source, and target are required.",
    });
    return null;
  }
  const edge: GraphEdge = { id: value.id, source: value.source, target: value.target };
  if (value.sourceHandle !== undefined) {
    if (typeof value.sourceHandle !== "string") {
      issues.push({
        severity: "error",
        path: `${path}.sourceHandle`,
        message: "Edge sourceHandle must be a string.",
      });
      return null;
    }
    edge.sourceHandle = value.sourceHandle;
  }
  if (value.label !== undefined) {
    if (typeof value.label !== "string") {
      issues.push({
        severity: "error",
        path: `${path}.label`,
        message: "Edge label must be a string.",
      });
      return null;
    }
    edge.label = value.label;
  }
  return edge;
}

function readViewport(value: unknown, issues: GraphIssue[]): Viewport | null {
  if (
    !isRecord(value) ||
    typeof value.x !== "number" ||
    typeof value.y !== "number" ||
    typeof value.zoom !== "number" ||
    value.zoom <= 0
  ) {
    issues.push({
      severity: "error",
      path: "viewport",
      message: "Viewport x, y, and zoom are required.",
    });
    return null;
  }
  return { x: value.x, y: value.y, zoom: value.zoom };
}

function readPosition(value: unknown, issues: GraphIssue[], path: string): Position | null {
  if (!isRecord(value) || typeof value.x !== "number" || typeof value.y !== "number") {
    issues.push({
      severity: "error",
      path,
      message: "Position must include x and y.",
    });
    return null;
  }
  return { x: value.x, y: value.y };
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }
  return value;
}

function isOnError(value: unknown): value is OnError {
  return typeof value === "string" && ON_ERROR.some((item) => item === value);
}

function isRuntimeKind(value: unknown): value is RuntimeKind {
  return typeof value === "string" && RUNTIMES.some((item) => item === value);
}

function isSandbox(value: unknown): value is SandboxProfile {
  return typeof value === "string" && SANDBOXES.some((item) => item === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
}
