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
│   ├── ontology/                # @memo/ontology — legacy compatibility shim
│   │   ├── sysml/
│   │   │   ├── entities/                 # SysML v2 entity type definitions
│   │   │   ├── relationships/            # Connection definitions
│   │   │   └── index.sysml              # Package entry
│   │   ├── memo.config.yaml             # Compatibility config layered on @memo/ontology-medical
│   │   └── scripts/
│   │       └── pack-kpar.ts             # Package as .kpar archive
│   │
│   ├── medical/                 # @memo/medical — workbench config
│   │   └── memo.config.yaml             # 131 kinds, 21 rules, 5 viewpoints
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
│   └── infusion-pump/          # Example project
│       ├── memo.config.yaml
│       └── model/
│           ├── infusion-pump.sysml
│           ├── risk/
│           ├── requirements/
│           ├── architecture/
│           └── verification/
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

The `^build` dependency ensures the build order is:

```
@memo/ontology → @memo/core → @memo/medical → @memo/cli + @memo/web
```

## Key Commands

```bash
pnpm run build          # Build all packages
pnpm run test           # Run all tests
pnpm run clean          # Clean all build artifacts
pnpm run type-check     # TypeScript checking only
```
