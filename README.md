# MEMO — Model-Based Systems Engineering for Medical Devices

MEMO is an open-source, SysML v2-native platform for medical device architecture, analysis, traceability, and documentation. It enables teams to model systems as code, connect architecture to risk and requirements, and generate review-ready engineering artifacts from a single living model.

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

### Core

| Command | Description |
|---------|-------------|
| `memo init <name>` | Scaffold a new MEMO device project |
| `memo dev` | Start web app with hot-reload (Vite + WebSocket) |
| `memo validate` | Run closure rules, show completeness % |
| `memo build` | Build static HTML site with embedded model |
| `memo create-package` | Scaffold a new ontology, profile, or library package |
| `memo install <pkg>` | Install an ontology package (git, npm, or local path) |
| `memo lock` | Regenerate `memo.lock.yaml` from current ontology |

### LLM-Powered (requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)

| Command | Description |
|---------|-------------|
| `memo ask "<question>"` | Ask a question about the model using LLM |
| `memo generate "<description>"` | Generate SysML from natural language |
| `memo dhf draft --target <doc>` | Draft DHF content for gap sections using LLM |

### Export

| Command | Description |
|---------|-------------|
| `memo export json` | Export full model as JSON |
| `memo export dot` | Export model as Graphviz DOT |
| `memo export dhf` | Export DHF documents (HTML, Markdown, DOCX) |

### Import

| Command | Description |
|---------|-------------|
| `memo import csv <file>` | Import elements from CSV (generates .sysml) |
| `memo import csv-rel <file>` | Import relationships from CSV |
| `memo import template` | Generate ontology-aware template CSV |
| `memo import ea <file>` | Import from Sparx EA JSON export |
| `memo import cameo <file>` | Import from MagicDraw/Cameo XMI or JSON |
| `memo import sysand <dir>` | Import a SysAnd project directory |
| `memo import owl <file>` | Import OWL/Turtle or JSON-LD ontology |

### DHF (Design History File)

| Command | Description |
|---------|-------------|
| `memo dhf status` | Show DHF document readiness |
| `memo dhf snapshot` | Snapshot current DHF state |
| `memo dhf diff` | Compare current state against last snapshot |
| `memo dhf redline` | Generate redline showing changes |
| `memo dhf review-packet` | Generate complete review packet |

### Ontology

| Command | Description |
|---------|-------------|
| `memo ontology show` | Show resolved ontology summary |
| `memo ontology export owl` | Export ontology as OWL/RDF Turtle |
| `memo ontology export xml` | Export ontology as OWL/RDF XML |
| `memo ontology export sysand` | Export ontology as SysAnd project |

### Plugin

| Command | Description |
|---------|-------------|
| `memo plugin list` | List configured plugins |
| `memo plugin create` | Scaffold a new plugin |
| `memo plugin run <name>` | Run a generator or analysis plugin |

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
│   └── medical-modeling-profile/ @memo/medical-modeling-profile — Medical modeling profile (109 closure rules, 11 viewpoints)
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
  → Closure rule engine (109 medical closure rules)
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

## Roadmap & Project Management

GitLab is the single source of truth for planning. Local roadmap files are auto-generated from open GitLab issues — closed issues never appear.

```bash
# Sync GitLab → local docs/roadmap/ (run at session start)
pnpm run sync:roadmap

# Browse the roadmap
pnpm run roadmap                   # Phase summary table
pnpm run roadmap -- --open         # Open issues grouped by phase
pnpm run roadmap -- --done         # Closed issues grouped by phase
pnpm run roadmap -- --bugs         # Open bugs only
pnpm run roadmap -- --phase c      # Single phase detail
```

To add or modify work: create/update GitLab issues, then re-run `pnpm run sync:roadmap`.

## Documentation

```bash
# Serve docs locally (requires Python + pdm)
pdm install
pnpm run docs:serve
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture constraints, execution protocol, and development workflow. This guide works for any contributor — human or AI assistant.

## License

All rights reserved.
