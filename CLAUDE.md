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

**Closed (M1-M3, M11, M16-M18):** Original foundation milestones — completed.

**Closed (M4-M35):** Batch-closed pre-rearchitecture milestones. Disposition:
- M33 (Unified View) → superseded by M52
- M26 (VS Code) → superseded by M61
- M34 (Libraries) → superseded by M59
- M35 (Import) → partially by M48; remainder in M70-M71
- M27 (EA/Cameo) → deferred to M69
- M28 (Plugin) → deferred to M78
- M29-M30 (LLM) → deferred to M72-M74
- M31 (Domain Pkgs) → deferred to M77
- M32 (Cloud) → deferred to M75-M76
- M21 (Stats Dashboard) → absorbed into Phase 13 DHF dashboard (M68)
- M22 (Scenario/Diff) → candidate for future Phase 17
- M23 (Guided Wizard) → candidate for future Phase 17
- M24 (Working Sets) → candidate for future Phase 17
- M25 (Onboarding) → partially by M50 (`memo init`)

**Closed (M36-M71):** All Phase 7-14 milestones complete.

**Active milestones (in execution order):**

Phase 12 — Extension Ecosystem: ✅ Complete (M59-M61 done)

Phase 13 — DHF Workbench: ✅ Complete (M62-M68 done)
- M62: DHF Document Registry, Markdown Templates & Document IR
- M63: DHF Content Generator — Model Query Engine
- M64: Export Plugins — HTML, DOCX, PDF, Markdown
- M65: DHF Configuration & Customization
- M66: DHF CLI — Export, Status & Targeting
- M67: DHF Redline & Change Tracking
- M68: DHF Web Dashboard — Landing Page & Drilldown

Phase 14 — Developer Experience & Import: ✅ Complete (M69-M71 done)
- M69: EA/Cameo import (`memo import ea`, `memo import cameo`)
- M70: SysAnd import (`memo import sysand` with round-trip verification)
- M71: OWL/JSON-LD ontology import (`memo import owl` with `--package-dir`)

Phase 15 — LLM Integration: ✅ Complete (M72-M74 done)
- M72: Model Q&A (`memo ask` with context-aware RAG)
- M73: SysML generation from natural language (`memo generate`)
- M74: DHF draft assistant (`memo dhf draft`)

Phase 16 — Cloud & Collaboration:
- M75: Cloud deployment
- M76: Multi-user collaboration
- M77: Domain packages (automotive, aerospace)
- M78: Plugin system ✅

Phase 17 — Productivity & Polish: ✅ Complete (M79-M83 done)
- M79: Scenario editor + model diff
- M80: Guided compliance wizard
- M81: Working sets + workspace persistence
- M82: Statistics dashboard
- M83: Onboarding tour + performance (code splitting)

Phase 18 — Reference Model — GPCA Infusion Pump:
- M84: System Context & Requirements Hierarchy (≥80 requirement elements, full traceability)
- M85: Risk Management — Full ISO 14971 Chain (≥20 hazards, ≥30 risk controls, FMEA)
- M86: Software Architecture — IEC 62304 Compliance (Class C, ≥8 items, ≥15 units, SOUP)
- M87: Behavioral Model — State Machine & Action Flows (GPCA state machine, ≥5 action flows)
- M88: Clinical, Cybersecurity & Post-Market (≥35 elements across 5 domains)
- M89: DHF Generation & Validation Showcase (≥500 elements, completeness ≥85%)

Critical path: M84 → M85 → M86 → M87 → M89. M84 → M88 → M89.

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

**Last completed:** M83 (Phase 17: Productivity & Polish). M78 (Plugin system). 352 tests passing.

**Previously completed:** M72-M74 (Phase 15: LLM Integration). M69-M71 (Phase 14). M62-M68 (Phase 13: DHF Workbench). M79-M83 (Phase 17). M36-M61 (Phase 7-12).

**Next up:** Phase 18 (M84-M89: GPCA Reference Model). Phase 16 remaining (M75-M77: Cloud, Multi-user, Domain packages).

**GitLab milestones:** M36-M61 closed. M62-M68 closed. M69-M71 closed. M72-M74 closed. M78 closed. M79-M83 closed. M84-M89 active.
