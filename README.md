# MEMO — Model-Based Systems Engineering for Medical Devices

A Git-native, models-as-code MBSE tool for medical device systems engineering. Author models in **standard SysML v2**, validate against **ISO 14971** and **IEC 62304** closure rules, and track regulatory completeness — all from a single CLI and web interface.

## Why MEMO?

MBSE tools are either too complex (Cameo, Enterprise Architect — months of training) or too generic (no regulatory compliance). MEMO bridges the gap:

- **SysML v2 as the single format** — no proprietary DSL, standard tooling interop
- **GUI-first, text-friendly** — web app for guided workflows, VS Code + LSP for power users
- **Completeness-driven** — dashboards show regulatory readiness, not just model structure
- **Zero-config for domain users** — `memo init medical my-pump` gives a ready-to-go project

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
pnpm install
pnpm run build

# Run the infusion-pump example with live reload
pnpm example:dev
# → opens http://localhost:3000 with the primary infusion-pump reference model
```

### CLI Usage

The `memo` CLI is provided by `@memo/cli`. From the repo root, use the `pnpm memo` shortcut:

```bash
# Run any CLI command via pnpm
pnpm memo validate              # Validate the model in the current directory
pnpm memo dev                   # Start dev server (run from a project directory)
pnpm memo init my-pump          # Scaffold a new project
pnpm memo export json           # Export model as JSON

# Or invoke the CLI directly with node
node packages/cli/lib/bin/memo.js dev --port 3000
```

> **Note:** `npx memo` does not work in this monorepo because the CLI package
> is a workspace dependency, not globally installed. Use `pnpm memo` instead.

## CLI Commands

| Command | Description |
|---------|-------------|
| `memo init <name>` | Scaffold a new MEMO device project |
| `memo dev` | Start web app with hot-reload (Vite + WebSocket) |
| `memo validate` | Run closure rules, show completeness % |
| `memo build` | Build static HTML site with embedded model |
| `memo export json` | Export full model as JSON |
| `memo export dot` | Export model as Graphviz DOT |

## Web App Features

- **Completeness bar** — always-visible regulatory readiness % (per CoSMA layer)
- **Viewpoint tabs** — Risk Overview, Requirements Traceability, Architecture, Software, V&V, and more
- **Model explorer** — hierarchical tree grouped by layer and kind
- **Diagram canvas** — ELK auto-layout with ReactFlow, color-coded by layer
- **Properties panel** — element details, relationships, and validation guidance
- **Gap bar** — actionable violations with click-to-select

## Monorepo Structure

```
memo/
├── packages/
│   ├── ontology-core/ @memo/ontology-core — Domain-agnostic MBSE backbone ontology
│   ├── ontology-medical/ @memo/ontology-medical — Reusable medical device development backbone
│   ├── core/        @memo/core     — Langium SysML v2 parser, semantic model, rule engine
│   ├── cli/         @memo/cli      — CLI commands (init, dev, validate, build, export)
│   ├── web/         @memo/web      — React + ReactFlow web app
│   ├── ontology/    @memo/ontology — Transitional broad ontology package being split
│   └── medical/     @memo/medical  — Medical domain config (48 closure rules, 6 viewpoints)
├── examples/
│   ├── infusion-pump/              — Primary infusion-device reference model
│   └── irrigation-pump/            — Second medical reference model for pressure-control workflows
└── docs/                           — MkDocs documentation site
```

## Architecture

```
.sysml files (chokidar watch)
  → Langium parser (SysML v2 subset)
  → Semantic model (MemoModel)
  → Closure rule engine (48 medical closure rules)
  → Completeness tracker (per-layer %)
  → WebSocket broadcast → React web app
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Parser + LSP | Langium (SysML v2 subset grammar) |
| CLI | Commander.js |
| Dev server | Vite + chokidar + WebSocket |
| Web UI | React 18 + ReactFlow + Zustand |
| Layout | ELK.js (layered auto-layout) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest |

## Development

```bash
pnpm install
pnpm run build        # Build all packages (Turborepo cached)
pnpm run test         # Run all tests
pnpm run type-check   # TypeScript type checking

# Run the example project (from the repo root)
pnpm example:dev

# Or validate both medical reference models directly
cd examples/infusion-pump
node ../../packages/cli/lib/bin/memo.js validate

cd ../irrigation-pump
node ../../packages/cli/lib/bin/memo.js validate
```

## Documentation

```bash
# Serve docs locally (requires Python + pdm)
pdm install
pnpm run docs:serve
```

## License

All rights reserved.
