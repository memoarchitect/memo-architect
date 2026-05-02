# MEMO Decision Index

Architecture decisions are kept as ADRs for traceability. Current direction is set by accepted ADRs plus [../architecture/platform.md](../architecture/platform.md).

## Current Direction

| Decision | Status | Notes |
|---|---|---|
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
