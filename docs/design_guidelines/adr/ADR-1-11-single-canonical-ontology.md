# ADR-1-11: Single Canonical Ontology with Multi-Dimensional Kinds

**Status:** Accepted
**Date:** 2026-05-02
**Supersedes:** [ADR-1-6](ADR-1-6-ontology-core-medical-split.md), [ADR-1-10](ADR-1-10-two-ontology-collapse.md)
**Reference:** [memo-platform-architecture.md](../memo-platform-architecture.md)

---

## Context

Prior ADRs split medical-device kinds across multiple packages: first into core/medical/extensions (ADR-1-6), then into `ontology-arch` + `ontology-process` (ADR-1-10). Both decisions kept ontology and methodology fused — package boundaries doubled as scope boundaries. Result: cross-package edits for any change touching both arch and compliance, brittle dependency graph, no clean way to tailor scope per project without forking ontology packages.

## Decision

Collapse to a single canonical `@memo/ontology` package. Kinds carry **dimensions** as attributes, not as package membership:

- `ArchitectureElementKind` — `archLayer` attribute (operational | functional | … | safety | cybersecurity)
- `ComplianceElementKind` — `standard` + `clause` attributes
- `ArtifactElementKind` — concrete DHF document kinds (SAD, SRS, RMP, FMEA, …)
- `ViewpointTypeKind` — viewpoint type identifier

A single concrete kind (e.g. `Hazard`) may specialize multiple dimension kinds. Same instance surfaces in multiple UI tabs without duplication.

**Methodology (separate package, L2) selects subsets** of each dimension. `@memo/methodology-default` includes everything; tailoring (e.g. `@memo/methodology-gpca`) subtracts layers/standards/artifacts/viewpoints. Project pins methodology version, transitively pinning ontology version.

L0 helpers (`@memo/sysml-base`) hold dimension type defs, rule type, viewpoint base — no domain content.

## Consequences

**Reuse / modularity** — ontology authors edit one package; methodology authors edit one package; concerns separate cleanly along the L0/L1/L2 axis (helpers / kinds / scope), not by domain slice.

**Extensibility** — new dimension (e.g. `RegulatoryRegion`) adds a new dimension kind in L0 + tagging in L1, no package surgery. New methodology = new package extending default.

**UI** — tab content = `(ontology kinds tagged dim X) ∩ (methodology.includedX)`. Generic; same code path for every tab.

**Migration** — incremental phases E1–E9 in [memo-platform-architecture.md §11](../memo-platform-architecture.md). Build green at every phase boundary.

**Deprecated package names** — `@memo/ontology-core`, `@memo/ontology-medical`, `@memo/medical-modeling-profile`, `@memo/ontology-arch`, `@memo/ontology-process` all collapse into `@memo/ontology`. References in older docs remain for historical traceability.
