# MEMO — Model-Based Systems Engineering Tool

## Project Overview

MEMO is a SysML v2 MBSE tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010. Built as a Turbo monorepo with pnpm workspaces.

## Architecture Vision

**ISO 42010-aligned:** Viewpoint → View → Model. All diagram types (BDD, IBD, ACT, AFD, REQ, etc.) are views under viewpoints, not separate app modes. Follows Arcadia/Capella methodology layers.

**Three-layer product model (MEMO = Medical Engineering Modeling Ontology):**
- Layer 1: SysAnd/SysML v2 ecosystem — publish to, don't build
- Layer 2: MEMO (the ontology) — `memo-base` repo — `@memo/ontology-core` → `@memo/ontology-medical` → `@memo/medical-modeling-profile`
- Layer 3: MEMO Architect (the tool) — `memo-architect` repo — device modeling app (CLI + web), imports ontology, adds tools (DSM, FMEA, DHF, completeness)

**Two-repo split (Phase 7-9, in progress):**
- `memo-base` repo (Layer 2): ontology-core, ontology-medical, medical-modeling-profile — evolves independently
- `memo-architect` repo (Layer 3): core, cli, web, tools — depends on specific ontology version
- Git subtree pulls `memo-base` into `memo-architect/ontology/` for local development
- See `docs/architecture/platform-strategy.md` for full spec

**SysML-as-Source-of-Truth (Phase 7-8, in progress):**
- Kinds and relationships are defined in SysML files only — `part def Hazard { }`, `connection def Mitigates { }`
- `KindRegistry` and `RelationshipRegistry` replace `config.kinds` and `config.relationshipTypes` by parsing the SysML AST
- Architecture layer derived from directory path: `sysml/risk/hazard.sysml` → risk layer (Apollo-11 pattern)
- Config decomposes into small files: `memo.package.yaml` (identity) + `memo.rendering.yaml` (layer colors) + `memo.rules.yaml` (closure rules)

**Target UI (Phase 10 — not yet implemented):**
- Left: Model Explorer (elements) + View Explorer (views under viewpoints)
- Center: Unified Canvas (renders any view type)
- Right: Properties Panel
- Toolbar: Tools (DSM, Consistency, FMEA) + Create View

**Current UI (6-mode tabs — to be replaced in Phase 10):**
- catalog, diagram, actionflow, dsm, scenario, ontology

**Reference documents for architecture vision:**
- `docs/architecture/platform-strategy.md` — Finalized platform architecture
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
  core/                      — Langium grammar, parser, model builder, validator, serializers
  cli/                       — CLI commands (init, dev, validate, export, import, ontology)
  web/                       — React web app (6 modes: catalog, diagram, actionflow, dsm, scenario, ontology)
  ontology-core/             — Domain-agnostic MBSE backbone (11 architecture layers, 165 kinds, OWL exporter)
  ontology-medical/          — Medical device backbone extending core (15 entity domains, 200+ kinds, OWL exporter)
  medical-modeling-profile/  — Modeling profile with closure rules, viewpoints, and templates (extends ontology-medical)
examples/
  infusion-pump/             — Multi-file medical device model with compliance/risk models
  irrigation-pump/           — Behavior-focused example with architecture, risk, and compliance models
```

**Target package structure (after Phase 7-8 rearchitecture):**
```
packages/ontology-core/
  .project.json              — SysAnd manifest
  memo.package.yaml          — Identity (name, version, license)
  memo.rendering.yaml        — Architecture layer colors/icons (~30 lines)
  sysml/
    purpose/business.sysml   — Directory = architecture layer (Apollo-11 pattern)
    operational/...
    requirements/...
    relationships/...
