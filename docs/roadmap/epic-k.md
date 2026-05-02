# Epic K: Grammar Support

Original scope: F

Priority: P0

Goal: support the grammar features required by the architecture migration.

## Stories

### K-1 Scope expression grammar decision

Session target: 30 minutes or less.

- Test set literals and set difference syntax against current grammar.
- Decide whether methodology scope uses set difference or explicit lists.

Acceptance: no production methodology depends on speculative syntax.

### K-2 View and presentation syntax gap check

Session target: 30 minutes or less.

- Check support for `view def`, `private import`, and `presentationKind`.
- Document fallback syntax for unsupported constructs.

Acceptance: view/template work has known supported syntax.

## Epic Exit

- Grammar gaps are either implemented in thin slices or have explicit fallbacks.
