import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function EdgePill({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const text = typeof label === "string" ? label : "";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--edge-active)" : "var(--edge)",
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      {text ? (
        <EdgeLabelRenderer>
          <span
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className="nodrag nopan absolute rounded-md border border-border bg-elevated px-1.5 py-0.5 text-xs text-foreground"
          >
            {text}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
