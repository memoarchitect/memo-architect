# MEMO Decision Index

Architecture decisions are kept as ADRs for traceability. Current direction is set by accepted ADRs plus [../architecture/platform.md](../architecture/platform.md).

## Current Direction

| Decision | Status | Notes |
|---|---|---|
| [ADR-1-18](adr/ADR-1-18-kerml-expression-subset.md) | Accepted | Closed KerML boolean expression subset (navigation, collection ops, comparison/boolean/arithmetic, literals) for native `require/assert constraint { … }` bodies; grammar runs ahead of evaluator (EE-2 fills deferred forms) |
| [ADR-1-17](adr/ADR-1-17-three-repo-split.md) | Accepted | Three-repo split `memo-sysmlv2` (pure content) / `memo-cli` (engine) / `memo-architect` (web); supersedes the four-repo layout in platform.md §10 |
| [ADR-1-16](adr/ADR-1-16-view-presentation-syntax-fallbacks.md) | Accepted | View/template files use simple `view def`, bare imports, and repeated scalar `presentationKind` assignments until grammar support expands |
| [ADR-1-15](adr/ADR-1-15-methodology-scope-explicit-lists.md) | Accepted | Methodology scope uses explicit enumerated entries; current grammar does not support set literals or `A - B` set difference |
| [ADR-1-14](adr/ADR-1-14-extension-package-policy.md) | Accepted | Medical-only scope; out-of-tree `@memo/ext-*` packages under `memo::ontology::ext::*` |
| [ADR-1-13](adr/ADR-1-13-sysml-library-import-wrapper.md) | Accepted | Standard library wrapper at `memo::base::stdlib::*` insulates from SysON/SysIDE/Sysand path drift |
| [ADR-1-12](adr/ADR-1-12-namespace-canonicalization.md) | Accepted | Three-segment namespaces `memo::{base,ontology,methodology}::*`; snake_case filenames; SysON/SysIDE/Sysand interop binding |
| [ADR-1-11](adr/ADR-1-11-single-canonical-ontology.md) | Accepted | Single canonical `@memo/ontology`; supersedes ADR-1-6 and ADR-1-10 |
| [ADR-1-9](adr/ADR-1-9-ontology-restart-required.md) | Accepted | Ontology changes require dev server restart |
| [ADR-1-8](adr/ADR-1-8-project-format-contract.md) | Accepted | Project configuration format contract |

## Historical ADRs

| ADR | Status |
|---|---|
| [ADR-1-1 Entity Type Mapping](adr/ADR-1-1-entity-type-mapping.md) | Historical |
| [ADR-1-2 Relationship Representation](adr/ADR-1-2-relationship-representation.md) | Historical |
| [ADR-1-3 Ontology Package Structure](adr/ADR-1-3-ontology-package-structure.md) | Historical |
| [ADR-1-4 Closure Rule Representation](adr/ADR-1-4-closure-rule-representation.md) | Historical |
| [ADR-1-5 Domain Config Extension Point](adr/ADR-1-5-domain-config-extension.md) | Superseded by ADR-1-8 |
| [ADR-1-6 Ontology Core vs Medical Backbone Split](adr/ADR-1-6-ontology-core-medical-split.md) | Superseded by ADR-1-11 |
| [ADR-1-7 Legacy Ontology Compatibility Policy](adr/ADR-1-7-legacy-ontology-compatibility-policy.md) | Historical |
| [ADR-1-10 Collapse Fragmented Ontology Packages](adr/ADR-1-10-two-ontology-collapse.md) | Superseded by ADR-1-11 |

## Rules

- New durable decisions get a new ADR.
- Supersede old ADRs instead of rewriting their history.
- Fold accepted decision consequences back into [../architecture/platform.md](../architecture/platform.md) when they affect the canonical architecture.
