import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(packageRoot, "..", "..");
const tokensPath = join(packageRoot, "src", "tokens.css");
const tokens = readFileSync(tokensPath, "utf8").toLowerCase();

const palette = [
  "#0b0b0f",
  "#14141a",
  "#1c1c24",
  "#26262f",
  "#3a3a47",
  "#f4f4f7",
  "#a1a1b0",
  "#6b6b7b",
  "#6366f1",
  "#818cf8",
  "#312e81",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#3b82f6",
  "#84cc16",
  "#4b5563",
  "#ffffff",
];

const colorPattern = /#[0-9a-fA-F]{3,8}\b|(?:rgb|hsl|hwb|oklch)a?\s*\(/;
const extensions = new Set([".css", ".ts", ".tsx", ".js", ".mjs"]);
const skip = new Set(["node_modules", ".next", "dist", ".turbo"]);

function walk(dir, hits) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (skip.has(entry)) {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, hits);
      continue;
    }
    const dot = entry.lastIndexOf(".");
    if (dot === -1 || !extensions.has(entry.slice(dot))) {
      continue;
    }
    if (full === tokensPath || entry === "tokens.test.mjs") {
      continue;
    }
    const text = readFileSync(full, "utf8");
    if (colorPattern.test(text)) {
      hits.push(relative(repoRoot, full));
    }
  }
}

describe("design tokens", () => {
  it("includes the spec palette", () => {
    for (const hex of palette) {
      assert.ok(tokens.includes(hex), `missing ${hex}`);
    }
    assert.match(tokens, /--background:/);
    assert.match(tokens, /--primary:/);
    assert.match(tokens, /--destructive:/);
    assert.match(tokens, /--ring:/);
    assert.match(tokens, /prefers-reduced-motion:\s*reduce/);
    assert.match(tokens, /inter variable/);
    assert.match(tokens, /jetbrains mono/);
  });

  it("keeps raw colours in tokens.css", () => {
    const hits = [];
    for (const dir of [
      "web",
      "apps",
      "packages/graph",
      "packages/api-client",
      "packages/ui/src",
    ]) {
      walk(join(repoRoot, dir), hits);
    }
    assert.deepEqual(hits, []);
  });
});
