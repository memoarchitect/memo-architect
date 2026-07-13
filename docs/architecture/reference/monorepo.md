# Monorepo Structure

MEMO development uses a single pnpm/Turborepo workspace for tool code and documentation, with the canonical ontology consumed as the `vendor/memo-sysmlv2` git submodule. The three-repo split ([../platform.md §10](../platform.md#10-repo-layout-executed-2026-07-12), [ADR-1-17](../../decisions/adr/ADR-1-17-three-repo-split.md)) was cut on 2026-07-12 — `memo-tools` (engine) and `memo-architect` (web) exist as squashed split repos on GitLab and GitHub — but this monorepo remains the working checkout; package removal here is a separate follow-up decision.

## Current Working Tree

```text
memo/
├── packages/
│   ├── core/                 # @memo/core: parser, model builder, registries, validation
│   ├── cli/                  # @memo/cli: commands, dev server, file watching
│   └── web/                  # @memo/web: React application (split target: memo-architect)
├── vendor/
│   └── memo-sysmlv2/         # git submodule: canonical ontology + methodology + examples
│       └── src/examples/gpca-pump/   # GPCA reference model (canonical copy)
├── tools/
│   ├── ontology-tools/       # lint and diagram helper scripts
│   ├── ontology-viewer/      # standalone read-only ontology viewer
│   └── vscode-extension/     # VS Code language support and snippets
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

`pnpm-workspace.yaml` intentionally includes consumable packages and examples, not every folder under `tools/`. Most tools are scripts or standalone utilities rather than workspace packages.

The canonical ontology lives in the `vendor/memo-sysmlv2` submodule (`src/` mirrors the `memo::` namespace). Publishable package boundaries are:

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
./scripts/list-roadmap.sh next
```

Use [platform.md](../platform.md) for architecture decisions. Keep this file limited to workspace layout and build orchestration.
