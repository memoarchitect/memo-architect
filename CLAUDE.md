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

## Architecture Reference Documents

- `docs/design_guidelines/README.md` — **design guidelines index** — start here
- `docs/design_guidelines/memo-platform-architecture.md` — **canonical platform architecture + grand plan** — key doc; supersedes earlier ontology/methodology splits
- `docs/design_guidelines/feedback-ontology-replace-handoff.md` — active branch handoff
- `docs/roadmap/north-star.md` — **product strategy and north star** — read this before making roadmap decisions
- `docs/design_guidelines/architecture/sysmlv2-rulebook.md` — normative SysML v2 authoring rules
- `docs/design_guidelines/architecture/overview.md` — package architecture diagram
- `docs/design_guidelines/architecture/platform-strategy.md` — two-repo split, package format
- `docs/design_guidelines/architecture/data-flow.md` — data flow through the system
- `docs/design_guidelines/architecture/websocket-protocol.md` — CLI ↔ web app protocol
- `docs/design_guidelines/adr/` — decision records (ADR-1-1..ADR-1-10)
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
  ontology-arch/             — Architecture layers (11 layers, 118+ kinds: operational/functional/logical/software/hardware/behavioral/verification/safety/security/privacy + ROS extension)
  ontology-process/          — Regulatory standards (ISO 14971, IEC 62304, ISO 13485, IEC 60601, ISO 14155, ISO 27001/27701, FDA 21 CFR 820, EU MDR)
  medical-modeling-profile/  — Modeling profile with closure rules, viewpoints, and templates (extends both ontology packages)
examples/
  infusion-pump/             — Multi-file medical device model with compliance/risk models
  irrigation-pump/           — Behavior-focused example with architecture, risk, and compliance models
  gpca-pump/                 — Large reference model (GPCA pump, 500+ elements)
```

Each ontology package follows the Apollo-11 pattern (directory = architecture layer):
```
packages/ontology-arch/
  .project.json              — SysAnd manifest
  memo.package.yaml          — Identity (name, version, license)
  memo.rendering.yaml        — Architecture layer colors/icons
  sysml/
    index.sysml              — Aggregate entry point (imports all sub-packages)
    operational/             — Directory = layer name
    functional/
    logical/
    software/
    hardware/
    behavioral/
    verification/
    safety/
    security/
    privacy/
    relationships/
    axioms/
    software-extension/      — ROS 2 middleware kinds
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
pnpm run roadmap
```
This queries GitLab live — no local cache files.

## Executing Milestones

When asked to "execute" a milestone or phase, follow this protocol:

1. **Check roadmap:** `pnpm run roadmap` (should already be done at session start)
2. **Read phase detail:** `pnpm run roadmap -- -p c2` (replace `c2` with phase slug)
3. **Read context:** This file (`CLAUDE.md`) — project overview, tech stack, decisions
4. **Verify baseline:** `pnpm run build && pnpm run test`
5. **Work on `main`** — trunk-based development, no feature branches. Commit directly to `main`.
6. **Execute:** Follow milestone scope from GitLab issue descriptions. Read all affected files before modifying. Run tests after each logical change.
7. **Verify:** `pnpm run build && pnpm run test`. If CLI/builder touched: `cd examples/infusion-pump && memo dev`.
8. **Close issues:** After completing work for an issue, close it: `glab issue close -R somesh_sandbox/memo <number>`
9. **Commit:** Reference the phase and issue number (e.g., `Phase A: fix product title (#81)`)

**Do NOT:** attempt multiple milestones per session, modify files outside scope, add improvements beyond scope, create feature branches, push without being asked.

## GitLab Project Management — Single Source of Truth

**Remote:** `git@gitlab.com:somesh_sandbox/memo.git`

### IMPORTANT: GitLab is the authoritative source for all planning

- **Issues & milestones live in GitLab** — no local cache, no duplicate files
- **To view roadmap:** `pnpm run roadmap` (queries GitLab live)
- **To add/modify plan:** create or update GitLab issues and milestones

### `glab` CLI — use this, NOT the GitLab web API

`glab` (v1.89.0) is installed at `/usr/local/bin/glab`. Always use `--project somesh_sandbox/memo` or `-R somesh_sandbox/memo`.

```bash
# Roadmap (live from GitLab — no local files)
pnpm run roadmap              # phase summary
pnpm run roadmap:open         # open issues by phase
pnpm run roadmap:bugs         # open bugs
pnpm run roadmap -- -p c2     # single phase detail

# Issues
glab issue list -R somesh_sandbox/memo --per-page 100
glab issue create -R somesh_sandbox/memo --title "..." --label "bug"
glab issue close -R somesh_sandbox/memo <number>

# Milestones
glab milestone list --project somesh_sandbox/memo --per-page 50
```

### Issue Labels

- `priority::critical`, `priority::high`, `priority::medium`, `priority::low`
- `type::feature`, `type::fix`, `type::docs`
- `bug`, `UX`, `web-app`, `ontology`, `diagrams`, `DHF`, `architecture`

## Completed Phases

Phases 1-18 + two-ontology refactor (Phases 7-8) complete. 346 tests passing. See GitLab closed milestones for history.
Two-ontology refactor: collapsed 9 legacy ontology packages into `@memo/ontology-arch` and `@memo/ontology-process` (see ADR-1-10).

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
- **Two-format config contract** — device projects use `memo.config.yaml`; ontology/profile packages use `memo.package.yaml` + `memo.rendering.yaml` + `memo.rules.yaml`. See ADR-1-8
- **Ontology locked per project** — Selected at `memo init`, changing shows validation errors, no auto-migration (Phase 9)
- **Standalone ontology viewer** — Read-only tool at `tools/ontology-viewer/`, not a mode in MEMO Architect (Phase 12)
- **Two-repo split** — `memo-base` (ontology, Layer 2) and `memo-architect` (tool, Layer 3) are separate git repos; git subtree for local dev
- **Adoption before ecosystem** — Unified UX → compliance outputs → package ecosystem → advanced features

## Current Status

Run `pnpm run roadmap` to see current state (queries GitLab live). Do not maintain status here — GitLab is the source of truth.
