# MEMO Decision Index

Architecture decisions are kept as ADRs for traceability. Current direction is set by accepted ADRs plus [../architecture/platform.md](../architecture/platform.md).

## Proposed Decisions

| Decision | Status | Notes |
|---|---|---|
| [ADR-1-21](adr/ADR-1-21-modular-capability-provider-architecture.md) | Proposed | Layered web architecture with typed capability providers, a curated open-source catalog, and user-selectable/custom layout managers |
| [ADR-1-20](adr/ADR-1-20-maxgraph-diagram-renderer.md) | Proposed | Gated migration from React Flow to a renderer-neutral scene and maxGraph adapter; retain ELK and `.viewlayout` initially |

## Current Direction

| Decision | Status | Notes |
|---|---|---|
| [ADR-1-19](adr/ADR-1-19-geometry-view-deferred.md) | Accepted | Geometry view kind deferred — no renderer until the ontology carries geometric data; kind stays in the taxonomy, reachable only by explicit declaration, rendered as a deferred placeholder |
| [ADR-1-18](adr/ADR-1-18-kerml-expression-subset.md) | Accepted | Closed KerML boolean expression subset (navigation, collection ops, comparison/boolean/arithmetic, literals) for native `require/assert constraint { … }` bodies; grammar runs ahead of evaluator (EE-2 fills deferred forms) |
| [ADR-1-17](adr/ADR-1-17-three-repo-split.md) | Accepted | Three-repo split `memo-sysmlv2` (pure content) / `memo-cli` (engine) / `memo-architect` (web); supersedes the four-repo layout in platform.md §10 |
| [ADR-1-16](adr/ADR-1-16-view-presentation-syntax-fallbacks.md) | Accepted | View/template files use simple `view def`, bare imports, and repeated scalar `presentationKind` assignments until grammar support expands |
| [ADR-1-15](adr/ADR-1-15-methodology-scope-explicit-lists.md) | Accepted | Methodology scope uses explicit enumerated entries; current grammar does not support set literals or `A - B` set difference |
| [ADR-1-14](adr/ADR-1-14-extension-package-policy.md) | Accepted | Medical-only scope; out-of-tree `@memoarchitect/ext-*` packages under `memo::ontology::ext::*` |
| [ADR-1-13](adr/ADR-1-13-sysml-library-import-wrapper.md) | Accepted | Standard library wrapper at `memo::core::stdlib::*` insulates from SysON/SysIDE/Sysand path drift |
| [ADR-1-12](adr/ADR-1-12-namespace-canonicalization.md) | Accepted | Three-segment namespaces `memo::{core,ontology,methodology}::*`; snake_case filenames; SysON/SysIDE/Sysand interop binding |
| [ADR-1-11](adr/ADR-1-11-single-canonical-ontology.md) | Accepted | Single canonical `@memoarchitect/ontology` — one `memo::` namespace, one `src/` tree, one ontology package |
| [ADR-1-9](adr/ADR-1-9-ontology-restart-required.md) | Accepted | Ontology changes require dev server restart |
| [ADR-1-8](adr/ADR-1-8-project-format-contract.md) | Accepted | Project configuration format contract |

> **Removed (2026-06):** the early exploratory ADRs **1-1 … 1-7** and **1-10** were
> pruned. They documented superseded layouts — multi-ontology splits (1-6, 1-10),
> the inline-`kinds:` domain config (1-5), and other pre-`src/` package structure —
> now fully absorbed into ADR-1-11/1-12 and [../architecture/platform.md](../architecture/platform.md).
> History remains in git. Numbering is not reused; the active set starts at ADR-1-8.

## Rules

- New durable decisions get a new ADR.
- Prefer superseding (mark + keep) over deleting; prune an ADR only once its rationale is fully captured by a successor ADR or `platform.md`.
- Fold accepted decision consequences back into [../architecture/platform.md](../architecture/platform.md) when they affect the canonical architecture.
