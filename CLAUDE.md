# MEMO — Medical Engineering Modelling Ontology

## Project Overview

MEMO (Medical Engineering Modelling Ontology) is a SysML v2 tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010. Built as a Turbo monorepo with pnpm workspaces.

## Documentation Entry Points

- `docs/LLM.md` — minimal context pack for agents and LLMs
- `docs/README.md` — documentation map and source-of-truth rules
- `docs/architecture/platform.md` — canonical platform architecture + grand plan
- `docs/design/sysmlv2-rulebook.md` — normative SysML v2 authoring rules
- `docs/roadmap/north-star.md` — product strategy and north star
- `docs/decisions/index.md` — ADR catalog and current decision state
- `docs/architecture/reference/overview.md` — package architecture diagram
- `docs/architecture/reference/platform-strategy.md` — repo/package strategy
- `docs/design/runtime/data-flow.md` — data flow through the system
- `docs/design/runtime/websocket-protocol.md` — CLI ↔ web app protocol
- `docs/handoffs/` — branch-specific handoffs

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
examples/
  gpca-pump/                 — Reference medical device model (GPCA pump, 500+ elements)
ontology/                    — Canonical SysML ontology source
docs/                        — Documentation source, decisions, roadmap snapshots, generated baselines
```

See `docs/architecture/platform.md` for canonical ontology and methodology layout.

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
7. **Verify:** `pnpm run build && pnpm run test`. If CLI/builder touched: `cd examples/gpca-pump && memo dev`.
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

## Key Architecture Decisions

Do not duplicate the decision list here. Read `docs/decisions/index.md` and `docs/architecture/platform.md`.

## Current Status

Run `pnpm run roadmap` to see current state (queries GitLab live). Do not maintain status here — GitLab is the source of truth.
