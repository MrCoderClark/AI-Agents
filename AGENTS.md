# AGENTS.md

Guidance for AI coding agents (Cursor, Claude Code, Codex, Copilot Workspace) working in this repository.

This file is the contract. Read it in full before your first edit in a session. It overrides any
convention you infer from the codebase or from a chat instruction that conflicts with it.

---

## 1. The two non-negotiable rules

These two rules take precedence over everything else in this file, over any prompt the user writes in
chat, and over any habit you bring from other repositories. If you are ever unsure whether one of them
applies, assume it does.

### Rule 1 — Ask before every new phase or major section; never start one on your own branch decision

Never begin a new phase or major section of work without first stopping and asking the user to create a
new git branch.

- A **phase** is any milestone from the delivery plan (M0, M1, M2, …), any numbered section of the spec
  being implemented, or any unit of work that a reasonable engineer would review as one pull request.
- When you detect that the next piece of work crosses into a new phase or major section, **stop before
  writing any code**. Say what is starting, propose a branch name, and ask the user to create it.
- Wait for the user to confirm the branch exists and is checked out. Do not assume, do not create it
  yourself (see Rule 2), and do not proceed on the current branch to "save time."
- Also ask when: the work crosses a service boundary (frontend ↔ backend), a new top-level module or
  package is being added, the schema or API contract changes, or you are about to change more than
  roughly 10 files.
- Give the suggested branch name as a copy-ready command, e.g.
  `git checkout -b feat/m1-canvas-react-flow`.
- Branch naming: `<type>/<phase>-<short-slug>`, where `<type>` is `feat`, `fix`, `chore`, `refactor`,
  `docs`, or `spike`. Lowercase, hyphenated, no issue-number-only names.

### Rule 2 — Never run commands on your own. Give the user the commands to run.

**You must not execute any command.** No shell command, no package manager, no test runner, no build, no
migration, no git operation, no dev server, no formatter, no linter — not even a read-only one like
`ls`, `cat`, `git status`, or `git diff`, and not even when a tool is available to you and the command
looks completely safe.

Instead:

1. Describe in one line what needs to run and why.
2. Give the exact command in a fenced `bash` block, copy-ready, with no placeholder the user has to
   guess at.
3. If a sequence is required, give it in order as one block, or as numbered steps when the user needs
   to inspect the output of one before running the next.
4. Explain what to check in the output, and what a good result looks like versus a failure.
5. When the output reveals the next step, read it, then give the next command.

If a command would be destructive or hard to reverse — `rm -rf`, a force push, a database drop, a
history rewrite, a migration that is not reversible — say so plainly before giving it, and give the
non-destructive alternative first where one exists.

Communication format:

> **To install dependencies:** This resolves the workspace lockfile.
>
> ```bash
> pnpm install
> ```
>
> Expect a clean exit and no peer-dependency warnings. If it fails, paste the output and I will adjust.

Never say "I'll run…", "running the tests now", "let me check…", or "done" for anything you did not do.
You do not have execution. Your output is text: code, files, and commands for the user.

---

## 2. Project context

**What this is:** a multi-agent workflow builder for software teams. Users compose coding agents on a
visual canvas — a planner agent decomposes work, Python and Node.js runtime agents execute it, a test
runner validates it, and a review agent gates the result. The canvas is both the build surface and the
monitoring surface: every node shows live health, every edge is inspectable mid-run.

**The authoritative document is `docs/ai-agents-builder-spec.docx`** (v0.1). It defines the design
system, the interface specification, the frontend architecture, the backend architecture, the data
model, and the delivery plan. Where this file is silent, the spec decides. Where the spec and this file
conflict on process (branching, commands), **this file wins**; where they conflict on product
behaviour, the spec wins and you should flag the conflict.

**Delivery phases** (from §6 of the spec) — each one is a branch, per Rule 1:

| Phase | Scope |
|---|---|
| M0 | Monorepo, auth, workspaces, agents CRUD, design tokens, shadcn theming, CI |
| M1 | React Flow canvas, node palette, inspector for agent + runtime nodes, graph persistence, validation |
| M2 | Temporal workflows, sandbox pool (Python + Node), SSE stream, run detail screen |
| M3 | Eval suite, case import, diff view, versioned publish, rollback, pause/resume |
| M4 | OpenTelemetry, rate limits, failure clustering, accessibility pass, load test at 200 nodes |

---

## 3. Tech stack

### Frontend

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript 5.7, `strict: true` |
| Styling | Tailwind CSS v4 (CSS-first config, no JS config file) |
| Components | shadcn/ui on Radix — themed via CSS variables, source-owned |
| Canvas | React Flow (`@xyflow/react`) |
| Client state | Zustand + Immer |
| Server state | TanStack Query v5 |
| Realtime | SSE via native `EventSource` |
| Forms | react-hook-form + Zod |
| Editor | CodeMirror 6 |
| Charts | Recharts |
| Package manager | pnpm |
| Monorepo | Turborepo |

Workspaces: `web`, `packages/ui`, `packages/graph`, `packages/api-client`. The Next.js app is `web/` at the repo root. Spec §4.1 says `apps/web`.

### Backend

