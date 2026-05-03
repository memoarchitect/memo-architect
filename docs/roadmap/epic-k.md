# Epic K: Grammar Support

Wave: 1 (SysML foundation)

Priority: P0

Story Types: Architecture (grammar decisions; may require new ADR)

Goal: support the grammar features required by the architecture migration.

## Stories

### K-1 Scope expression grammar decision

Session target: 30 minutes or less.

- Test set literals and set difference syntax against current grammar.
- Decide whether methodology scope uses set difference or explicit lists.

Acceptance: no production methodology depends on speculative syntax.

Status: done - ADR-1-15 records the fallback to explicit enumerated methodology scope entries; current parser fixtures reject set literals and `A - B` set difference.

### K-2 View and presentation syntax gap check

Session target: 30 minutes or less.

- Check support for `view def`, `private import`, and `presentationKind`.
- Document fallback syntax for unsupported constructs.

Acceptance: view/template work has known supported syntax.

## Epic Exit

- Grammar gaps are either implemented in thin slices or have explicit fallbacks.
