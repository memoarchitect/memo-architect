# Epic V: Module And Feature Flag Infrastructure

Wave: 4 (UI thin wrapper)

Priority: P2

Goal: model UI features as `FeatureModule` parts in SysML and load them lazily so UI stays a CLI-data wrapper.

Depends on: Epic P (shell).

## Stories

### V-1 FeatureModule part-def

Session target: 30 minutes or less.

- Add `memo::base::modules::FeatureModule` SysML part-def.

Acceptance: part-def parses and lists required attributes.

### V-2 Web feature loader

Session target: 30 minutes or less.

- `apps/web/src/shell/feature-loader.ts` reads module manifest, env vars, workspace flags; lazy bundle import.

Acceptance: loader imports a sample module on demand.

### V-3 `@memo/web-module-api`

Session target: 30 minutes or less.

- Publish TS types for `WebFeatureModule`.

Acceptance: third-party module compiles against the API.

### V-4 `memo features` CLI

Session target: 30 minutes or less.

- `memo features list/enable/disable/promote` reading and writing flags.

Acceptance: CLI mutates flags and the loader reflects changes on next boot.

## Epic Exit

- UI features ship as modules; flag set lives in config and SysML.

## GitLab Source Issues

#247–#250 (SMOD.1–SMOD.4)
