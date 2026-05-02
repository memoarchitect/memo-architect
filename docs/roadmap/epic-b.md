# Epic B: L0 Helpers

Wave: 1 (SysML foundation)

Priority: P0

Depends on: ADR-1-12, ADR-1-13.

Goal: create helper SysML definitions for dimensions, methodology scope, and the standard library import wrapper. No domain content.

## Stories

### B-1 Base helper folder decision

Session target: 30 minutes or less.

- Inspect current `ontology/core/` or helper layout.
- Choose the active helper path.
- Document the choice in the nearest README or package note.

Acceptance: future helper edits have one clear target path.

### B-2 Dimension helper definitions

Session target: 30 minutes or less.

- Add `DimensionKind`.
- Add `ElementKind`, `ArchitectureElementKind`, `ComplianceElementKind`, `ArtifactElementKind`, and `ViewpointTypeKind`.
- Keep L0 free of medical-device domain kinds.

Acceptance: helper SysML parses and existing ontology loading still works.

### B-3 Methodology scope helper definitions

Session target: 30 minutes or less.

- Add `MethodologyLayerSet`, `MethodologyStandardSet`, `MethodologyArtifactSet`, and `MethodologyViewpointTypeSet`.
- Add `MethodologyScope`.
- Add `ElementKindAlias`.

Acceptance: methodology packages can import helper definitions.

### B-4 Standard library import wrapper

Session target: 30 minutes or less.

- Add `memo::base::stdlib::scalars`, `::collections`, `::functions`, `::time` as re-export-only wrapper packages per ADR-1-13.
- No new types defined inside the wrapper.

Acceptance: ontology files can import standard library symbols exclusively through `memo::base::stdlib::*`.

## Epic Exit

- L0 helper definitions exist under `memo::base::*` and contain no domain content.
- Standard library wrapper insulates ontology files from kernel-path differences across SysON / SysIDE / Sysand.
- No behavioral UI or project migration is required.
