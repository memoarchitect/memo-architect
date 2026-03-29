# Monorepo Structure

MEMO uses **pnpm workspaces** with **Turborepo** for build orchestration.

## Directory Layout

```
memo/
├── packages/
│   ├── core/                    # @memo/core — parser, model, validation
│   │   ├── src/
│   │   │   ├── grammar/
│   │   │   │   └── memo-sysml.langium    # SysML v2 grammar definition
│   │   │   ├── language/
│   │   │   │   └── generated/            # Langium-generated parser code
│   │   │   ├── model/
│   │   │   │   ├── config.ts             # Config type definitions
│   │   │   │   ├── config-loader.ts      # YAML loading + extends resolution
│   │   │   │   ├── semantic.ts           # MemoModel, MemoModelDTO, converters
│   │   │   │   ├── builder.ts            # AST → MemoModel
│   │   │   │   └── parser-utils.ts       # Parse helpers
│   │   │   ├── validator/
│   │   │   │   ├── types.ts              # Violation, ValidationResult types
│   │   │   │   └── rule-engine.ts        # evaluateClosureRules()
│   │   │   ├── completeness/
│   │   │   │   └── tracker.ts            # computeCompleteness()
│   │   │   ├── protocol/
│   │   │   │   └── messages.ts           # WebSocket message types
│   │   │   └── index.ts                  # Public API barrel
│   │   └── src/__tests__/               # 120 tests (parser, builder, ontology)
│   │
│   ├── ontology-core/           # @memo/ontology-core — domain-agnostic MBSE backbone
│   │   ├── sysml/
│   │   │   ├── entities/                 # Core SysML v2 entity definitions
│   │   │   ├── relationships/            # Core connection definitions
│   │   │   └── index.sysml              # Package entry
│   │   └── memo.config.yaml             # Core ontology config
│   │
│   ├── ontology-medical/        # @memo/ontology-medical — medical backbone
│   │   ├── sysml/
│   │   │   ├── entities/                 # Medical SysML v2 entity definitions
│   │   │   ├── relationships/            # Medical connection definitions
│   │   │   └── index.sysml              # Package entry
│   │   └── memo.config.yaml             # Medical ontology config
│   │
│   ├── medical-modeling-profile/   # @memo/medical-modeling-profile — modeling profile config
│   │   └── memo.config.yaml             # medical modeling profile rules, viewpoints, and templates
│   │
│   ├── cli/                     # @memo/cli — command-line interface
│   │   └── src/
│   │       ├── bin/
│   │       │   └── memo.ts              # CLI entry point (commander)
│   │       ├── commands/
│   │       │   ├── dev.ts               # memo dev
│   │       │   ├── validate.ts          # memo validate
│   │       │   └── init.ts              # memo init
│   │       └── server/
│   │           ├── dev-server.ts        # HTTP + WebSocket server
│   │           ├── file-watcher.ts      # Chokidar file watcher
│   │           └── config-resolver.ts   # Config extends resolver
│   │
│   └── web/                     # @memo/web — React application
│       └── src/
│           ├── App.tsx                  # Root component
│           ├── main.tsx                 # Vite entry
│           ├── store/
│           │   ├── model-store.ts       # Zustand state
│           │   └── ws-client.ts         # WebSocket client
│           ├── views/
│           │   ├── DiagramCanvas.tsx     # ReactFlow diagram
│           │   └── layout.ts            # ELK.js layout engine
│           └── components/
│               ├── Sidebar.tsx          # Left sidebar
│               ├── ModelExplorer.tsx     # Hierarchical element explorer
│               ├── ViewpointSelector.tsx # Viewpoint filter tabs
│               ├── CompletenessBar.tsx   # Top completeness bar
│               └── GapBar.tsx           # Bottom violations bar
│
├── examples/
│   ├── infusion-pump/          # Infusion-device reference model
│   └── irrigation-pump/        # Surgical irrigation reference model
│
├── docs/                        # This documentation (MkDocs)
│   └── adr/                    # Architecture Decision Records
│
├── mkdocs.yml                  # MkDocs configuration
├── turbo.json                  # Turborepo task definitions
├── pnpm-workspace.yaml         # Workspace package list
└── package.json                # Root scripts
```

## Build System

Turborepo manages the build pipeline with these task definitions:

| Task | Dependencies | Outputs |
|---|---|---|
| `build` | `^build` (upstream packages first) | `dist/`, `lib/`, `out/` |
| `test` | `build` | — |
| `dev` | — | — (persistent) |
| `clean` | — | — |

The `^build` dependency ensures the ontology/build chain is respected:

```
@memo/ontology-core → @memo/ontology-medical → @memo/medical-modeling-profile → @memo/cli
```

## Key Commands

```bash
pnpm run build          # Build all packages
pnpm run test           # Run all tests
pnpm run clean          # Clean all build artifacts
pnpm run type-check     # TypeScript checking only
```
