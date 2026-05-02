# Epic T: Sysand Packaging And Tool Interop Format

Wave: 1 (SysML foundation)

Priority: P0

Goal: adopt the Sysand package format (`.project.json`, `sysand-lock.toml`, `.kpar` build) so MEMO ontology and methodology packages are consumable by SysON, SysIDE, and Sysand without a MEMO-specific loader.

Depends on: ADR-1-12.

## Stories

### T-1 Drop `memo.package.yaml`, add `.project.json`

Session target: 30 minutes or less.

- Add `.project.json` (FB2) per Sysand spec with `usage[]` URNs.
- Remove `memo.package.yaml`.

Acceptance: every ontology/methodology package has `.project.json`.

### T-2 Drop `memo.lock.yaml`, adopt `sysand-lock.toml`

Session target: 30 minutes or less.

- Replace lockfile.

Acceptance: project pin resolves through `sysand-lock.toml`.

### T-3 CI step `sysand build` to `.kpar`

Session target: 30 minutes or less.

- Add CI job producing `dist/<pkg>-<version>.kpar`.

Acceptance: CI artifact contains a valid `.kpar` per push.

### T-4 CI-aggregator pattern

Session target: 30 minutes or less.

- Use `MEMO_<AREA>_<TOPIC>.sysml` aggregator files with `public import` only (FB1).

Acceptance: aggregator pattern documented and applied to one area.

### T-5 FB5 reclassification

Session target: 30 minutes or less.

- Reclassify `Hazard`, `Harm`, `Threat` and similar concrete-noun kinds from `part def` to `item def` (FB5).
- Coordinate impact on builder + validator.

Acceptance: reclassified kinds parse, validate, and serialize without regression.

### T-6 FB6 specialization keyword

Session target: 30 minutes or less.

- Replace `:>` with `specializes` in ontology layers (FB6); methodology profile keeps `:>`.

Acceptance: ontology files use `specializes`; methodology files unchanged.

### T-7 FB7 explicit multiplicity

Session target: 30 minutes or less.

- Enforce explicit multiplicity via lint + auto-repair codemod.

Acceptance: lint flags any feature missing multiplicity.

### T-8 CODEOWNERS for ontology

Session target: 30 minutes or less.

- Add CODEOWNERS requiring Method Steward + Syntax Steward review on `ontology/**`.

Acceptance: CODEOWNERS file enforces dual review.

## Epic Exit

- Ontology and methodology packages build to `.kpar` and import into SysON without errors.

## GitLab Source Issues

#209–#216 (SFB.1–SFB.8)
