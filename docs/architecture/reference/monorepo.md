# Repo Structure (memo-architect)

This repo is **memo-architect** (Layer 04). The ontology lives in `memo`, Tools
lives in `memo-tools`, and this repo consumes both through the nested
submodules. Each repository root is one workspace and one npm package.

## Current Working Tree

```text
memo/
├── package.json               # @memo/architect
├── packages/
│   └── web/                   # internal React application source
├── src/                       # internal Architect CLI/composition source
├── memo-tools/                # git submodule: @memo/tools
│   └── memo/                  # nested submodule: @memo/ontology
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

`pnpm-workspace.yaml` includes exactly `.`, `memo-tools`, and
`memo-tools/memo`.

The publishable package boundaries are:

| Boundary | Purpose |
|---|---|
| `@memo/ontology` | Portable ontology, methodology, templates, and examples |
| `@memo/tools` | Engine, headless operations, and `memo` CLI |
| `@memo/architect` | Visual workbench, live server composition, and static viewer build |

## Build System

Root scripts coordinate package tasks in dependency order:

| Task | Purpose |
|---|---|
| `build` | Compile packages and generated outputs |
| `test` | Run package tests |
| `type-check` | TypeScript checking |
| `dev` | Architect source development |
| `clean` | Remove build outputs |

Tools depends on Ontology. Architect depends on Tools and Ontology. Tools has no
dependency on Architect and has no CLI command that requires Architect.

## Key Commands

```bash
pnpm run build
pnpm run test
pnpm run type-check
pnpm run docs:build
pnpm run build && pnpm run test
```

Use [platform.md](../platform.md) for architecture decisions. Keep this file limited to workspace layout and build orchestration.
