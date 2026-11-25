import type { RuntimeKind } from "@ai-agents/graph";

type RuntimeBadgeProps = {
  runtime: RuntimeKind;
};

export function RuntimeBadge({ runtime }: RuntimeBadgeProps) {
  const tone = runtime === "python" ? "text-runtime-py" : "text-runtime-js";
  const label = runtime === "python" ? "Python" : "Node.js";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-current px-1.5 py-0.5 text-xs ${tone}`}
    >
      <svg viewBox="0 0 16 16" className="size-3 shrink-0" aria-hidden="true">
        <circle cx="8" cy="8" r="4" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}
