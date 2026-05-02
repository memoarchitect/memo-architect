# Monorepo Structure

MEMO currently uses a single pnpm/Turborepo workspace for tool code, ontology source, examples, and documentation. The intended long-term split is documented in [../platform.md §10](../platform.md#10-repo-layout-final-state).

## Current Working Tree

```text
memo/
├── packages/
│   ├── core/                 # @memo/core: parser, model builder, registries, validation
│   ├── cli/                  # @memo/cli: commands, dev server, file watching
│   ├── web/                  # @memo/web: React application
│   ├── methodology-*/        # methodology packages during migration
│   └── ...                   # transitional packages until migration phases remove or rename them
├── ontology/                 # canonical SysML ontology source for local development
├── examples/                 # projects that pin a methodology and contain element instances
├── tools/
│   ├── ontology-tools/       # lint and diagram helper scripts
│   ├── ontology-viewer/      # standalone read-only ontology viewer
│   └── vscode-extension/     # VS Code language support and snippets
├── docs/
│   ├── architecture/         # canonical architecture and reference docs
│   ├── decisions/            # ADRs
│   ├── generated/            # generated baselines
│   ├── handoffs/             # branch handoffs
│   ├── roadmap/              # GitLab-synced roadmap snapshots
│   └── src/                  # MkDocs user/developer docs source
├── mkdocs.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Workspace Scope

`pnpm-workspace.yaml` intentionally includes consumable packages and examples, not every folder under `tools/`. Most tools are scripts or standalone utilities rather than workspace packages.

The canonical ontology is represented as source under `ontology/` during this migration. Publishable package boundaries are:

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
pnpm run roadmap
```

Use [platform.md](../platform.md) for architecture decisions. Keep this file limited to workspace layout and build orchestration.
