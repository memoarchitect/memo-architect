# MEMO — Model-Based Systems Engineering Tool

## Project Overview

MEMO is a SysML v2 MBSE tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010. Built as a Turbo monorepo with pnpm workspaces.

## Architecture Vision

**ISO 42010-aligned:** Viewpoint → View → Model. All diagram types (BDD, IBD, ACT, AFD, REQ, etc.) are views under viewpoints, not separate app modes. Follows Arcadia/Capella methodology layers.

**Target UI (Phase 7 — not yet implemented):**
- Left: Model Explorer (elements) + View Explorer (views under viewpoints)
- Center: Unified Canvas (renders any view type)
- Right: Properties Panel
- Toolbar: Tools (DSM, Consistency, FMEA) + Create View

**Current UI (6-mode tabs — to be replaced in Phase 7):**
- catalog, diagram, actionflow, dsm, scenario, ontology

**Reference documents for architecture vision:**
- `/Users/someshkashyap/Downloads/System Architecture Document-wip.pdf`
- `/Users/someshkashyap/Downloads/System Architecture Overview.pdf`
- `/Users/someshkashyap/EA/NewMDG/AfferaMDG.qea` (SQLite, 78 stereotypes)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Parser | Langium (SysML v2 grammar) |
| CLI | Commander.js + Chalk |
| Dev Server | Vite + Chokidar + WebSocket |
| Web UI | React 18 + Zustand |
| Diagrams | ReactFlow + ELK.js |
| Styling | Tailwind CSS v4 + design tokens (`styles/tokens.ts`) |
| Testing | Vitest |

## Package Structure

```
packages/
  core/       — Langium grammar, parser, model builder, validator, serializers
  cli/        — CLI commands (init, dev, validate, export, import, ontology)
  web/        — React web app (6 modes: catalog, diagram, actionflow, dsm, scenario, ontology)
  ontology/   — Base MBSE ontology config (52 kinds, 12 rels, 9 layers, 8 viewpoints)
  medical/    — Medical domain extension (13 kinds, 4 rels, 15 ISO closure rules, 4 viewpoints)
examples/
  infusion-pump/   — 74-element multi-file medical device model
  irrigation-pump/ — Behavior-focused example with parallel flows
```

## Build & Test Commands

```bash
pnpm run build        # Build all packages (Turborepo cached)
pnpm run test         # Run all tests (130+ passing)
pnpm run dev          # Start dev server (packages/cli: memo dev)
```

## GitLab Project Management

**Remote:** `git@gitlab.com:somesh_sandbox/memo.git`

### IMPORTANT: Use `glab` CLI only — do NOT use GitLab web API

`glab` (v1.89.0) is installed at `/usr/local/bin/glab`. Always use `--project somesh_sandbox/memo` flag.

```bash
# Milestones
glab milestone list --project somesh_sandbox/memo --per-page 50
glab api --method POST "projects/somesh_sandbox%2Fmemo/milestones" -f title="M36: ..." -f description="..."
glab api --method PUT "projects/somesh_sandbox%2Fmemo/milestones/<ID>" -f description="..." -f state_event=close

# Issues
glab issue list -R somesh_sandbox/memo --per-page 100
glab issue create -R somesh_sandbox/memo --title "..." --milestone "M33: ..."
glab issue close -R somesh_sandbox/memo <issue-number>
```

### Milestone Inventory (35 milestones as of March 2026)

**Closed (7):**
- M1: Diagram-First Browser (Phase 4D)
- M2: Collapsible Sidebar + Git Identity (Phase 4D)
- M3: Multi-File SysML Resolution (Phase 4)
- M11: Vertical Completeness Bar (Phase 4D)
- M16: Behavior Viewpoint (Phase 5)
- M17: FBS Tree + DSM (Phase 6a/6b)
- M18: Functional-Logical Consistency (Phase 6c)

**Active — Tier 1 CRITICAL (core MBSE workflow):**
- M33: Unified View Architecture — Replace 6-mode tabs with view-centric explorer + unified canvas
- M4: Ontology Editor — Visual editor for kinds, relationships, layers, closure rules
- M6: Relationship/Traceability Matrix — N×N matrix (ISO 14971/IEC 62304)
- M9: FMEA + Risk Analysis — ISO 14971 FMEA table with risk chains
- M34: Element Libraries — Reusable standard component libraries
- M35: External Ontology Import — OWL/JSON-LD/SysAnd interoperability

