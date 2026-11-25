import { runtimePreset, validateGraph, type RuntimeKind, type RuntimeNode } from "@ai-agents/graph";
import { useEffect, useState } from "react";

import { useGraphStore } from "@/lib/graph/store";

import { ErrorAndTimeout } from "./AgentForm";
import { IssueList } from "./IssueList";

const fieldClass =
  "rounded-md border border-border bg-canvas px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:text-text-muted";

type RuntimeFormProps = {
  node: RuntimeNode;
};

export function RuntimeForm({ node }: RuntimeFormProps) {
  const doc = useGraphStore((state) => state.doc);
  const replaceNode = useGraphStore((state) => state.replaceNode);
  const issues = validateGraph(doc).filter((issue) => issue.nodeId === node.id);
  const [dependencies, setDependencies] = useState(node.dependencies.join("\n"));
  const [envKeys, setEnvKeys] = useState(node.envKeys.join("\n"));
  const [tools, setTools] = useState(node.tools.join("\n"));

  useEffect(() => {
    setDependencies(node.dependencies.join("\n"));
    setEnvKeys(node.envKeys.join("\n"));
    setTools(node.tools.join("\n"));
  }, [node.id, node.dependencies, node.envKeys, node.tools]);

  function commit(next: RuntimeNode) {
    replaceNode(next);
  }

  function chooseRuntime(runtime: RuntimeKind) {
    const previous = runtimePreset(node.runtime);
    const next = runtimePreset(runtime);
    commit({
      ...node,
      runtime,
      version: next.version,
      title: node.title === previous.title ? next.title : node.title,
      entry: node.entry === previous.entry ? next.entry : node.entry,
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Title
        <input
          className={fieldClass}
          value={node.title}
          onChange={(event) => commit({ ...node, title: event.target.value })}
        />
      </label>
      <div className="flex flex-col gap-2 text-sm text-foreground">
        Runtime
        <div className="flex gap-2" role="group" aria-label="Runtime">
          <RuntimeChoice
            pressed={node.runtime === "python"}
            onClick={() => chooseRuntime("python")}
          >
            Python
          </RuntimeChoice>
          <RuntimeChoice pressed={node.runtime === "node"} onClick={() => chooseRuntime("node")}>
            Node.js
          </RuntimeChoice>
        </div>
        <p className="text-xs text-muted-foreground">Version {node.version}</p>
      </div>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Entry command
        <input
          className={`${fieldClass} font-mono`}
          value={node.entry}
          onChange={(event) => commit({ ...node, entry: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Working directory
        <input
          className={fieldClass}
          value={node.workingDirectory}
          onChange={(event) => commit({ ...node, workingDirectory: event.target.value })}
        />
      </label>
      <ListField
        label="Dependencies"
        value={dependencies}
        onChange={setDependencies}
        onBlur={() => commit({ ...node, dependencies: lines(dependencies) })}
      />
      <ListField
        label="Environment variable keys"
        value={envKeys}
        onChange={setEnvKeys}
        onBlur={() => commit({ ...node, envKeys: lines(envKeys) })}
      />
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Sandbox profile
        <select
          className={fieldClass}
          value={node.sandbox}
          onChange={(event) => {
            const sandbox = event.target.value;
            if (sandbox === "strict" || sandbox === "network" || sandbox === "open") {
              commit({ ...node, sandbox });
            }
          }}
        >
          <option value="strict">Strict</option>
          <option value="network">Network</option>
          <option value="open">Open</option>
        </select>
      </label>
      <ListField
        label="Tools"
        value={tools}
        onChange={setTools}
        onBlur={() => commit({ ...node, tools: lines(tools) })}
      />
      <ErrorAndTimeout
        onError={node.onError}
        timeoutMs={node.timeoutMs}
        onErrorChange={(onError) => commit({ ...node, onError })}
        onTimeoutChange={(timeoutMs) => commit({ ...node, timeoutMs })}
      />
      <IssueList issues={issues} />
    </form>
  );
}

function RuntimeChoice({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-2 text-sm enabled:hover:bg-elevated ${
        pressed ? "border-accent bg-accent-soft text-foreground" : "border-border text-foreground"
      }`}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ListField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-foreground">
      {label}
      <textarea
        className={`${fieldClass} min-h-16 font-mono`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
