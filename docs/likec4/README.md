# MEMO — LikeC4 Architecture Model

This directory contains the [LikeC4](https://likec4.dev) architecture model for the MEMO platform
(Medical Engineering Modelling Ontology).

The model moves from high-level system context down to runtime data-flow detail,
following the C4 Model levels (L0 → L3).

## File Structure

```
docs/likec4/
├── README.md      This file
└── model.c4       Root model — specification, all elements, relationships, and views
```

All views live inline in `model.c4` using LikeC4's `view of <element>` drill-down
pattern. Clicking any element with a matching `view of` view in the LikeC4 viewer
renders a "zoom in" button automatically.

## View Index

| Level | View | Drill into | Description |
|-------|------|------------|-------------|
| L0 | `index` | (entry point) | Actors + MEMO platform + external systems |
| L1 | `view of memo` | `memo` | Container decomposition (core / cli / web / ont / projectFs / docsFs) |
| L2a | `view of memo.core` | `memo.core` | `@memoarchitect/tools` components — parser, builder, rule engine, DHF, LLM |
| L2b | `view of memo.cli` | `memo.cli` | `@memoarchitect/tools` components — dev server, file watcher, persistor, commands |
| L2c | `view of memo.web` | `memo.web` | `@memoarchitect/architect` components — model store, ws client, canvas, dashboards |
| L2d | `view of memo.ont` | `memo.ont` | Ontology backbone: `@memoarchitect/ontology` + `medical-modeling-profile` |
| L3 | `view of memo.core.wsProtocol` | `wsProtocol` | All WebSocket message types (Server→Client and Client→Server) |
| L3 | `view of memo.cli.persistor` | `persistor` | Element edit round-trip — browser → server → .sysml → re-parse → broadcast |

## Quick Architecture Summary

```
.sysml files (chokidar watch)
  → Langium parser                       memo-tools/packages/tools/src/language/
  → Semantic model builder               memo-tools/packages/tools/src/model/
  → Validation and analysis              memo-tools/packages/tools/src/validator/
  → WebSocket application boundary       memo-tools/packages/tools/src/server/
  → React workbench                      memo-architect/packages/web/src/
```

## Key Design Decisions

1. **Shared kernel** — `@memoarchitect/tools` is a zero-runtime-dependency TypeScript library
   consumed by both the Node.js CLI and the browser React app. This ensures
   model types, protocol messages, and business logic are never duplicated.

2. **WebSocket as the integration boundary** — all state changes flow through
   a single typed WebSocket protocol. The browser app is intentionally thin
   (React + Zustand); the CLI dev server is the source of truth.

3. **File system as the source of truth** — `.sysml` source files are the
   authoritative representation. The browser never holds state that isn't
   reflected back to disk; the file watcher closes the loop.

4. **Ontology as an exact dependency** — domain knowledge, relationships,
   constraints, and viewpoints live in `@memoarchitect/ontology`. Tools and
   Architect pin exact npm releases; `memo-meta` substitutes sibling checkouts
   only during coordinated development.

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
