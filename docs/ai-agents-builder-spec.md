**AI Agents Builder**

Technical Specification --- UI/UX, Frontend & Backend

  -----------------------------------------------------------------------
  **Field**       **Value**
  --------------- -------------------------------------------------------
  Document        AI Agents Builder --- Technical Specification

  Version         0.1 (draft for review)

  Date            23 November 2026

  Scope           Design system, frontend architecture, backend
                  architecture, agent runtime, deployment

  Stack           Next.js 16, React 19, TypeScript, Tailwind CSS v4,
  (frontend)      shadcn/ui, React Flow, Zustand, TanStack Query

  Stack (backend) Python 3.13, uv, FastAPI, Pydantic v2, PostgreSQL 17,
                  Redis 7, Temporal
  -----------------------------------------------------------------------

# 1. Product summary

This document specifies a multi-agent workflow builder for software
teams. Users compose coding agents on a visual canvas: a planner agent
decomposes work, Python and Node.js runtime agents execute it, a test
runner validates it, and a review agent gates the result. The canvas is
simultaneously the build surface and the monitoring surface --- every
node shows its own live health, and every edge can be inspected mid-run.

The primary interaction model is the flow canvas shown in the approved
mockup: a dotted-grid node graph in a dark theme, a left palette rail
organised by Runtimes, Tools, Logic, Memory and Output, and a right
inspector panel whose fields change with the selected node type.

**Non-goals for v1:** general-purpose non-coding agents, a marketplace,
on-premise deployment, and multi-tenant billing. Each is a v2 candidate
and is deliberately excluded from scope here.

# 2. Design system

The design system is the contract between design and frontend. Every
value below maps to a Tailwind theme token; no component may hard-code a
colour, radius or spacing value.

## 2.1 Colour

Dark-first. The builder is an all-day tool, and the canvas dominates the
eye; a dark surface reduces glare and lets node status colours carry
meaning at low saturation.

  -------------------------------------------------------------------------
  **Token**           **Value**   **Use**
  ------------------- ----------- -----------------------------------------
  \--bg-canvas        #0B0B0F     App background

  \--bg-surface       #14141A     Panels, rails, cards

  \--bg-elevated      #1C1C24     Node cards, popovers, menus

  \--border-subtle    #26262F     Hairline panel and card borders

  \--border-strong    #3A3A47     Focused inputs, selected node outline

  \--text-primary     #F4F4F7     Headings, node titles

  \--text-secondary   #A1A1B0     Body, labels, subtitles

  \--text-muted       #6B6B7B     Placeholders, timestamps, disabled

  \--accent           #6366F1     Primary actions, selection, active nav

  \--accent-hover     #818CF8     Hover on accent

  \--accent-soft      #312E81     Accent-tinted backgrounds, badges

  \--success          #34D399     Run succeeded, node healthy

  \--warning          #FBBF24     Node warning badge, degraded eval

  \--danger           #F87171     Run failed, validation error

  \--runtime-python   #3B82F6     Python runtime badge

  \--runtime-node     #84CC16     Node.js runtime badge

  \--edge-default     #4B5563     Connector lines at rest

  \--edge-active      #6366F1     Edge currently carrying a run
  -------------------------------------------------------------------------

Contrast floor: text at 14 px or below must meet WCAG AA (4.5:1) against
its surface. The status colours are decorative on their own --- every
status is also carried by an icon shape and a text label, so colour is
never the sole signal.

## 2.2 Type scale

  ---------------------------------------------------------------------------
  **Token**   **Size /         **Weight**   **Use**
              line-height**                 
  ----------- ---------------- ------------ ---------------------------------
  text-2xs    10 / 14 px       500          Node subtitle, badges, edge pills

  text-xs     12 / 16 px       400          Panel labels, table cells,
                                            metadata

  text-sm     13 / 20 px       400          Body copy, inspector fields

  text-base   14 / 22 px       400          Primary UI text

  text-lg     16 / 24 px       600          Panel section titles

  text-xl     20 / 28 px       600          Page titles

  text-3xl    30 / 36 px       700          Agent name in canvas toolbar
  ---------------------------------------------------------------------------

Interface type: Inter, self-hosted as a variable font (no Google Fonts
request --- it costs a round trip and leaks a referrer). Code, node
identifiers, tool slugs and trace payloads: JetBrains Mono, self-hosted,
ligatures disabled. Numeric columns use tabular-nums so digits align in
trace and eval tables.

## 2.3 Spacing, radius, elevation

- **Spacing ---** 4 px base unit. Permitted steps: 4, 8, 12, 16, 20, 24,
  32, 40, 48. Nothing else.

- **Radius ---** 6 px for inputs, buttons and node cards; 10 px for
  panels and popovers; 14 px for modal shells; 9999 px for status pills
  and runtime chips.

- **Elevation ---** Three levels only. e1: 0 1px 2px rgba(0,0,0,.4) for
  cards at rest. e2: 0 4px 12px rgba(0,0,0,.5) for menus and popovers.
  e3: 0 16px 40px rgba(0,0,0,.6) for modals and the command palette. No
  elevation on the canvas grid.

- **Borders ---** One pixel, \--border-subtle. Panels are separated by a
  hairline, not by a shadow.

