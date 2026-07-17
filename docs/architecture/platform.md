# MEMO Platform Architecture

This document describes the current product architecture. Roadmaps, proposals,
open questions, implementation plans, and internal reviews live in the private
`memo-meta` repository.

## Product boundaries

| Product | npm package | Responsibility |
|---|---|---|
| MEMO Ontology | `@memoarchitect/ontology` | Portable SysML v2 ontology, methodologies, templates, and examples |
| MEMO Tools | `@memoarchitect/tools` | Parser, semantic model, validation, analysis, project operations, document tooling, and `memo` CLI |
| MEMO Architect | `@memoarchitect/architect` | React workbench, live application composition, and Architect CLI |

The dependency direction is Ontology → Tools → Architect. Architect also
declares Ontology directly because its browser build reads packaged content.
Tools has no dependency on Architect.

## Installation model

Each product repository is independently installable, buildable, testable, and
publishable. Product manifests use exact npm versions; they contain no product
git submodules and do not require the private meta repository.

The private `memo-meta` repository checks out all three products as sibling git
submodules. Root pnpm overrides substitute the sibling checkouts for the exact
npm dependencies during coordinated development. Its build runs Ontology,
Tools, and Architect in dependency order.

## Source of truth

- `.sysml` files are the authoritative engineering model.
- `@memoarchitect/ontology` owns domain definitions, relationships,
  constraints, methodologies, viewpoints, templates, and reference examples.
- `@memoarchitect/tools` turns source into a semantic graph and exposes shared
  headless operations.
- Architect presents that shared model and sends edits through the application
  boundary; it does not own a second engineering model.
- Runtime caches and generated views are derived state.

## Runtime boundary

Tools owns parsing, project watching, validation, analysis, serialization, and
the typed protocol. Architect owns presentation and interaction. The live
server connects these boundaries and persists accepted edits back to project
files before broadcasting refreshed model state.

## Repository layout

See [reference/repository-layout.md](reference/repository-layout.md) for the
current Architect tree and [reference/platform-strategy.md](reference/platform-strategy.md)
for package and repository rules.

## Durable decisions

Accepted architecture decisions are indexed in
[../decisions/index.md](../decisions/index.md). Product documentation states the
resulting current behavior; proposals and execution sequencing remain private
to `memo-meta`.