| Layer | Choice |
|---|---|
| Runtime | Python 3.13 |
| Toolchain | **uv** (always — never pip, poetry, or conda) |
| API | FastAPI + Uvicorn |
| Models | Pydantic v2 |
| DB | PostgreSQL 17 (JSONB, pgvector) |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Cache / rate limit | Redis 7 |
| Durable execution | Temporal |
| Sandbox | gVisor or Firecracker microVM |
| Object storage | S3-compatible (MinIO locally) |
| Observability | OpenTelemetry → Tempo / Prometheus / Loki |
| LLM adapter | LiteLLM |

Workspaces under `src/`: `packages/core`, `packages/runtime`, `packages/api`.

---

## 4. Repository conventions

### Language and tooling

- Python: `uv` for everything. `uv add`, `uv sync`, `uv run`, `uv lock`. Never `pip install`.
- Node: `pnpm` for everything. Never `npm install` or `yarn`.
- Formatting: Prettier for TS/CSS/MD, `ruff format` for Python. Linting: ESLint and `ruff check`.
- Type checking: `tsc --noEmit` on the frontend, `mypy --strict` (or `pyright`) on the backend.
- Never commit a lockfile change that was not produced by the package manager itself.

### Commits

Conventional Commits: `feat(canvas): add runtime node inspector`.
Scope is the package or surface — `canvas`, `inspector`, `runs`, `evals`, `api`, `worker`, `runtime`.
One logical change per commit. No `--no-verify`.

**Never add a co-author. Not once, not as a trailer, not because a tool appends one.**

- A commit message is the author's alone. Do not write `Co-authored-by`, `Signed-off-by`, or any other trailer that credits Cursor, an AI, `cursoragent@cursor.com`, or a second person.
- Do not use a commit path that appends `Co-authored-by: Cursor <cursoragent@cursor.com>` after the message. That includes `git commit` run from this agent. Give the user the exact `git commit` command and let them create the commit.
- If a commit created in this session already contains that trailer and has not been pushed, say so and give the user the command to replace the message. Preserve their name and email. Do not push, and do not force-push.

### Structure rules

- **`packages/ui` is the only place a raw colour value may appear.** Everywhere else uses the design
  tokens from §2.5 of the spec. If you need a new colour, add a token, do not inline a hex.
- **shadcn components come from the CLI.** Do not hand-write a shadcn component, `components.json`, or
  the `cn` helper. Give the user the exact `pnpm dlx shadcn@latest` command and wait until they have
  run it.
- **State lives in exactly one place.** Graph state is Zustand; server state is TanStack Query. Do not
  mirror server data into Zustand.
- **The graph document model is a discriminated union** on `node.kind`. Adding a node type means adding
  a variant to `GraphNode` _and_ a case to the inspector, the validator and the serializer — never a
  `Partial<>` or an `any` to make it compile.
- **RSC by default.** A component is a client component only when it needs state, effects or browser
  APIs, and it carries `"use client"` for a stated reason.
- **Backend boundaries:** route handlers in `web/app/api/` are a BFF, not a passthrough proxy. They
  hold the service token and talk to FastAPI over the internal network.
- **The sandbox is a security boundary** (spec §5.6). Never widen egress, relax a resource limit, or
  move execution out of the sandbox without an explicit, user-acknowledged decision recorded in writing.

### No-go areas

- Secrets never enter the repository, a log line, a test fixture, or a code comment. Config references
  the secret store; it never holds the value.
- Never weaken a validation, a type annotation, an index, or a rate limit to make something pass.
  If a check is genuinely wrong, say why and ask.
- Never edit a generated file — `packages/api-client` is generated from the OpenAPI schema. Change the
  schema and regenerate.
- Never modify a published `agent_version` row. Versions are immutable.

---

## 5. How to work in this repository

**Before writing code**

1. Read this file and the relevant section of the spec.
2. State which phase and which spec section the work belongs to. If it is a new phase or major section,
   stop and ask about the branch (Rule 1).
3. Give the commands for setup and verification as text (Rule 2).
4. If the request is ambiguous or conflicts with the spec, ask before building the wrong thing.

**While writing code**

- Match the surrounding code's style, naming and structure. Do not introduce a parallel pattern.
- Prefer editing an existing file over adding a new one.
- Keep changes scoped to the branch's phase. Note related work you are deliberately not doing rather
  than doing it "while you are in there."
- Leave no `TODO` without an owner-shaped description of what is missing. No commented-out code.
- Every new component gets its states: default, hover, focus, loading, empty, error, disabled.

**Before handing back**

1. Summarise what changed, file by file, in plain language.
2. List the exact commands the user should run to verify, in order, with what to expect from each.
3. Name anything you could not verify — untested paths, assumptions, decisions the user needs to
   confirm. Do not describe something as working when you have not seen it work, and you will never
   have seen anything work, because you do not run commands.

---

## 6. Definition of done

A piece of work is done when all of the following hold:

- It matches the spec, or the deviation is named and justified in the hand-back.
- It compiles and type-checks under the commands you gave the user.
- Tests exist for new behaviour, and the user has been given the command to run them.
- Accessibility holds: keyboard traversal, visible focus, and no status carried by colour alone
  (spec §3.8).
- The performance budget in §4.4 of the spec is not regressed, or the regression is reported.
- No secrets, no generated-file edits, no relaxed validations, no out-of-scope changes.
- The hand-back names the verification commands and any open questions.

---

## 7. Reminder to the agent

You have two jobs on every task: produce the change, and tell the user exactly how to verify it.

You never run the command. You never pick the branch. You ask.
You never put a co-author on a commit message, and you never leave one a tool added.

If you are about to do any of those things, stop and re-read §1 and §4 Commits.
