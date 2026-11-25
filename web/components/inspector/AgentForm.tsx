import { isJsonSchema, validateGraph, type AgentNode, type OnError } from "@ai-agents/graph";
import { useState } from "react";

import { useGraphStore } from "@/lib/graph/store";

import { IssueList } from "./IssueList";

const fieldClass =
  "rounded-md border border-border bg-canvas px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:text-text-muted";

type AgentFormProps = {
  node: AgentNode;
};

export function AgentForm({ node }: AgentFormProps) {
  const doc = useGraphStore((state) => state.doc);
  const replaceNode = useGraphStore((state) => state.replaceNode);
  const [schemaText, setSchemaText] = useState(schemaSource(node));
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaNodeId, setSchemaNodeId] = useState(node.id);
  const issues = validateGraph(doc).filter((issue) => issue.nodeId === node.id);
  if (schemaNodeId !== node.id) {
    setSchemaNodeId(node.id);
    setSchemaText(schemaSource(node));
    setSchemaError(null);
  }

  function commit(next: AgentNode) {
    replaceNode(next);
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
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Model
        <input
          className={fieldClass}
          value={node.model}
          onChange={(event) => commit({ ...node, model: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        System prompt
        <textarea
          className={`${fieldClass} min-h-24`}
          value={node.systemPrompt}
          onChange={(event) => commit({ ...node, systemPrompt: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Temperature
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {node.temperature.toFixed(1)}
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={node.temperature}
          onChange={(event) => commit({ ...node, temperature: Number(event.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Max tokens
        <input
          className={fieldClass}
          type="number"
          min={1}
          step={1}
          value={node.maxTokens}
          onChange={(event) => {
            const maxTokens = Number(event.target.value);
            if (Number.isInteger(maxTokens)) {
              commit({ ...node, maxTokens });
            }
          }}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Output schema
        <textarea
          className={`${fieldClass} min-h-24 font-mono`}
          value={schemaText}
          aria-invalid={schemaError ? true : undefined}
          onChange={(event) => setSchemaText(event.target.value)}
          onBlur={() => {
            if (schemaText.trim().length === 0) {
              setSchemaError(null);
              const next = { ...node };
              delete next.outputSchema;
              commit(next);
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(schemaText);
            } catch {
              setSchemaError("Output schema must be valid JSON.");
              return;
            }
            if (!isJsonSchema(parsed)) {
              setSchemaError("Output schema must be a JSON object.");
              return;
            }
            setSchemaError(null);
            commit({ ...node, outputSchema: parsed });
          }}
        />
      </label>
      {schemaError ? (
        <p className="text-sm text-danger" role="alert">
          Error: {schemaError}
        </p>
      ) : null}
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

function schemaSource(node: AgentNode): string {
  return node.outputSchema ? JSON.stringify(node.outputSchema, null, 2) : "";
}

export function ErrorAndTimeout({
  onError,
  timeoutMs,
  onErrorChange,
  onTimeoutChange,
}: {
  onError: OnError;
  timeoutMs: number;
  onErrorChange: (value: OnError) => void;
  onTimeoutChange: (value: number) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        On error
        <select
          className={fieldClass}
          value={onError}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "retry" || value === "escalate" || value === "continue") {
              onErrorChange(value);
            }
          }}
        >
          <option value="retry">Retry</option>
          <option value="escalate">Escalate</option>
          <option value="continue">Continue</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Timeout (ms)
        <input
          className={fieldClass}
          type="number"
          min={1}
          step={1}
          value={timeoutMs}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next)) {
              onTimeoutChange(next);
            }
          }}
        />
      </label>
    </>
  );
}
