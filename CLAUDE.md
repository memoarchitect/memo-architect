# MEMO — Medical Engineering Modelling Ontology

## Project Overview

MEMO (Medical Engineering Modelling Ontology) is a SysML v2 tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010. Built as a Turbo monorepo with pnpm workspaces.

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

## Session Start

**Always run at the start of every session** (before any other work):
```bash
pnpm run sync:roadmap
```
Then read `docs/roadmap/index.md` to understand current state.

## Executing Milestones

When asked to "execute" a milestone or phase, follow this protocol:

1. **Sync roadmap** (should already be done at session start)
2. **Read context** (only what you need — token-optimized):
   - `docs/roadmap/index.md` — tiny index (~30 lines), always read first
   - `docs/roadmap/phase-X.md` — only the phase you're working on
   - `docs/roadmap/bugs.md` — if fixing bugs
   - This file (`CLAUDE.md`) — project overview, tech stack, decisions
3. **Verify baseline:** `pnpm run build && pnpm run test`
4. **Work on `main`** — trunk-based development, no feature branches. Commit directly to `main`.
5. **Execute:** Follow milestone scope from the phase file. Read all affected files before modifying. Run tests after each logical change.
6. **Verify:** `pnpm run build && pnpm run test`. If CLI/builder touched: `cd examples/infusion-pump && memo dev`.
7. **Close issues:** After completing work for an issue, close it: `glab issue close -R somesh_sandbox/memo <number>`
8. **Commit:** Reference the phase and issue number (e.g., `Phase A: fix product title (#81)`)

**Do NOT:** attempt multiple milestones per session, modify files outside scope, add improvements beyond scope, create feature branches, push without being asked.

## GitLab Project Management — Single Source of Truth

**Remote:** `git@gitlab.com:somesh_sandbox/memo.git`

### IMPORTANT: GitLab is the authoritative source for all planning

- **Issues & milestones live in GitLab** — do NOT maintain duplicate plans in local files
- **Local roadmap is a read-only sync** — generated by `pnpm run sync:roadmap`
- **Always sync before planning work:** `pnpm run sync:roadmap`
- **Never edit `docs/roadmap/*.md` manually** — changes will be overwritten on next sync
- **To add/modify plan:** create or update GitLab issues, then re-sync

### `glab` CLI — use this, NOT the GitLab web API

`glab` (v1.89.0) is installed at `/usr/local/bin/glab`. Always use `--project somesh_sandbox/memo` or `-R somesh_sandbox/memo`.

```bash
# Sync roadmap (pulls GitLab → local per-phase files)
pnpm run sync:roadmap

# Read roadmap (token-optimized — only read what you need)
cat docs/roadmap/index.md        # ~30 lines, always start here
cat docs/roadmap/phase-a.md      # only when working on Phase A
cat docs/roadmap/bugs.md         # all open bugs

# Issues
glab issue list -R somesh_sandbox/memo --per-page 100
glab issue create -R somesh_sandbox/memo --title "..." --label "bug"
glab issue close -R somesh_sandbox/memo <number>

# Milestones
glab milestone list --project somesh_sandbox/memo --per-page 50
```

### Roadmap Structure (docs/roadmap/)

Token-optimized: per-phase files so sessions only read what they need.

| File | Content | ~Lines |
|------|---------|--------|
| `index.md` | Phase summary, active milestones, execution order | ~30 |
| `bugs.md` | All open bugs from GitLab | varies |
| `phase-a.md` | P0: Critical bug fixes | ~50 |
| `phase-b.md` | P1: UX foundation | ~50 |
| `phase-c.md` | P1: Visual ontology viewer | ~50 |
| `phase-d.md` | P2: Diagrams & views | ~30 |
| `phase-e.md` | P2: DHF improvements | ~30 |
| `phase-f.md` | P2: Model & scenarios | ~30 |
| `phase-g.md` | P3: Examples & docs | ~30 |
| `phase-h.md` | Nice-to-have: Cloud | ~20 |
| `phase-i.md` | Nice-to-have: Domain packages | ~20 |
| `phase-j.md` | P2: Import/export formats (AADL) | ~20 |

### Issue Labels

- `priority::critical`, `priority::high`, `priority::medium`, `priority::low`
- `type::feature`, `type::fix`, `type::docs`
- `bug`, `UX`, `web-app`, `ontology`, `diagrams`, `DHF`, `architecture`

## Completed Phases

Phases 1-18 complete (Foundation through GPCA Reference Model). 352+ tests passing. See GitLab closed milestones for history.

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

## Current Status

Run `pnpm run sync:roadmap` then read `docs/roadmap/index.md` for current state. Do not maintain status here — GitLab is the source of truth.
