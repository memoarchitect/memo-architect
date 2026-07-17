# MEMO Decision Index

This index contains accepted product decisions. Proposals and implementation
plans live in the private `memo-meta` repository. Current architecture is
summarized in [../architecture/platform.md](../architecture/platform.md).

## Current Direction

| Decision | Status | Notes |
|---|---|---|
| [ADR-1-22](adr/ADR-1-22-npm-dependencies-meta-workspace.md) | Accepted | Exact npm dependencies in product repos; sibling workspace links in `memo-meta` |
| [ADR-1-19](adr/ADR-1-19-geometry-view-deferred.md) | Accepted | Geometry view kind deferred — no renderer until the ontology carries geometric data; kind stays in the taxonomy, reachable only by explicit declaration, rendered as a deferred placeholder |
| [ADR-1-18](adr/ADR-1-18-kerml-expression-subset.md) | Accepted | Closed KerML boolean expression subset (navigation, collection ops, comparison/boolean/arithmetic, literals) for native `require/assert constraint { … }` bodies; grammar runs ahead of evaluator (EE-2 fills deferred forms) |
| [ADR-1-17](adr/ADR-1-17-three-repo-split.md) | Accepted | Ontology, Tools, and Architect are separate product repositories |
| [ADR-1-16](adr/ADR-1-16-view-presentation-syntax-fallbacks.md) | Accepted | View/template files use simple `view def`, bare imports, and repeated scalar `presentationKind` assignments until grammar support expands |
| [ADR-1-15](adr/ADR-1-15-methodology-scope-explicit-lists.md) | Accepted | Methodology scope uses explicit enumerated entries; current grammar does not support set literals or `A - B` set difference |
| [ADR-1-14](adr/ADR-1-14-extension-package-policy.md) | Accepted | Medical-only scope; out-of-tree `@memoarchitect/ext-*` packages under `memo::ontology::ext::*` |
| [ADR-1-13](adr/ADR-1-13-sysml-library-import-wrapper.md) | Accepted | Standard library wrapper at `memo::core::stdlib::*` insulates from SysON/SysIDE/Sysand path drift |
| [ADR-1-12](adr/ADR-1-12-namespace-canonicalization.md) | Accepted | Three-segment namespaces `memo::{core,ontology,methodology}::*`; snake_case filenames; SysON/SysIDE/Sysand interop binding |
| [ADR-1-11](adr/ADR-1-11-single-canonical-ontology.md) | Accepted | Single canonical `@memoarchitect/ontology` — one `memo::` namespace, one `src/` tree, one ontology package |
| [ADR-1-9](adr/ADR-1-9-ontology-restart-required.md) | Accepted | Ontology changes require dev server restart |
| [ADR-1-8](adr/ADR-1-8-project-format-contract.md) | Accepted | Project configuration format contract |

## Rules

- New durable decisions get a new ADR.
- Fold accepted decision consequences back into [../architecture/platform.md](../architecture/platform.md) when they affect the canonical architecture.
