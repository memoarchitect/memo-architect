# Epic G: Default Methodology

Wave: 2 (Methodology in SysML)

Priority: P0

Story Types: Implementation

Goal: establish `@memo/methodology-default` as the comprehensive medical-device methodology.

## Stories

### G-1 Rename impact inventory

Session target: 30 minutes or less.

- Search references to `@memo/methodology-medical-default`.
- Classify each as rename, alias, or legacy note.

Acceptance: rename checklist is complete before package changes.

### G-2 Default methodology package alias

Session target: 30 minutes or less.

- Add a compatibility alias or package metadata for `@memo/methodology-default`.
- Keep the old package resolvable during the transition.

Acceptance: both old and new names can resolve or the migration path is explicit.

### G-3 Default scope completeness pass

Session target: 30 minutes or less.

- Add or verify default methodology includes all architecture layers, supported standards, artifact kinds, and viewpoint types available so far.

Acceptance: default methodology is inclusive and has no GPCA-specific subtraction.

## Epic Exit

- `@memo/methodology-default` is the intended default name.
- Existing projects are not broken by the transition.
