# Epic R: Archetypes In SysML

Wave: 2 (Methodology in SysML)

Priority: P0

Goal: replace YAML profile files with SysML `Archetype` parts so device-class presets ship inside the methodology package and `memo init` runs descriptor-driven.

Depends on: Epic G (default methodology).

## Stories

### R-1 Migrate YAML profiles to SysML

Session target: 30 minutes or less.

- Convert `profiles/{minimal,standard,full}.yaml` to `Archetype` parts under `memo::methodology::default::archetypes`.

Acceptance: archetype defs parse and resolve from methodology package.

### R-2 Device-class archetypes

Session target: 30 minutes or less.

- Add archetypes: `samd`, `connected`, `monitoring`, `infusion_pump`, `blank`.

Acceptance: each archetype resolves and selects a methodology subset.

### R-3 Descriptor-driven `memo init`

Session target: 30 minutes or less.

- Rewrite `apps/cli/src/commands/init.ts` to read archetypes from registry.
- Split into `init-wizard` and `archetype-loader` modules.

Acceptance: `memo init --archetype samd` produces a project pinning the archetype.

## Epic Exit

- No YAML profiles remain.
- `memo init` is descriptor-driven.

## GitLab Source Issues

#206–#208 (S10.1–S10.3)
