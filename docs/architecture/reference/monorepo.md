# Repo Structure (memo-architect)

This repo is the **memo-architect webapp** (Layer 04). The three-repo split ([../platform.md §10](../platform.md#10-repo-layout-executed-2026-07-12), [ADR-1-17](../../decisions/adr/ADR-1-17-three-repo-split.md)) is fully executed: the ontology lives in `memo`, the engine in `memo-tools`, and this repo consumes them through the `memo-tools` submodule (which nests `memo-tools/memo`). The pnpm workspace globs the submodule packages, so `@memo/core`/`@memo/cli`/`@memo/ontology` resolve as normal workspace members.

## Current Working Tree

```text
memo/
├── packages/
│   └── web/                  # @memo/web: React application
├── memo-tools/                  # git submodule: engine (@memo/core + @memo/cli) + tooling
│   └── memo/                   # nested submodule: ontology + methodology + examples
├── docs/
│   ├── architecture/         # canonical architecture and reference docs
│   ├── decisions/            # ADRs
│   ├── generated/            # generated baselines
│   ├── roadmap/              # story execution prompt (roadmap content itself lives in GitLab)
│   └── src/                  # MkDocs user/developer docs source
├── mkdocs.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Workspace Scope

`pnpm-workspace.yaml` includes `packages/*` plus the submodule package globs (`memo-tools/packages/*`, `memo-tools/memo/packages/*`).

The canonical ontology lives in the nested `memo-tools/memo` submodule (`src/` mirrors the `memo::` namespace). Publishable package boundaries are:

| Boundary | Purpose |
|---|---|
| `@memo/sysml-base` | L0 helper library, no domain content |
| `@memo/ontology` | L1 canonical medical-device ontology |
| `@memo/methodology-default` | L2 comprehensive default methodology |
| custom methodology packages | L2 tailoring packages such as GPCA |
| `@memo/core`, `@memo/cli`, `@memo/web` | L3 tool runtime |

## Build System

Turborepo manages package tasks:

| Task | Purpose |
|---|---|
| `build` | Compile packages and generated outputs |
| `test` | Run package tests |
| `type-check` | TypeScript checking |
| `dev` | Persistent development servers |
| `clean` | Remove build outputs |

The tool packages build independently of any hard-coded ontology package. At runtime, CLI commands parse the configured ontology, methodology, and project SysML.

## Key Commands

```bash
pnpm run build
pnpm run test
pnpm run type-check
pnpm run docs:build
pnpm run build && pnpm run test
```

Use [platform.md](../platform.md) for architecture decisions. Keep this file limited to workspace layout and build orchestration.
