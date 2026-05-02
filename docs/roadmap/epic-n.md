# Epic N: Consistency Rules In SysML

Wave: 1 (SysML foundation)

Priority: P0

Story Types: Design + Implementation (rule engine API)

Goal: replace `memo.rules.yaml` with `ConsistencyRule` part-def authored in SysML so rules participate in ontology versioning and standard tool inspection.

Depends on: Epic B (L0 helpers), Epic K.

## Stories

### N-1 ConsistencyRule part-def

Session target: 30 minutes or less.

- Add `memo::base::rules::ConsistencyRule` part-def with `appliesTo`, `predicate`, `strength`, `rationaleText`.
- Wire into `memo::base::*` exports.

Acceptance: rules base type imports cleanly.

### N-2 YAML rules codemod

Session target: 30 minutes or less.

- Migrate every entry in `memo.rules.yaml` to a `ConsistencyRule` instance under `memo::ontology::rules::*`.
- Delete the YAML once migration validates.

Acceptance: rule count matches and validator outputs identical results before/after.

### N-3 Coverage rule pack per standard

Session target: 30 minutes or less.

- Add C2 coverage rule pack per regulatory standard (ISO 14971, IEC 62304, FDA 21 CFR 820, ISO 13485, ISO 14155, FDA Cyber, IEC 62366, IEC 60601-1, IEC 82304-1).

Acceptance: each standard has at least one coverage rule referenced from a methodology scope.

### N-4 Lifecycle / cross-layer / quantitative rule packs

Session target: 30 minutes or less.

- Add C3 lifecycle, C4 cross-layer, C5 quantitative rule pack scaffolds.

Acceptance: scaffolds exist with at least one rule each.

### N-5 Refactor rule engine

Session target: 30 minutes or less.

- Refactor B6 rule engine to read rules from model registry instead of YAML.
- Add B6a constraint interpreter behind an internal interface.

Acceptance: validator runs entirely from SysML-sourced rules.

### N-6 `memo rules` CLI

Session target: 30 minutes or less.

- Add `memo rules list`, `memo rules check`, `memo rules explain`, `memo rules coverage`.

Acceptance: each subcommand prints stable text + JSON output.

## Epic Exit

- No YAML rules remain.
- Validator and CLI run against SysML-defined rules.

## GitLab Source Issues

#226–#231 (S6.1–S6.6)
