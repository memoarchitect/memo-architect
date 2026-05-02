# Epic D: Compliance Dimension

Wave: 1 (SysML foundation)

Priority: P0

Story Types: Implementation

Goal: introduce compliance as a first-class dimension grouped by standard.

## Stories

### D-1 Compliance folder skeleton

Session target: 30 minutes or less.

- Add `ontology/compliance/` conventions.
- Teach discovery to recognize `compliance/<standard>/`.
- Add one minimal fixture.

Acceptance: a compliance standard group can be discovered.

### D-2 First compliance kind migration

Session target: 30 minutes or less.

- Move one small regulatory kind into `compliance/<standard>/`.
- Add `standard` and optional `clause` metadata.
- Confirm discovery and imports.

Acceptance: one real kind is discoverable as compliance.

### D-3 Compliance UI group hook

Session target: 30 minutes or less.

- Connect the Compliance surface to discovered groups.
- Show standards grouped from registry data.
- Keep methodology filtering in Epic F.

Acceptance: compliance grouping is visible or testable without hard-coded standard lists.

## Epic Exit

- Compliance dimension exists in SysML layout and registry discovery.
- At least one compliance kind proves the migration path.