## 2.4 Motion

  --------------------------------------------------------------------------
  **Interaction**               **Duration**   **Easing**
  ----------------------------- -------------- -----------------------------
  Hover, focus, colour change   120 ms         ease-out

  Panel open / collapse         180 ms         cubic-bezier(.2,0,0,1)

  Node drag settle, edge        240 ms         cubic-bezier(.2,0,0,1)
  routing                                      

  Run animation along an edge   600 ms         linear

  Command palette in / out      160 ms         cubic-bezier(.2,0,0,1)
  --------------------------------------------------------------------------

All motion is suppressed under prefers-reduced-motion: reduce, including
the run animation --- a run then displays as a static highlight on the
active edge rather than a moving pulse.

## 2.5 Design tokens vs. shadcn variables

shadcn/ui components read a standard set of CSS custom properties.
Rather than maintaining two parallel token sets, we map the product
palette onto those variables in globals.css. This keeps every shadcn
component on-brand with no per-component overrides.

> :root {\
> \--background: 240 12% 4%; /\* \--bg-canvas #0B0B0F \*/\
> \--card: 240 10% 9%; /\* \--bg-surface #14141A \*/\
> \--popover: 240 10% 12%; /\* \--bg-elevated #1C1C24 \*/\
> \--border: 240 10% 16%; /\* \--border-subtle #26262F \*/\
> \--input: 240 10% 16%;\
> \--primary: 239 84% 67%; /\* \--accent #6366F1 \*/\
> \--primary-foreground: 0 0% 100%;\
> \--muted-foreground: 240 8% 66%; /\* \--text-secondary #A1A1B0 \*/\
> \--destructive: 0 91% 71%; /\* \--danger #F87171 \*/\
> \--ring: 239 84% 67%;\
> \--radius: 0.375rem; /\* 6px \*/\
> }\
> \
> /\* product-specific tokens layered on top \*/\
> \@theme {\
> \--color-canvas: #0B0B0F;\
> \--color-surface: #14141A;\
> \--color-elevated: #1C1C24;\
> \--color-edge: #4B5563;\
> \--color-edge-active: #6366F1;\
> \--color-runtime-py: #3B82F6;\
> \--color-runtime-js: #84CC16;\
> \--font-sans: \"Inter Variable\", ui-sans-serif, system-ui;\
> \--font-mono: \"JetBrains Mono\", ui-monospace, monospace;\
> }

# 3. Interface specification

Five surfaces. Each is specified as a component tree with its states,
its data contract and its keyboard behaviour.

## 3.1 Agents list (/agents)

The landing view. A grid of agent cards, one per agent, each carrying
the three things a user scans for: whether it is live, whether it is
working, and when it was last touched.

- **Layout ---** Grid: responsive 1 / 2 / 3 / 4 columns at sm / md / lg
  / xl. Card min-width 280 px.

- **Card contents ---** Status dot + status word, agent name, short
  description (one line, truncated), runs per day, success rate over the
  last 24 h as a thin sparkline, relative edited time, runtime chips for
  the runtimes the graph uses.

- **Toolbar ---** Search input filtering on name and description; a
  status filter (All / Live / Draft / Paused); sort by edited, runs,
  success rate.

- **Empty state ---** Empty state offers three templates and one
  \'describe your agent\' entry point --- never a bare \'no agents
  yet\'.

  ------------------------------------------------------------------------
  **Component**   **shadcn         **Notes**
                  primitive**      
  --------------- ---------------- ---------------------------------------
  AgentCard       Card + Badge     Whole card is a link; inner menu button
                                   stops propagation

  StatusDot       custom           Four states: live, draft, paused, error

  Sparkline       custom (SVG)     24 points, no axes, no tooltip

  RuntimeChip     Badge            variant=python \| node, monospace label

  SearchBar       Input + Command  Cmd+K opens the global palette instead
                                   of a local search
  ------------------------------------------------------------------------

## 3.2 Canvas (/agents/\[id\])

The core surface, and the one the approved mockup depicts. Three fixed
regions; the canvas never becomes modal and the graph stays visible
while any node is configured.

### Region A --- Palette rail (left, 220 px, collapsible to 56 px)

- Runtimes --- Python 3.13, Node.js 24. Dragging one onto the canvas
  creates a runtime agent node with that runtime preset.

- Models --- the models the workspace has credentials for.

- Tools --- MCP servers and built-in tools, grouped, with a search field
  once the list exceeds ten.

- Logic --- Branch, Loop, Map, Human approval.

- Memory --- Conversation, Vector store, Scratchpad.

- Output --- Structured output, Webhook, Return.

Each palette item is a draggable source. Items the workspace cannot use
(a tool with no credential configured) render disabled with a tooltip
naming what is missing.

### Region B --- Canvas (centre, flex-1)

  -----------------------------------------------------------------------
  **Element**    **Behaviour**
  -------------- --------------------------------------------------------
  Grid           20 px dot grid at 8% opacity; pans and zooms with the
                 viewport

  Node card      Title, status dot, one-line subtitle, tool tags for
                 agent nodes, optional warning badge

  Runtime badge  Coloured chip on agent nodes; blue Python, lime Node.js

  Connector      Cubic bezier, 1.5 px, arrowhead at target; 2 px and
                 accent-coloured when carrying an active run

  Edge pill      Small label on the edge at its midpoint, e.g. \'diff\',
                 \'tickets\', \'fail\'

  Selection      2 px accent outline plus a soft accent glow;
                 multi-select via shift-drag marquee

  Toolbar        Agent name (inline-editable), branch selector, Test
                 button, Publish button

  Minimap        Bottom-right, 160 × 100 px, toggleable, hidden below 900
                 px viewport width

  Controls       Bottom-left: zoom out, zoom percentage, zoom in,
                 fit-to-view, lock
  -----------------------------------------------------------------------

**Library:** React Flow (@xyflow/react). It supplies pan, zoom, marquee
selection, edge routing, custom node and edge renderers, and a minimap.
Reimplementing that surface is a multi-month detour with no product
differentiation.

### Region C --- Inspector (right, 320 px, collapsible)

A single panel whose contents are a discriminated union keyed on the
selected node type. This is the pattern that keeps the canvas
uncluttered: one panel, five schemas.

  -----------------------------------------------------------------------
  **Node type** **Inspector fields**
  ------------- ---------------------------------------------------------
  Agent (model) Model select, System prompt (textarea, expandable to
                full-height editor), Temperature slider, Max tokens,
                Output schema (JSON editor), On error (Retry \| Escalate
                \| Continue), Timeout

  Runtime agent Runtime segmented control (Python \| Node.js), Entry
                command, Working directory, Dependencies (managed via uv
                or npm), Environment variable keys, Sandbox profile, Tool
                list (checked rows)

  Tool          Tool slug, Auth status with a Connect action, Parameter
                mapping rows (source → tool argument), Rate limit,
                Timeout, Retry policy

  Branch        Condition builder rows, Default path selector

  Loop / Map    Iterable source, Concurrency limit, Exit condition,
                Aggregation strategy

  Human         Approver (user or role), Message template, Escalation
  approval      timeout, Timeout action

  Memory        Scope (run \| agent \| workspace), Store selector,
                Retention days, Read/write mode

  Output        Schema (JSON editor with validation), Webhook URL,
                Signing secret
  -----------------------------------------------------------------------

When no node is selected the inspector shows graph-level settings:
default model, global timeout, error notification target, concurrency
ceiling.

## 3.3 Run detail (/agents/\[id\]/runs/\[runId\])

The screen a user opens most often. Master--detail: a step list on the
left, the selected step\'s full detail on the right.

- Run header: run id (copyable), status pill, total duration, total
  cost, trigger source, version.

- Step list: index, node name, status icon, duration, a warning marker
  where the step retried or was slow. Steps are clickable and drive the
  detail pane.

- Detail pane, tabbed: Input, Output, Logs, Timing. Input and Output
  render JSON in a collapsible tree with a raw toggle; long strings
  truncate with an expand affordance.

- Run history strip beneath the step list: the previous ten runs with
  status and duration, and failing runs annotated with a \'same error as
  #NNNN\' marker when their error signature matches.

**Failure clustering is the highest-value feature on this screen.** A
user reading traces one at a time never spots the pattern; grouping runs
by error signature lets them fix a class of bug in one pass. Signature =
hash of (node id, error type, normalised message with ids and numbers
stripped).

## 3.4 Evals (/agents/\[id\]/evals)

- Case table: input, expected output, actual output, pass/fail, latency,
  cost. Failing cases group by theme, with the theme name rendered as a
  section header.

- Suite header: pass count over total with a progress bar, last run
  time, the version the run was pinned to, and total suite duration.

- Actions: run suite, add case, import cases from a CSV or from a
  selection of recent runs, promote a production run into a case.

- Diff view: clicking a failing case opens expected vs. actual side by
  side, with a tree diff for structured outputs.

Publishing is gated on evals. If a graph has no suite, the Publish
button reads \'Add 5 test cases\' and opens a prefilled suite generated
from the user\'s recent test runs. If a suite exists and is below its
configured threshold, Publish opens a confirmation naming the failing
cases.

## 3.5 Command palette and global chrome

- Cmd/Ctrl+K opens the palette: navigate to any agent, run an agent, add
  a node to the current canvas, open the current agent\'s runs or evals,
  toggle theme.

- Left icon rail (48 px): agents, runs, evals, tools, settings. Keyboard
  shortcut hints on hover.

- Top bar: workspace switcher, breadcrumb, environment indicator (dev \|
  staging \| prod), avatar menu.

## 3.6 Keyboard model

  -----------------------------------------------------------------------
  **Keys**              **Action**
  --------------------- -------------------------------------------------
  Cmd/Ctrl + K          Command palette

  Cmd/Ctrl + S          Save graph (autosave also runs every 3 s while
                        dirty)

  Cmd/Ctrl + Enter      Test run from the current selection

  Space + drag          Pan the canvas

  Shift + drag          Marquee select

  Cmd/Ctrl + D          Duplicate selected node

  Delete / Backspace    Delete selection (undoable)

  Cmd/Ctrl + Z /        Undo / redo, 100 steps
  Shift+Z               

  Cmd/Ctrl + .          Collapse or expand the inspector

  1 / 2 / 3             Zoom to 50% / 100% / fit
  -----------------------------------------------------------------------

## 3.7 State, loading and error conventions

- Navigation and workspace data load instantly; only panel contents may
  show skeletons. Never a full-page spinner after first paint.

- Skeletons mirror the final layout\'s shape and count, never a generic
  grey block.

- Optimistic updates for node moves, renames, prompt edits and eval-case
  edits, with rollback plus a toast on failure.

- Toasts bottom-right, 4 s, max three stacked, each with an action where
  one exists (Retry, Undo, View trace).

- Errors inline where the field is, not modal. A node with a validation
  error carries a badge on the canvas and a jump-to-it entry in the
  publish confirmation.

- Every destructive action is reversible for 10 s via an undo toast
  rather than a confirmation dialog.

## 3.8 Accessibility

- Full keyboard traversal of the canvas: Tab moves between nodes, arrow
  keys move along edges, Enter opens the inspector.

- The canvas exposes an ARIA tree mirror of the graph so a screen reader
  gets the structure the pixels carry; the tree is the canonical
  accessibility surface and stays in sync on every graph mutation.

- Focus is always visible: 2 px accent ring at 2 px offset, never
  suppressed.

- Every status is icon + text + colour. Colour-blind simulation
  (deuteranopia, protanopia) is part of the component review checklist.

- Escape closes any overlay and returns focus to the element that opened
  it.

# 4. Frontend architecture

## 4.1 Stack

  -------------------------------------------------------------------------
  **Layer**    **Choice**          **Why**
  ------------ ------------------- ----------------------------------------
  Framework    Next.js 16 (App     Server Components for shell and lists,
               Router)             client components only where
                                   interactive; route handlers for BFF
                                   endpoints; streaming built in

  Language     TypeScript 5.7,     Discriminated unions carry the node and
               strict              event models

  Styling      Tailwind CSS v4     CSS-first config, native cascade layers,
                                   no JS config file

  Components   shadcn/ui on Radix  Source-owned primitives, accessible by
                                   default, themed through the token
                                   mapping in §2.5

  Canvas       React Flow          Pan, zoom, marquee, custom nodes/edges,
               (@xyflow/react)     minimap

  Client state Zustand + Immer     Graph state is a small, hot,
                                   frequently-mutated document store

  Server state TanStack Query v5   Caching, retries, optimistic mutations,
                                   background refetch

  Realtime     SSE via native      One-way run streaming; simpler than
               EventSource         WebSocket and survives proxies

  Forms        react-hook-form +   Zod schemas are shared with the API
               Zod                 client via a generated types package

  Charts       Recharts            Sparklines and cost/latency charts

  Code editor  CodeMirror 6        JSON schema editor, prompt editor,
                                   runtime env editor

  Package      pnpm                Strict, fast, workspace-native
  manager                          

  Monorepo     Turborepo           apps/web, apps/worker-bridge,
                                   packages/ui, packages/graph,
                                   packages/api-client
  -------------------------------------------------------------------------

## 4.2 Rendering strategy

- The app shell, agent list, run list and eval list render on the server
  and stream in. The canvas, inspector, run detail panes and editors are
  client components.

- Data fetching happens in Server Components for initial paint and in
  TanStack Query for everything after. No client component fetches on
  mount what the server could have sent.

- The canvas graph is fetched server-side and handed to React Flow as
  initial state, so the first paint already shows the graph rather than
  an empty grid.

- Route segments use loading.tsx skeletons shaped like their content;
  there is no global loading indicator.

## 4.3 The graph document model

One shape, shared by the canvas, the inspector, the validator and the
API client. The discriminated union is what makes the inspector a
five-schema panel instead of five components.

> type NodeKind =\
> \| \"agent\" \| \"runtime\" \| \"tool\" \| \"branch\"\
> \| \"loop\" \| \"approval\" \| \"memory\" \| \"output\";\
> \
> interface BaseNode {\
> id: string; // nanoid, stable across versions\
> kind: NodeKind;\
> title: string;\
> position: { x: number; y: number };\
> onError: \"retry\" \| \"escalate\" \| \"continue\";\
> timeoutMs: number;\
> }\
> \
> interface AgentNode extends BaseNode {\
> kind: \"agent\";\
> model: string;\
> systemPrompt: string;\
> temperature: number;\
> maxTokens: number;\
> outputSchema?: JSONSchema;\
> }\
> \
> interface RuntimeNode extends BaseNode {\
> kind: \"runtime\";\
> runtime: \"python\" \| \"node\"; // drives the badge colour\
> version: string; // \"3.13\" \| \"24\"\
> entry: string; // e.g. \"uv run main.py\"\
> tools: string\[\]; // tool slugs\
> sandbox: \"strict\" \| \"network\" \| \"open\";\
> }\
> \
> type GraphNode = AgentNode \| RuntimeNode \| ToolNode \| BranchNode\
> \| LoopNode \| ApprovalNode \| MemoryNode \| OutputNode;\
> \
> interface Edge {\
> id: string;\
> source: string; target: string;\
> sourceHandle?: string; // \"true\" \| \"false\" for branches\
> label?: string; // the edge pill, e.g. \"diff\"\
> }\
> \
> interface GraphDoc {\
> schemaVersion: 1;\
> nodes: GraphNode\[\];\
> edges: Edge\[\];\
> viewport: { x: number; y: number; zoom: number };\
> }

## 4.4 Performance budget

  -----------------------------------------------------------------------
  **Metric**            **Target**        **Enforcement**
  --------------------- ----------------- -------------------------------
  LCP on the canvas     \< 1.5 s on a     CI Lighthouse check, hard fail
  route                 warm cache        above 2.0 s

  Interaction to next   \< 100 ms         INP field data via web-vitals
  paint                                   

  Node drag frame time  \< 8 ms at 100    Playwright trace assertion in
                        nodes             CI

  Initial JS on the     \< 250 kB gzipped size-limit in CI
  canvas route                            

  Canvas node ceiling   200 nodes per     Validator warning at 150, hard
  (v1)                  graph             block above 200

  Run event latency     \< 150 ms p95     Server-side metric on SSE emit
  (worker → UI)                           
  -----------------------------------------------------------------------

## 4.5 Directory layout

> apps/web/\
> app/\
> (shell)/agents/page.tsx \# RSC list, streams in\
> agents/\[id\]/page.tsx \# RSC fetches graph, hands to \<Canvas/\>\
> agents/\[id\]/runs/\[runId\]/page.tsx\
> agents/\[id\]/evals/page.tsx\
> api/ \# route handlers = BFF, never a proxy to FastAPI\
> runs/\[id\]/stream/route.ts \# SSE relay, sets X-Accel-Buffering: no\
> components/\
> canvas/ Canvas.tsx NodeCard.tsx RuntimeBadge.tsx EdgePill.tsx
> Minimap.tsx\
> inspector/ Inspector.tsx AgentForm.tsx RuntimeForm.tsx ToolForm.tsx\
> run/ StepList.tsx PayloadViewer.tsx RunHistory.tsx\
> eval/ CaseTable.tsx DiffView.tsx\
> lib/\
> graph/ schema.ts validate.ts serialize.ts\
> realtime/ useRunStream.ts\
> packages/ui/ \# design-system components, the only place raw colours
> live\
> packages/graph/ \# graph types + validator, shared with codegen for
> the backend\
> packages/api-client/ \# generated from the OpenAPI schema

# 5. Backend architecture

Python 3.13 managed by uv, FastAPI at the edge, Temporal for durable
execution. The split is deliberate: FastAPI handles request/response
work where a 50 ms answer matters, Temporal handles the agent runs
themselves, which are long, stateful, retryable and must survive a
deploy.

## 5.1 Stack

  ---------------------------------------------------------------------------
  **Layer**       **Choice**          **Why**
  --------------- ------------------- ---------------------------------------
  Runtime         Python 3.13         Task groups, better error messages,
                                      current typing

  Toolchain       uv                  One lockfile, sub-second installs,
                                      resolves the python-build-standalone
                                      interpreter itself

  API             FastAPI + Uvicorn   Async-native, Pydantic-validated,
                                      OpenAPI generated for free

  Models          Pydantic v2         Rust-core validation; the same models
                                      serve requests and serialise events

  DB              PostgreSQL 17       JSONB for graphs and events, pgvector
                                      for memory retrieval, LISTEN/NOTIFY for
                                      cheap fan-out

  ORM             SQLAlchemy 2.0      Typed 2.0 style; migrations under
                  async + Alembic     version control

  Cache / rate    Redis 7             Response cache, run-event fan-out,
  limit                               token-bucket rate limiting

  Durable         Temporal            Agent runs as workflows; retries,
  execution                           timeouts, resumption, and replay after
                                      a crash

  Sandbox         gVisor or           Runtime agents execute generated code
                  Firecracker microVM --- this is the security boundary

  Object storage  S3-compatible       Run artefacts, patches, diffs, large
                  (MinIO locally)     payloads

  Observability   OpenTelemetry →     One trace spans browser → API →
                  Grafana Tempo /     workflow → worker
                  Prometheus / Loki   

  LLM access      LiteLLM as an       One interface over OpenAI, Anthropic,
                  adapter layer       Google and self-hosted endpoints

  Auth            Better Auth on the  Session handling solved in Next.js; a
                  frontend, JWT       stateless verify at the API
                  verified in FastAPI 

  Package layout  src/ with           monorepo: packages/core,
                  pyproject.toml,     packages/runtime, packages/api
                  workspace of        
                  packages            
  ---------------------------------------------------------------------------

## 5.2 Service topology

> ┌──────────────────────┐\
> browser ──HTTP──────▶ │ Next.js (BFF + UI) │\
> ▲ └──────────┬───────────┘\
> │ SSE │ internal HTTP (service token)\
> │ ▼\
> │ ┌──────────────────────┐\
> └────SSE relay─────│ FastAPI (api) │ stateless, N replicas\
> └───┬──────────┬───────┘\
> │ │\
> enqueue │ │ read/write\
> ▼ ▼\
> ┌──────────────┐ ┌─────────────┐ ┌────────────┐\
> │ Temporal │ │ PostgreSQL │◀──│ Redis │\
> └──────┬───────┘ └─────────────┘ └────────────┘\
> │ task queue\
> ▼\
> ┌──────────────────────────────────┐\
> │ Workers (python, autoscaled) │\
> │ planner · runtime · test · review│\
> └───────┬──────────────────────────┘\
> │ exec\
> ▼\
> ┌──────────────────┐\
> │ Sandbox pool │ gVisor / Firecracker\
> │ py3.13 · node24 │\
> └──────────────────┘\
> \
> workers ──publish run events──▶ Redis pub/sub ──▶ FastAPI SSE ──▶
> browser

## 5.3 Request path and the speed budget

The frontend should feel like a local app. That comes from six specific
decisions, not from a faster framework:

1.  **RSC first paint ---** server-rendered first paint, so there is no
    client fetch waterfall on navigation.

2.  **BFF, not direct API calls ---** the browser talks only to Next.js;
    the BFF holds a service token and calls FastAPI over the internal
    network. Halves the round trips and keeps credentials out of the
    client.

3.  **Redis read cache ---** single-flight plus a short TTL on hot reads
    (agent list, graph, last-run summary). Repeated navigation during a
    session hits Redis, not Postgres.

4.  **Debounced autosave ---** the graph saves on a 3 s debounce while
    typing and optimistically in the UI. The user never waits for a
    save.

5.  **Stream everything ---** the UI renders node states as events
    arrive over SSE. A run feels live because each node lights up within
    150 ms of its step starting.

6.  **Fire-and-forget writes ---** writes hit a queue and return 202
    with the optimistic document. The client already shows the result;
    the database catches up behind it.

  -----------------------------------------------------------------------
  **Endpoint**           **Budget     **Strategy**
                         (p95)**      
  ---------------------- ------------ -----------------------------------
  GET /agents            80 ms        Redis cache 30 s, invalidated on
                                      write

  GET /agents/{id}/graph 60 ms        Redis cache, single-flight

  PUT /agents/{id}/graph 120 ms       Optimistic; validates before
                                      persisting

  POST /agents/{id}/runs 150 ms       Enqueue Temporal, return 202 with
                                      run id

  GET /runs/{id}         100 ms       Read model table, denormalised for
                                      display

  GET /runs/{id}/stream  streaming    SSE; first event within 200 ms of
                                      connect
  -----------------------------------------------------------------------

## 5.4 API surface

> \# agents\
> GET /agents -\> AgentSummary\[\]\
> POST /agents -\> Agent\
> GET /agents/{id} -\> Agent\
> PATCH /agents/{id} -\> Agent\
> DELETE /agents/{id}\
> \
> \# graph\
> GET /agents/{id}/graph -\> GraphDoc\
> PUT /agents/{id}/graph -\> GraphDoc \# validates + versions\
> POST /agents/{id}/graph/validate -\> ValidationReport\
> GET /agents/{id}/versions -\> Version\[\]\
> POST /agents/{id}/versions/{v}/rollback -\> GraphDoc\
> \
> \# runs\
> POST /agents/{id}/runs -\> 202 { run_id } \# body: {input, version?}\
> GET /runs/{run_id} -\> RunDetail \# steps folded in\
> GET /runs/{run_id}/stream -\> text/event-stream\
> GET /runs/{run_id}/steps/{step_id} -\> StepDetail\
> POST /runs/{run_id}/cancel -\> 202\
> POST /runs/{run_id}/approve -\> 202 \# human-in-the-loop\
> \
> \# evals\
> GET /agents/{id}/evals -\> EvalSuite\
> POST /agents/{id}/evals/run -\> 202 { run_id }\
> POST /agents/{id}/evals/cases -\> EvalCase\
> POST /agents/{id}/evals/import -\> EvalCase\[\] \# from run ids or
> CSV\
> \
> \# publishing\
> POST /agents/{id}/publish -\> Version \# gated on evals\
> POST /agents/{id}/pause -\> Agent\
> POST /agents/{id}/resume -\> Agent

## 5.5 Streaming contract

Server-Sent Events. One-way is all the canvas needs, EventSource
reconnects on its own, and SSE passes through proxies that buffer
WebSocket upgrades. The Next.js relay sets X-Accel-Buffering: no and
calls res.flush() so no intermediary holds the stream.

> event: step.started\
> data:
> {\"run_id\":\"r_4821\",\"step_id\":\"s_3\",\"node_id\":\"n_billing\",\"node_title\":\"Billing
> lookup\",\"ts\":\"2026-11-23T14:02:11.204Z\"}\
> \
> event: step.delta\
> data: {\"run_id\":\"r_4821\",\"step_id\":\"s_3\",\"text\":\"Looking up
> order A-9912\"}\
> \
> event: step.finished\
> data:
> {\"run_id\":\"r_4821\",\"step_id\":\"s_3\",\"status\":\"ok\",\"duration_ms\":1104,\
> \"tokens\":{\"in\":412,\"out\":88},\"cost_usd\":0.0041,\
> \"output_ref\":\"s3://artefacts/r_4821/s_3.json\"}\
> \
> event: step.failed\
> data:
> {\"run_id\":\"r_4821\",\"step_id\":\"s_4\",\"error\":{\"type\":\"ToolTimeout\",\
> \"message\":\"billing.lookup exceeded
> 30s\"},\"retryable\":true,\"attempt\":1}\
> \
> event: run.finished\
> data:
> {\"run_id\":\"r_4821\",\"status\":\"success\",\"duration_ms\":2287,\"cost_usd\":0.0049}\
> \
> event: ping\
> data: {}

Large payloads travel by reference: an event carries a node id and an
artefact URL, and the detail pane fetches the full payload only when the
user opens that step. This keeps the stream small regardless of how
large a step\'s output is.

## 5.6 The runtime agent --- where Python and Node.js actually execute

A runtime node is not an LLM call. It is generated code running in a
sandbox, and that is the riskiest part of the product. The contract is:

7.  **Artefact in, artefact out ---** the agent produces a patch or a
    file tree, never a shell command the orchestrator trusts.

8.  **Locked toolchains ---** uv for Python, npm or pnpm for Node.js.
    Both resolve from a lockfile pinned at graph-publish time; a runtime
    node cannot resolve new dependencies at execution time. Python
    resolves against a pre-warmed uv cache in the sandbox image, so \'uv
    run\' is warm, not a cold network resolve.

9.  **No network unless declared ---** no network by default. A node
    that needs a network call gets it through a declared tool, not a raw
    socket. This is enforced by the sandbox profile, not by a prompt.

10. **Hard limits ---** wall-clock per step, CPU seconds, memory
    ceiling, output byte cap, and a maximum process count. Any breach
    kills the sandbox and fails the step with a typed error.

11. **Ephemeral ---** the sandbox is destroyed after the step. Nothing
    persists between steps except the declared artefact.

> \# packages/runtime/spec.py\
> class RuntimeSpec(BaseModel):\
> runtime: Literal\[\"python\", \"node\"\]\
> version: str \# \"3.13\" \| \"24\"\
> entry: str \# \"uv run main.py\"\
> workdir: str = \"/workspace\"\
> deps_hash: str \# pins the resolved lockfile\
> env_keys: list\[str\] = \[\] \# names only; values injected at run
> time\
> sandbox: Literal\[\"strict\", \"network\", \"open\"\] = \"strict\"\
> limits: Limits = Limits(\
> wall_ms=120_000, cpu_ms=60_000,\
> memory_mb=2048, output_bytes=5_000_000, processes=8,\
> )\
> \
> class RuntimeResult(BaseModel):\
> exit_code: int\
> stdout_ref: str \# s3://\... never inline\
> stderr_ref: str\
> artefacts: list\[Artefact\]\
> duration_ms: int\
> truncated: bool

## 5.7 Durable execution with Temporal

Every run is a Temporal workflow; every node execution is an activity.
This is what makes the system survive a deploy mid-run, and it is why a
run can be inspected, retried from an arbitrary step, or resumed after a
human approval without re-running everything before it.

> @workflow\.defn\
> class AgentRun:\
> @workflow\.run\
> async def run(self, graph: GraphDoc, inp: RunInput) -\> RunResult:\
> order = topo_sort(graph)\
> results: dict\[str, StepResult\] = {}\
> \
> for node_id in order:\
> node = graph.node(node_id)\
> step = await workflow.execute_activity(\
> execute_node,\
> NodeInput(node=node, inputs=collect_inputs(node, results)),\
> start_to_close_timeout=timedelta(seconds=node.timeout_s),\
> retry_policy=retry_for(node), \# per-node, per-error-type\
> )\
> results\[node_id\] = step\
> await workflow.execute_activity(publish_event, step.event) \# → Redis
> → SSE\
> \
> if node.kind == \"approval\":\
> await workflow.wait_condition(lambda: self.\_approved,
> timeout=node.approval_ttl)\
> if step.status == \"failed\" and node.on_error == \"escalate\":\
> break\
> \
> return RunResult(steps=results)

- Retry policies are per node and per error type: a ToolTimeout retries
  three times with backoff; a ValidationError does not retry at all; a
  SandboxKilled retries once with a larger memory ceiling.

- A worker restart mid-run replays from history. The run continues where
  it stopped, and the canvas reconnects to the same stream.

- Cost and token accounting is written by the activity, so a cancelled
  run still reports what it spent.

## 5.8 Data model (Postgres)

  --------------------------------------------------------------------------
  **Table**        **Key columns**            **Notes**
  ---------------- -------------------------- ------------------------------
  workspaces       id, name, plan, created_at Tenant boundary; every table
                                              below carries workspace_id

  agents           id, workspace_id, name,    status: draft \| live \|
                   description, status,       paused
                   current_version_id         

  agent_versions   id, agent_id, version,     Immutable. A publish writes
                   graph jsonb, created_by,   one row
                   created_at                 

  runs             id, agent_id, version_id,  Read model; denormalised for
                   status, trigger,           the run list
                   started_at, finished_at,   
                   cost_usd, input jsonb      

  run_steps        id, run_id, node_id,       One row per node execution,
                   status, attempt,           including retries
                   duration_ms, tokens jsonb, 
                   error jsonb, artefact_ref  

  run_events       run_id, seq, type, payload Append-only; partitioned
                   jsonb, ts                  monthly

  eval_suites      id, agent_id, name,        
                   threshold                  

  eval_cases       id, suite_id, input jsonb, tags drive failure grouping
                   expected jsonb, tags       
                   text\[\]                   

  eval_results     id, case_id, run_id,       
                   passed, actual jsonb,      
                   duration_ms                

  tools            id, workspace_id, slug,    auth_ref points at the secret
                   kind, auth_ref, schema     store, never the secret
                   jsonb                      

  memory_docs      id, agent_id, scope,       pgvector; HNSW index
                   content, embedding         
                   vector(1536)               

  audit_log        id, workspace_id, actor,   Append-only, written in the
                   action, target, ts         same transaction as the change
  --------------------------------------------------------------------------

Indexes that matter: runs(agent_id, started_at desc) for the run list;
run_steps(run_id, node_id) for step lookup; run_events(run_id, seq) for
stream replay; a GIN index on agent_versions.graph for node-id queries;
HNSW on memory_docs.embedding.

## 5.9 Caching and invalidation

  ---------------------------------------------------------------------------------
  **Key**                          **TTL**   **Invalidated by**
  -------------------------------- --------- --------------------------------------
  agents:list:{workspace_id}       30 s      Any agent create / update / delete

  graph:{agent_id}:{version_id}    5 min     Never mutated --- versions are
                                             immutable, so expiry alone suffices

  run:summary:{run_id}             10 s      run.finished event; otherwise it ages
                                             out

  tools:list:{workspace_id}        5 min     Tool create / update / auth change

  workspace:usage:{workspace_id}   60 s      Background recount
  ---------------------------------------------------------------------------------

Immutable version rows are the most useful cache win in the system: a
published graph is never invalidated, only evicted, because nothing can
change it.

## 5.10 Security

- **Secrets ---** Provider keys and tool credentials live in a secret
  store (Vault or AWS Secrets Manager). The database holds a reference;
  the value is injected into the sandbox environment at run time and
  never returned by any API.

- **Tenancy ---** Every request carries workspace_id resolved from the
  JWT; every query filters on it. A row-level policy on the high-value
  tables backstops the application code.

- **Service auth ---** Short-lived service tokens between Next.js and
  FastAPI, rotated hourly, never exposed to the browser.

- **Sandbox egress ---** Egress blocked in the sandbox by default. Only
  declared tool calls leave, and they leave through the orchestrator.

- **Injection ---** Prompt injection is treated as a live threat: tool
  results are untrusted input, and any action with side effects requires
  a human approval node in front of it. Content from a fetched page or a
  tool result is never interpreted as an instruction by the orchestrator
  itself.

- **Rate limits ---** Every mutating endpoint is rate-limited per
  workspace: token bucket in Redis, 100 writes/min, 20 runs/min by
  default.

## 5.11 Observability

- One OpenTelemetry trace spans browser fetch → Next.js route handler →
  FastAPI → Temporal workflow → activity → sandbox. The run id is the
  trace id, so a user looking at a slow run can hand engineering a
  single identifier.

- Golden signals per service: request rate, error rate, p50/p95/p99
  latency, saturation. Dashboard per service, one overall product
  dashboard.

- Business metrics matter more than infrastructure ones here: runs
  started, runs succeeded, median cost per run, median time to first
  token, eval pass rate per agent.

- Structured JSON logs with run_id and workspace_id on every line. No
  PII in logs; payloads live in object storage behind a reference.

# 6. Delivery plan

  ------------------------------------------------------------------------
  **Phase**      **Scope**                   **Exit criterion**
  -------------- --------------------------- -----------------------------
  M0 ---         Monorepo, auth, workspaces, A user can create an agent
  Skeleton (2    agents CRUD, design tokens, and see it listed, fast
  wk)            shadcn theming, CI          

  M1 --- Canvas  React Flow canvas, node     A graph of model and runtime
  (3 wk)         palette, inspector for      nodes can be built and saved
                 agent + runtime nodes,      
                 graph persistence,          
                 validation                  

  M2 --- Runtime Temporal workflows, sandbox A Python and a Node runtime
  (3 wk)         pool for Python and Node,   node execute end to end,
                 SSE stream, run detail      streamed live
                 screen                      

  M3 --- Evals & Eval suite, case import,    An agent can be gated on
  publish (2 wk) diff view, versioned        evals and published as an
                 publish, rollback,          immutable version
                 pause/resume                

  M4 ---         OTel, rate limits, failure  Performance budget in §4.4
  Hardening (2   clustering, accessibility   holds under load
  wk)            pass, load test at 200      
                 nodes                       
  ------------------------------------------------------------------------

# 7. Open decisions

These need a call before M1 ends. Each changes architecture, not just
scope.

12. **Isolation ---** Which sandbox technology --- gVisor (cheaper,
    weaker isolation) or Firecracker (stronger, heavier operationally)?
    This is the single largest infrastructure decision in the system.

13. **Egress policy ---** Do runtime agents get network access by way of
    a declared tool only, or is a controlled egress allowlist permitted?
    Stricter is safer and slower to build.

14. **Code review gate ---** Is a runtime node\'s generated code
    reviewable before it runs? A diff-approval step is very valuable for
    a coding product and expensive in latency --- but it may be the
    feature that sells the product.

15. **Deployment ---** Self-hosted or hosted-only for v1? Self-hosting
    is a large share of this market\'s pull and roughly a second product
    to build.

16. **Eval policy ---** Do evals run on publish automatically, and what
    is the default pass threshold? A default that is too strict stalls
    launches; too loose and it is decoration.

End of specification --- v0.1
