# ADR-1-22: Exact npm Dependencies with a Sibling Meta Workspace

**Status:** Accepted
**Date:** 2026-07-16
**Owners:** Platform maintainers
**Scope:** Repository dependency resolution and coordinated development
**Related:** [ADR-1-17 three-repo split](ADR-1-17-three-repo-split.md)

## Decision

Each public product repository is independently installable, buildable, and
testable. Product manifests declare exact released npm dependencies:

- `@memoarchitect/tools` depends on `@memoarchitect/ontology`.
- `@memoarchitect/architect` depends on both Tools and Ontology.
- `@memoarchitect/ontology` has no product-repository dependency.

Product repositories do not contain one another as nested Git submodules and
their pnpm workspaces include only their own package.

The private `memo-meta` repository is the coordinated development surface. It
records `memo`, `memo-tools`, and `memo-architect` as sibling submodules and
enables pnpm workspace linking. When local package versions match the exact
manifest versions, pnpm links the sibling checkout; a standalone clone resolves
the same dependency from npm.

## Rationale

Nested submodules made normal builds depend on a recursive Git checkout and
coupled distribution mechanics to repository layout. Published npm packages
already provide the required runtime and type surfaces. Exact versions preserve
the compatibility set tested for a release.

The sibling meta workspace retains fast iterative development without changing
the public package contract or duplicating dependencies in product repositories.

## Consequences

- Standalone clones require no submodule initialization.
- Cross-repository source changes start in `memo-meta` and are committed in each
  product repository independently.
- Release coordination still proceeds Ontology → Tools → Architect.
- Maintainer scripts and examples resolve content through package resolution;
  source-authoring tools use sibling paths in `memo-meta`.
