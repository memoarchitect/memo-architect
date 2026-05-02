# Epic B: L0 Helpers

Original scope: E1

Priority: P0

Goal: create helper SysML definitions for dimensions and methodology scope without moving domain content.

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

## Epic Exit

- L0 helper definitions exist and contain no domain content.
- No behavioral UI or project migration is required.
