# MEMO — LikeC4 Architecture Model

This directory contains the [LikeC4](https://likec4.dev) architecture model for the MEMO platform
(Medical Engineering Modelling Ontology).

The model moves from high-level system context down to runtime data-flow detail,
following the C4 Model levels (L0 → L3).

## File Structure

```
docs/likec4/
├── model.c4                    Root model — specification, all elements & relationships
└── views/
    ├── 00-landscape.c4         L0  System landscape / context
    ├── 01-containers.c4        L1  Top-level package decomposition
    ├── 02-core.c4              L2a @memo/core internal components
    ├── 03-cli.c4               L2b @memo/cli internal components
    ├── 04-web.c4               L2c @memo/web internal components
    ├── 05-ontologies.c4        L2d Ontology & profile packages
    └── 06-data-flow.c4         L3  Runtime data-flow / WebSocket protocol
```

## View Index

### L0 — System Landscape

| View ID | Title | Description |
|---------|-------|-------------|
| `landscape` | System Landscape | MEMO in context of users and external systems |
| `memo_context` | Platform Context | Expands MEMO boundary showing containers |

### L1 — Containers

| View ID | Title | Description |
|---------|-------|-------------|
| `containers` | Containers | All top-level npm packages and external dependencies |
| `build_deps` | Build-time Dependencies | npm package dependency graph |

### L2a — @memo/core

| View ID | Title | Description |
|---------|-------|-------------|
| `core_components` | Internal Components | All core sub-systems |
| `core_model_pipeline` | Model Build Pipeline | .sysml → MemoModelDTO critical path |
| `core_dhf` | DHF Workbench | Document processing pipeline internals |
| `core_llm` | LLM Engine | AI-assisted modeling engines |

### L2b — @memo/cli

| View ID | Title | Description |
|---------|-------|-------------|
| `cli_components` | Internal Components | All CLI sub-components |
| `cli_dev_startup` | `memo dev` Startup | Ordered startup sequence |
| `cli_commands` | Command Surface | All 20+ CLI commands by category |

### L2c — @memo/web

| View ID | Title | Description |
|---------|-------|-------------|
| `web_components` | Internal Components | All React SPA components |
| `web_state_flow` | State & Data Flow | WebSocket → modelStore → UI |
| `web_active_views` | Active View Registry | All navigable views (`activeView` variants) |

### L2d — Ontology Packages

| View ID | Title | Description |
|---------|-------|-------------|
| `ontology_packages` | Ontology Package Family | Package hierarchy & extension relationships |
| `ontology_runtime` | Ontology Runtime Consumption | How packages are loaded and surfaced in UI |

### L3 — Runtime Data Flow

| View ID | Title | Description |
|---------|-------|-------------|
| `ws_protocol` | WebSocket Protocol | All message types (Server→Client and Client→Server) |
| `edit_roundtrip` | Element Edit Round-Trip | Full cycle from browser edit to .sysml patch |
| `csv_import_flow` | CSV Bulk Import | CSV paste → SysML file → model update |

## Quick Architecture Summary

```
.sysml files (chokidar watch)
  → Langium parser (@memo/core)          packages/core/src/language/
  → Semantic model builder               packages/core/src/model/builder.ts
  → Closure rule engine (109 rules)      packages/core/src/validator/rule-engine.ts
  → Completeness tracker (per-layer %)   packages/core/src/completeness/tracker.ts
  → WebSocket broadcast                  packages/cli/src/server/dev-server.ts
  → React web app (Zustand model-store)  packages/web/src/store/model-store.ts
```

## Key Design Decisions

1. **Shared kernel** — `@memo/core` is a zero-runtime-dependency TypeScript library
   consumed by both the Node.js CLI and the browser React app. This ensures
   model types, protocol messages, and business logic are never duplicated.

2. **WebSocket as the integration boundary** — all state changes flow through
   a single typed WebSocket protocol. The browser app is intentionally thin
   (React + Zustand); the CLI dev server is the source of truth.

3. **File system as the source of truth** — `.sysml` source files are the
   authoritative representation. The browser never holds state that isn't
   reflected back to disk; the file watcher closes the loop.

4. **Ontology-as-package** — domain knowledge (kinds, relationships, closure rules,
   viewpoints) lives in independent npm packages. Device projects compose them
   by listing `ontologies:` in `memo.config.yaml`.

5. **Plugin extensibility** — the plugin system allows custom generators and
   analysis scripts without forking the core platform.

## Running the LikeC4 Viewer

```bash
# Install LikeC4 CLI
npm install -g @likec4/cli

# Serve the model (from repo root)
likec4 serve docs/likec4/

# Or build a static site
likec4 build docs/likec4/ -o docs/dist/architecture/
```