```

## Build & Test Commands

```bash
pnpm run build        # Build all packages (Turborepo cached)
pnpm run test         # Run all tests (130+ passing)
pnpm run dev          # Start dev server (packages/cli: memo dev)
```

## Executing Milestones

When asked to "execute M<N>" or "run milestone M<N>", follow this protocol:

1. **Read context first** (in this order):
   - This file (`CLAUDE.md`) — project overview, tech stack, decisions
   - `docs/development/roadmap.md` — milestone scope, dependencies, acceptance criteria
   - `docs/architecture/platform-strategy.md` — architecture spec (package format, registries, SysAnd)
   - `docs/architecture/rearchitect-prompt.md` — execution guide with key files, architecture context, session discipline

2. **Verify baseline:** `pnpm run build && pnpm run test` (all 130+ tests must pass)
3. **Work on `main`** — trunk-based development, no feature branches. Commit directly to `main`.
4. **Execute:** Follow milestone scope from `roadmap.md`. Read all affected files before modifying. Run tests after each logical change.
5. **Verify:** `pnpm run build && pnpm run test`. If CLI/builder touched: `cd examples/infusion-pump && memo dev`.
6. **Commit:** `M<ID>: <milestone title>`

**Do NOT:** attempt multiple milestones per session, modify files outside scope, add improvements beyond scope, create feature branches, push without being asked.

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

### Milestone Inventory

**Authoritative roadmap:** `docs/development/roadmap.md` — single source of truth for all milestones.

**Closed (M1-M35):** M1-M3, M11, M16-M18 completed. M4-M35 closed — to be recreated post-rearchitecture.

**Active milestones (in execution order):**

Phase 7 — Package & Registry Foundation:
- M36: Package semantics cleanup (fix projectType, memo.package.yaml, .project.json)
- M37: Directory restructure — ontology-core (Apollo-11)
- M38: Directory restructure — ontology-medical (Apollo-11)
- M39: KindRegistry — SysML-driven kind discovery
- M40: RelationshipRegistry — SysML-driven relationship discovery
- M41: Dual-mode builder — registry + config fallback
- M42: Ontology loader — wire registries into CLI

Phase 8 — Config Decomposition:
- M43: Extract memo.rendering.yaml (cosmaLayers → layers)
- M44: Extract memo.rules.yaml
- M45: Remove config.kinds (~1,500 lines)
- M46: Remove config.relationshipTypes (~700 lines)
- M47: Delete legacy memo.config.yaml

Phase 9 — Package Lifecycle:
- M48: Harden SysAnd export + round-trip validation
- M49: Ontology lock + change detection
- M50: memo init with ontology selection
- M51: memo install — package resolution

Phase 10 — Unified Workbench UX:
- M52: Unified view architecture (replace 6-mode tabs)
- M53: Model Explorer + View Explorer
- M54: Properties panel + inline editing
- M55: Tools panel + productivity (DSM/FMEA toolbar, Cmd+K, context menus)

Phase 11 — Compliance & Productivity:
- M56: CI integration (exit codes, JUnit)
- M57: Traceability matrix
- M58: DHF generator
- M59: Static build + .kpar packaging

Phase 12 — Extension Ecosystem:
- M59: Reusable package authoring + consumption
- M60: Standalone ontology viewer
- M61: VS Code extension

Critical path: M36 → M37 → M39 → M41 → M42 → M45 → M46 → M47 → M52

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
| Ontology Backbone | Three-tier split: `ontology-core` → `ontology-medical` → `medical-modeling-profile`. ADR-1-6/1-7. 26 SysML entity files, 2 OWL exporters, updated examples | 130+ |

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
- **Three-tier ontology** — `ontology-core` (domain-agnostic) → `ontology-medical` (regulated medical) → `medical-modeling-profile` (rules/viewpoints/templates). See ADR-1-6
- **SysML v2 is single source of truth** — Kinds/relationships derived from SysML AST, not YAML catalogs (Phase 7)
- **Directory = Layer (Apollo-11 pattern)** — `sysml/<layer>/<file>.sysml` determines architecture layer (Phase 7)
- **Config decomposes into purpose-specific files** — `memo.package.yaml` + `memo.rendering.yaml` + `memo.rules.yaml` replace monolithic `memo.config.yaml` (Phase 8)
- **Ontology locked per project** — Selected at `memo init`, changing shows validation errors, no auto-migration (Phase 9)
- **Standalone ontology viewer** — Read-only tool at `tools/ontology-viewer/`, not a mode in MEMO Architect (Phase 12)
- **Two-repo split** — `memo-base` (ontology, Layer 2) and `memo-architect` (tool, Layer 3) are separate git repos; git subtree for local dev
- **Adoption before ecosystem** — Unified UX → compliance outputs → package ecosystem → advanced features

## Session Status (March 2026)

**Last completed:** M49 (Ontology lock + change detection) — `memo.lock.yaml` created at `memo init` with ontology identity, version, package chain, and SHA-256 checksums. `memo dev` and `memo validate` check lock on startup; exit with clear error if ontology ID, version, or package checksums change. `memo lock` command regenerates the lock file. No auto-migration (intentional for regulated medical device dev). 246 tests passing.

**Previously completed:** M36-M48 (Phase 7 complete, Phase 8 complete, M48 SysAnd hardening). Roadmap consolidation. Ontology Backbone Restructuring.

**Next up:** M50 (memo init with ontology selection).

**GitLab milestones:** M36-M54 exist. M36-M49 closed.
