# MEMO — Medical Engineering Modelling Ontology

## Project Overview

MEMO (Medical Engineering Modelling Ontology) is a SysML v2 tool for medical device architecture per ISO 14971, IEC 62304, and ISO/IEC/IEEE 42010. This repo is the **webapp layer (memo-architect)** of the three-repo meMO stack; the engine (`memo-tools`) and ontology (`memo`) are consumed as git submodules. Turborepo + pnpm workspace.

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
| Workspace | Turborepo + pnpm (submodule package globs) |
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
  web/                       — @memo/web: React web app (6 modes: catalog, diagram, actionflow, dsm, scenario, ontology)
memo-tools/                   — git submodule → somesh_sandbox/memo-tools: @memo/core (parser/engine),
                                @memo/cli (memo CLI), ontology tooling, VS Code extension
  memo/                       — nested submodule → somesh_sandbox/memo: canonical ontology + methodology
                                + examples (GPCA reference model at src/examples/gpca-pump)
docs/                        — Documentation source, decisions, roadmap snapshots, generated baselines
scripts/                     — roadmap/GitLab project-management scripts
```

**This repo IS the webapp** (`memo-architect`, Layer 04 of the meMO stack). The stack is
three repos wired by submodules (ADR-1-17, cut 2026-07-12): ontology `memo` ◄ engine
`memo-tools` ◄ webapp `memo-architect` (this repo). Public GitHub mirrors live in the
`memoarchitect` org under the same names. The engine and ontology are edited in their
own repos (or via the submodule working trees) — engine/content changes must be
committed and pushed in the submodule repo, then the pin bumped here.

See `docs/architecture/platform.md` for canonical ontology and methodology layout.

## Build & Test Commands

```bash
pnpm run build        # Build all packages (Turborepo cached)
pnpm run test         # Run all tests (web + submodule engine packages)
pnpm run dev          # Start dev server (packages/cli: memo dev)
```

## Session Start

**Always run at the start of every session** (before any other work):
```bash
./scripts/list-roadmap.sh next
```
Returns the next-eligible open story (lowest title-prefix). To execute that story, fetch its body with `glab issue view <iid> -R somesh_sandbox/memo-architect`. GitLab is the only source of truth — no local roadmap files.

## Executing Milestones

When asked to "execute" a milestone or phase, follow this protocol:

1. **Identify story:** `./scripts/list-roadmap.sh next` (or the explicit story id given by the user).
2. **Read story body:** `glab issue view <iid> -R somesh_sandbox/memo-architect`. Read the parent epic issue if the story references it.
3. **Read context:** This file (`CLAUDE.md`) — project overview, tech stack, decisions.
4. **Verify baseline:** `pnpm run build && pnpm run test`
5. **Work on the user's currently checked-out branch** — trunk-based; do not create feature branches.
6. **Execute:** Follow story scope from the GitLab issue description. Read all affected files before modifying. Run tests after each logical change.
7. **Verify:** `pnpm run build && pnpm run test`. If CLI/builder touched: `pnpm run example:dev`.
8. **Close issues:** After completing work for an issue, close it: `glab issue close -R somesh_sandbox/memo-architect <number>`
9. **Commit:** Reference the phase and issue number (e.g., `Phase A: fix product title (#81)`)

**Do NOT:** attempt multiple milestones per session, modify files outside scope, add improvements beyond scope, create feature branches, push without being asked.

## Test Hygiene

Tests must track feature lifecycle:

- **Adding a feature:** ship tests in the same commit. No untested public CLI command, ontology kind, or builder path.
- **Removing or renaming a feature:** delete or update the corresponding tests in the same commit. Do not leave skipped or broken tests behind referencing removed examples, deprecated package names, or deleted CLI flags.
- **Changing behavior:** update affected assertions before merging. A green suite that asserts the old behavior is worse than a red one.
- Stale `it.skip` is a smell, not a fix. Either fix the test or delete it.
- Baseline must be green (`pnpm run build && pnpm run test`) before any new work starts; if red, fix or remove the broken tests first.

## GitLab Project Management — Single Source of Truth

**Remote:** `git@gitlab.com:somesh_sandbox/memo-architect.git`

### IMPORTANT: GitLab is the authoritative source for all planning

- **Issues & milestones live in GitLab** — no local cache, no duplicate files. The previous `docs/roadmap/epic-*.md` and `docs/roadmap/index.md` have been removed; their content lives in GitLab issue descriptions.
- **To view roadmap:** `./scripts/list-roadmap.sh {next|stories|epics|all|wave <N>|epic <ID>}` or `glab issue view <iid>`.
- **To add/modify plan:** edit the relevant GitLab issue description directly. Do not reintroduce `docs/roadmap/epic-*.md`.

### `glab` CLI — use this, NOT the GitLab web API

`glab` (v1.89.0) is installed at `/usr/local/bin/glab`. Always use `--project somesh_sandbox/memo-architect` or `-R somesh_sandbox/memo-architect`.

```bash
# Roadmap (live from GitLab)
./scripts/list-roadmap.sh next         # single next-eligible story
./scripts/list-roadmap.sh stories      # all open stories, title-prefix order
./scripts/list-roadmap.sh epics        # open epic parents
./scripts/list-roadmap.sh wave 1       # open items in wave 1
./scripts/list-roadmap.sh epic K       # parent + stories under Epic K
./scripts/list-roadmap.sh closed       # recently closed roadmap items

# Issues
glab issue view <iid> -R somesh_sandbox/memo-architect
glab issue list -R somesh_sandbox/memo-architect --per-page 100
glab issue create -R somesh_sandbox/memo-architect --title "..." --label "bug"
glab issue close -R somesh_sandbox/memo-architect <number>
```

### Issue Labels

- `priority::critical`, `priority::high`, `priority::medium`, `priority::low`
- `type::feature`, `type::fix`, `type::docs`
- `bug`, `UX`, `web-app`, `ontology`, `diagrams`, `DHF`, `architecture`

## Key Architecture Decisions

Do not duplicate the decision list here. Read `docs/decisions/index.md` and `docs/architecture/platform.md`.

## Current Status

Run `pnpm run roadmap` to see current state (queries GitLab live). Do not maintain status here — GitLab is the source of truth.
