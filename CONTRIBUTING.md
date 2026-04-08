# Contributing to MEMO

This guide is for any contributor — human or AI assistant — working on the MEMO codebase.

## Prerequisites

```bash
node --version   # >= 20.0.0
pnpm --version   # >= 9.0.0
glab --version   # >= 1.89.0 (for GitLab issue management)
```

## Setup

```bash
pnpm install
pnpm run build
pnpm run test          # all tests must pass before starting work
```

## Session Start

Always run before starting any work:

```bash
pnpm run roadmap                      # see phases + active milestones (live from GitLab)
pnpm run roadmap -- -p a              # see detail for a specific phase
```

## Execution Protocol

When working on a phase or issue:

1. **Check roadmap:** `pnpm run roadmap` then `pnpm run roadmap -- -p <slug>` for the phase you're working on
3. **Verify baseline:** `pnpm run build && pnpm run test` — must pass before changes
4. **Read before writing:** Always read affected files before modifying them
5. **Test after each change:** `pnpm run test` after each logical change
6. **Verify final state:** `pnpm run build && pnpm run test`
7. **If CLI or model builder changed:** also run `cd examples/infusion-pump && node ../../packages/cli/lib/bin/memo.js dev`
8. **Commit:** `Phase <X>: <description> (#<issue>)` — e.g., `Phase A: fix product title (#81)`
9. **Close issue:** `glab issue close -R somesh_sandbox/memo <number>`

### Rules

- Work on `main` — no feature branches (trunk-based development)
- One phase per session — do not mix phases
- Stay in scope — do not refactor or improve code outside the issue scope
- Do not push without being asked
- Do not add features, docstrings, or type annotations to unchanged code

## Architecture Constraints

These MUST be followed. Violating these will break the app or contradict design decisions.

### Package Boundaries

```
@memo/ontology-core          → domain-agnostic MBSE types (no medical concepts)
@memo/ontology-medical       → medical device backbone (extends core, no tool logic)
@memo/medical-modeling-profile → closure rules, viewpoints, templates (extends medical)
@memo/core                   → parser, builder, validator, serializers (no UI)
@memo/cli                    → CLI commands (depends on core, no UI framework)
@memo/web                    → React web app (depends on core via WebSocket, not direct import)
```

- `ontology-core` MUST NOT import from `ontology-medical` or `medical-modeling-profile`
- `ontology-medical` MUST NOT import from `medical-modeling-profile`
- `core` MUST NOT import from `cli` or `web`
- `web` communicates with `core` via WebSocket protocol only — no direct function imports

### UI Constraints

- **State management:** Zustand store at `packages/web/src/store/model-store.ts` — do not add Redux, MobX, or other state managers
- **Design tokens:** All visual constants in `packages/web/src/styles/tokens.ts` — do not hardcode colors, font sizes, spacing
- **Diagrams:** ReactFlow + ELK.js — do not add D3, vis.js, or other diagram libraries
- **Styling:** Tailwind CSS v4 — do not add styled-components, CSS modules, or other CSS-in-JS
- **Edge style:** Succession edges use smoothstep; all other edges use bezier

### Ontology Constraints

- **Three-tier hierarchy:** `ontology-core` → `ontology-medical` → `medical-modeling-profile` — never flatten
- **SysML is source of truth:** Kinds and relationships are defined in `.sysml` files — do not duplicate in YAML or JSON config
- **Directory = architecture layer:** `sysml/<layer>/<file>.sysml` determines which layer a kind belongs to (Apollo-11 pattern)
- **Ontology locked per project:** Selected at `memo init`; changing ontology shows validation errors, no auto-migration

### Architectural Patterns

- **ISO 42010:** Viewpoint → View → Model — diagrams are views under viewpoints, not separate app modes
- **DSM/FMEA are tools** — accessed from toolbar or CLI, not modes in the tab bar
- **Config-driven viewpoints** — defined in `memo.config.yaml`, not hardcoded in components
- **Auto-generated diagrams** — CLI generates from viewpoint config on rebuild

### Key Files

| File | Role | Touch with care |
|------|------|-----------------|
| `packages/core/src/grammar/sysml.langium` | SysML v2 grammar | Changes affect all parsing |
| `packages/core/src/builder/model-builder.ts` | AST → semantic model | Changes affect all downstream |
| `packages/core/src/validator/validate.ts` | Rule engine entry | Changes affect all validation |
| `packages/web/src/store/model-store.ts` | Zustand global state | Changes affect all UI |
| `packages/web/src/styles/tokens.ts` | Design tokens | Changes affect all visual styling |
| `packages/cli/src/bin/memo.ts` | CLI entry + command registry | Changes affect all CLI commands |

### LLM Integration

LLM features use native `fetch()` — no SDK dependencies.

- **Provider config:** `packages/core/src/llm/llm-provider.ts` — resolves `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- **Model override:** `MEMO_LLM_MODEL` env var
- **Context serialization:** `packages/core/src/llm/model-context.ts` — serializes model for LLM context
- Do not add `openai`, `anthropic`, `langchain`, or similar packages

## Tech Stack (do not change)

| Layer | Technology | Do not substitute |
|-------|-----------|-------------------|
| Monorepo | Turborepo + pnpm | No Nx, Lerna |
| Parser | Langium | No ANTLR, tree-sitter |
| CLI | Commander.js | No yargs, oclif |
| Dev Server | Vite + Chokidar | No webpack |
| Web UI | React 18 + Zustand | No Next.js, Redux |
| Diagrams | ReactFlow + ELK.js | No D3, vis.js |
| Styling | Tailwind CSS v4 | No styled-components |
| Testing | Vitest | No Jest |

## GitLab Project Management

GitLab is the single source of truth for all planning.

```bash
# View roadmap
pnpm run roadmap                          # summary
pnpm run roadmap -- -p a                  # phase detail
pnpm run roadmap:open                     # all open issues by phase

# Issues
glab issue list -R somesh_sandbox/memo --per-page 100
glab issue create -R somesh_sandbox/memo --title "..." --label "bug"
glab issue close -R somesh_sandbox/memo <number>
```

Do not maintain plans in local files. GitLab is the single source of truth — the roadmap queries it live.

## Architecture Reference Documents

- `docs/src/developers/architecture/overview.md` — package architecture diagram
- `docs/src/developers/architecture/platform-strategy.md` — two-repo split, package format
- `docs/src/developers/architecture/data-flow.md` — data flow through the system
- `docs/src/developers/architecture/websocket-protocol.md` — CLI ↔ web app protocol
- `docs/src/developers/adr/ADR-1-6-ontology-core-medical-split.md` — three-tier ontology rationale
