# AI Agents Builder

Multi-agent workflow builder. The product contract is `docs/ai-agents-builder-spec.docx`. Working rules for agents are in `AGENTS.md`.

## Layout

- `src/packages/core`, `src/packages/runtime`, `src/packages/api` — Python workspace (uv)
- `web` — Next.js app
- `apps/worker-bridge` — worker bridge scaffold
- `packages/ui` — design tokens in `src/tokens.css`. shadcn components are added with the CLI
- `packages/graph`, `packages/api-client` — TypeScript packages

Python 3.13 is required. Node.js 22 or newer runs the web workspace. CI uses Node.js 24.

## Python

```bash
uv sync --all-packages --group dev
uv run pytest
```

## Node

```bash
pnpm install
pnpm typecheck
```
