# Epic Z: Plugin System And Extension Pattern

Wave: 4 (UI thin wrapper)

Priority: P3

Story Types: Architecture (plugin API contract)

Goal: formalise the plugin API and prove the out-of-tree extension pattern with **medical sub-domain** examples (per ADR-1-14, MEMO is medical-only — automotive and aerospace are out of scope).

Depends on: Epic V (module infra), ADR-1-14.

## Stories

### Z-1 Plugin API package

Session target: 30 minutes or less.

- `@memo/plugin-api` package: TS types, load contract, conflict resolution rules, version compatibility metadata.
- Document required `.project.json` `usage[]` URN format for plugins.

Acceptance: API package publishes types and a load contract; gpca-pump can declare a plugin dependency.

### Z-2 Reusable element libraries

Session target: 30 minutes or less.

- `@memo/lib-*` standard component libraries (e.g. common medical-device components: pumps, sensors, alarms — concrete kinds, not domain extensions).
- Discoverable via `usage[]` in `.project.json`.

Acceptance: at least one `@memo/lib-*` resolves into a project and adds reusable components.

### Z-3 Loader for `memo::ontology::ext::*` namespace

Session target: 30 minutes or less.

- Loader auto-discovers extension packages declared in `usage[]`.
- Scans each extension's `ontology/ext/<id>/` and registers kinds under `memo::ontology::ext::<id>::*`.
- Conflict resolution per Z-1 rules.

Acceptance: a sample out-of-tree `@memo/ext-sample` package registers without modifications to core.

### Z-4 Medical sub-domain extension example

Session target: 30 minutes or less.

- One illustrative medical sub-domain extension (e.g. `@memo/ext-ivd` or `@memo/ext-surgical-robotics`) demonstrating the pattern.
- Lives in a separate package, ships independently, declares its compliance scope in `.project.json` metadata.

Acceptance: example extension parses, registers under `memo::ontology::ext::<id>::*`, and adds at least one kind discoverable by gpca-pump or a sister project.

## Epic Exit

- Plugin contract is documented and proven by one out-of-tree extension and at least one reusable library.
- Loader treats extensions as first-class but does not assume their domain.

## Out Of Scope

Per ADR-1-14:

- `@memo/automotive` (ISO 26262) — dropped.
- `@memo/aerospace` (DO-178C) — dropped.
- Any non-medical compliance regime.

## GitLab Source Issues

#261 (S5.8 ext namespace loader → Z-3), #313 (SCM.1 plugin formalisation → Z-1), #314 (SCM.2 reusable libs → Z-2). #315 (SCM.3 automotive) and #316 (SCM.4 aerospace) close as obsolete per ADR-1-14.