**Active — Tier 2 HIGH (productivity & compliance):**
- M14: DHF Generator Engine — Design History File generator
- M15: DHF Web Preview — DHF preview in web app
- M19: CI Integration — JSON/JUnit output, exit codes
- M12: Cmd+K Search — Global fuzzy search
- M10: Properties Tabs + Editing — Inline editing
- M20: Static Build + Export — memo build, .kpar

**Active — Tier 3 MEDIUM (enhanced experience):**
- M5: Custom Viewpoints UI
- M7: Right-Click Context Menus
- M8: Tabular View
- M13: Focus Mode
- M22: Scenario Editor + Diff
- M26: VS Code Extension
- M21: Statistics Dashboard

**Active — Tier 4 LOW (future):**
- M23: Guided Wizard
- M24: Working Sets
- M25: Onboarding + Performance
- M27: EA/Cameo Import
- M28: Plugin System
- M29-M32: LLM, Domain Packages, Cloud

### Issue Labels

- `phase::4d`, `phase::5`, `phase::6`, `phase::7`, `phase::8`, `phase::9`
- `priority::critical`, `priority::high`, `priority::medium`, `priority::low`
- `type::feature`, `type::docs`

## Completed Phases Summary

| Phase | What | Tests |
|-------|------|-------|
| 1 — Foundation | Langium SysML v2 parser, base ontology, config system, 5 ADRs | - |
| 2 — CLI & Web App | Validation, completeness, WebSocket, React app, ReactFlow diagrams | 69 |
| 3 — Modular Ontology | Ontology extension system, 4-mode app, OWL export | - |
| 4A — CSV Import | CSV import/export, SysML generator, CLI commands | 22 |
| 4B — Diagrams | DiagramType/DTO, CRUD protocol, 9 diagram types, config-driven auto-diagrams | - |
| 4C — Docs | Medical Device Quick Start Tutorial (MkDocs) | - |
| 4D — UI Polish | Collapsible sidebar, git identity, branding, decomposition diagrams, comments | - |
| 4 — Multi-File | PackageRegistry, library keyword, wildcard imports, multi-file splitting | 100 |
| 5a-d — Behavior | action def/flow/succession/allocate grammar, ActionFlowDiagram, BV-001/002/003 | 36 |
| 5e — UI Polish | Design tokens, ISO 42010 viewpoint split, node polish | - |
| 6a — FBS | decomposedBy, FBS tree with ELK MRTree, expand/collapse | - |
| 6b — DSM | computeDSM(), clustering, interactive DSMView, allocation overlay | 9 |
| 6c — Consistency | analyzeConsistency(), bezier edges, FONT tokens across components | - |

**Total tests: 130+**

## Key Architecture Decisions

- **Views under viewpoints** — ISO 42010 hierarchy, not separate modes
- **DSM/FMEA are tools** — Accessed from toolbar, invocable from CLI
- **Activity is a view type** — AFD under behavior-view, not a separate mode
- **Design tokens** — Centralized in `packages/web/src/styles/tokens.ts`
- **Succession edges stay smoothstep** — All other edges use bezier
- **State management** — Zustand store in `packages/web/src/store/model-store.ts`
- **Config-driven viewpoints** — Defined in memo.config.yaml, not hardcoded
- **Auto-generated diagrams** — CLI generates from viewpoint config on rebuild

## Session Status (March 2026)

**Last completed:** Phase 6c (Consistency + Visual Polish) — all code complete, build passes, 130+ tests pass.

**Current phase:** Ontology Backbone Restructuring — split the current ontology direction into `@memo/ontology-core` (domain-agnostic MBSE backbone) and `@memo/ontology-medical` (medical device development backbone for ISO 13485 / ISO 14971 / IEC 62304 / IEC 60601-1).

**Next up:** Phase 7 (M33 — Unified View Architecture) continues, but the ontology work now starts with defining the `core` and `ontology-medical` package boundaries before expanding compliance features.

**GitLab milestones updated:** M16/M17/M18 closed, M33/M34/M35 created, all milestones have Tier descriptions.
