export type PaletteDrag =
  | { kind: "agent" }
  | { kind: "runtime"; runtime: "python" | "node" };

export function readPaletteDrag(raw: string): PaletteDrag | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return null;
  }
  if (value.kind === "agent") {
    return { kind: "agent" };
  }
  if (
    value.kind === "runtime" &&
    "runtime" in value &&
    (value.runtime === "python" || value.runtime === "node")
  ) {
    return { kind: "runtime", runtime: value.runtime };
  }
  return null;
}
