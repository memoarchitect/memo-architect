# ADR-1-17: Three Product Repositories

**Status:** Accepted

## Decision

MEMO is delivered through three repositories and npm packages:

| Repository | Package | Responsibility |
|---|---|---|
| `memo` | `@memoarchitect/ontology` | Portable SysML v2 ontology and methodology content |
| `memo-tools` | `@memoarchitect/tools` | Engine, shared operations, and `memo` CLI |
| `memo-architect` | `@memoarchitect/architect` | Visual workbench and application composition |

Dependencies flow Ontology → Tools → Architect. Architect also declares
Ontology directly for packaged browser content.

## Current consequences

- Each product is independently installable, buildable, testable, and publishable.
- Product manifests pin exact npm dependency versions.
- Product repositories do not contain one another as git submodules.
- The private `memo-meta` repository keeps all three as sibling submodules and
  links them with meta-only pnpm overrides for coordinated development.
- Tools remains headless and has no dependency on Architect.

The dependency and meta-workspace mechanics are defined by
[ADR-1-22](ADR-1-22-npm-dependencies-meta-workspace.md).
