import { useRef } from "react";

import type { PaletteDrag } from "@/lib/graph/drag";
import { useGraphStore } from "@/lib/graph/store";

type PaletteItem = {
  id: string;
  label: string;
  shortLabel: string;
  enabled: boolean;
  reason?: string;
  drag?: PaletteDrag;
};

type PaletteGroup = {
  id: string;
  label: string;
  items: PaletteItem[];
};

const GROUPS: PaletteGroup[] = [
  {
    id: "runtimes",
    label: "Runtimes",
    items: [
      {
        id: "python",
        label: "Python 3.13",
        shortLabel: "Py",
        enabled: true,
        drag: { kind: "runtime", runtime: "python" },
      },
      {
        id: "node",
        label: "Node.js 24",
        shortLabel: "JS",
        enabled: true,
        drag: { kind: "runtime", runtime: "node" },
      },
    ],
  },
  {
    id: "models",
    label: "Models",
    items: [
      {
        id: "agent",
        label: "Agent",
        shortLabel: "Ag",
        enabled: true,
        drag: { kind: "agent" },
      },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      {
        id: "tool",
        label: "Tool",
        shortLabel: "Tl",
        enabled: false,
        reason: "Tool nodes are not on the canvas yet.",
      },
    ],
  },
  {
    id: "logic",
    label: "Logic",
    items: [
      {
        id: "branch",
        label: "Branch",
        shortLabel: "Br",
        enabled: false,
        reason: "Branch nodes are not on the canvas yet.",
      },
      {
        id: "loop",
        label: "Loop",
        shortLabel: "Lo",
        enabled: false,
        reason: "Loop nodes are not on the canvas yet.",
      },
    ],
  },
  {
    id: "memory",
    label: "Memory",
    items: [
      {
        id: "memory",
        label: "Memory",
        shortLabel: "Me",
        enabled: false,
        reason: "Memory nodes are not on the canvas yet.",
      },
    ],
  },
  {
    id: "output",
    label: "Output",
    items: [
      {
        id: "output",
        label: "Output",
        shortLabel: "Out",
        enabled: false,
        reason: "Output nodes are not on the canvas yet.",
      },
    ],
  },
];

type PaletteProps = {
  onAdd: (drag: PaletteDrag) => void;
};

export function Palette({ onAdd }: PaletteProps) {
  const collapsed = useGraphStore((state) => state.paletteCollapsed);
  const togglePalette = useGraphStore((state) => state.togglePalette);
  const dragged = useRef(false);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-surface p-3 transition-[width] duration-palette ${
        collapsed ? "w-14" : "w-[220px]"
      }`}
      aria-label="Node palette"
    >
      <button
        className="rounded-md border border-border px-2 py-2 text-xs text-foreground enabled:hover:bg-elevated"
        type="button"
        aria-expanded={!collapsed}
        onClick={togglePalette}
      >
        {collapsed ? "Open" : "Collapse"}
      </button>
      {GROUPS.map((group) => (
        <section key={group.id} className="flex flex-col gap-2">
          {collapsed ? null : (
            <h2 className="text-xs font-medium text-muted-foreground">{group.label}</h2>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  className="w-full rounded-md border border-border px-2 py-2 text-left text-sm text-foreground enabled:hover:bg-elevated disabled:cursor-not-allowed disabled:text-text-muted"
                  type="button"
                  draggable={item.enabled}
                  disabled={!item.enabled}
                  title={item.reason}
                  aria-label={item.label}
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    if (item.drag) {
                      onAdd(item.drag);
                    }
                  }}
                  onDragStart={(event) => {
                    if (!item.drag) {
                      return;
                    }
                    dragged.current = true;
                    const raw = JSON.stringify(item.drag);
                    event.dataTransfer.setData("application/x-graph-node", raw);
                    event.dataTransfer.setData("text/plain", raw);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  {collapsed ? item.shortLabel : item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
