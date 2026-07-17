# Repo Structure (memo-architect)

This repo is **memo-architect** (Layer 04). The ontology lives in `memo`, Tools
lives in `memo-tools`, and this repo consumes their published npm packages.
Each product repository is independently installable, buildable, and testable.

## Current Working Tree

```text
memo/
├── package.json               # @memoarchitect/architect
├── packages/
│   └── web/                   # internal React application source
├── src/                       # internal Architect CLI/composition source
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

`pnpm-workspace.yaml` includes only `.`. Dependencies on
`@memoarchitect/tools` and `@memoarchitect/ontology` use exact npm versions.

The separate private `memo-meta` repository checks out Ontology, Tools, and
Architect as sibling submodules. Its pnpm workspace links matching local
versions for coordinated development without changing product manifests.

The publishable package boundaries are:

| Boundary | Purpose |
|---|---|
| `@memoarchitect/ontology` | Portable ontology, methodology, templates, and examples |
| `@memoarchitect/tools` | Engine, headless operations, and `memo` CLI |
| `@memoarchitect/architect` | Visual workbench, live server composition, and static viewer build |

## Build System

Root scripts operate only on Architect; npm supplies its lower layers:

| Task | Purpose |
|---|---|
| `build` | Compile Architect client and CLI outputs |
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
