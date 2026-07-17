# ADR-1-11: Single Canonical Ontology with Multi-Dimensional Kinds

**Status:** Accepted
**Date:** 2026-05-02
**Supersedes:** earlier multi-ontology layouts (now pruned from the decision log)
**Reference:** [platform.md](../../architecture/platform.md)

---

## Context

Earlier exploratory layouts split medical-device kinds across multiple packages — first into core/medical/extensions, then into an `ontology-arch` + `ontology-process` pair. Both kept ontology and methodology fused, so package boundaries doubled as scope boundaries: cross-package edits for any change touching both architecture and compliance, a brittle dependency graph, and no clean way to tailor scope per project without forking ontology packages.

This ADR is now fully realized on disk: one `memo::` namespace, one `src/` tree (directory = namespace), and a single `@memoarchitect/ontology` package. The `ontology-process` shell was removed and `ontology-arch` renamed to `@memoarchitect/ontology`.

## Decision

Collapse to a single canonical `@memoarchitect/ontology` package. Kinds carry **dimensions** as attributes, not as package membership:

- `ArchitectureElementKind` — `archLayer` attribute (operational | functional | … | safety | cybersecurity)
- `ComplianceElementKind` — `standard` + `clause` attributes
- `ArtifactElementKind` — concrete DHF document kinds (SAD, SRS, RMP, FMEA, …)
- `ViewpointTypeKind` — viewpoint type identifier

A single concrete kind (e.g. `Hazard`) may specialize multiple dimension kinds. Same instance surfaces in multiple UI tabs without duplication.

**Methodology (separate package, L2) selects subsets** of each dimension. `@memoarchitect/methodology-default` includes everything; tailoring (e.g. `@memoarchitect/methodology-gpca`) subtracts layers/standards/artifacts/viewpoints. Project pins methodology version, transitively pinning ontology version.

L0 helpers (`@memoarchitect/sysml-base`) hold dimension type defs, rule type, viewpoint base — no domain content.

## Consequences

**Reuse / modularity** — ontology authors edit one package; methodology authors edit one package; concerns separate cleanly along the L0/L1/L2 axis (helpers / kinds / scope), not by domain slice.

**Extensibility** — new dimension (e.g. `RegulatoryRegion`) adds a new dimension kind in L0 + tagging in L1, no package surgery. New methodology = new package extending default.

**UI** — tab content = `(ontology kinds tagged dim X) ∩ (methodology.includedX)`. Generic; same code path for every tab.

**Migration** — incremental phases E1–E9 in [platform.md §11](../../architecture/platform.md). Build green at every phase boundary.

**Deprecated package names** — `@memoarchitect/ontology-core`, `@memoarchitect/ontology-medical`, `@memoarchitect/medical-modeling-profile`, `@memoarchitect/ontology-arch`, `@memoarchitect/ontology-process` all collapse into `@memoarchitect/ontology`. References in older docs remain for historical traceability.
