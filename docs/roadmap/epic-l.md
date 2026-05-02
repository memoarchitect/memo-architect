# Epic L: Alignment And Merge

Wave: 4 (final)

Priority: P0

Story Types: Documentation + Implementation (cleanup pass)

Goal: remove competing plans, drop non-medical scope mentions per ADR-1-14, and align docs / ADRs / examples / roadmap / GitLab pointers after every other epic completes.

## Stories

### L-1 Docs conflict scan

Session target: 30 minutes or less.

- Search for stale roadmap epics, obsolete numeric story references, and old package names.
- Update docs that conflict with this roadmap.

Acceptance: no doc defines a competing roadmap.

### L-2 ADR supersession pass

Session target: 30 minutes or less.

- Update ADR index and supersession notes where old ontology/methodology split decisions conflict.
- Keep historical ADR text intact except for status/pointers.

Acceptance: decision index points to current architecture.

### L-3 Non-medical scope removal

Session target: 30 minutes or less.

- Remove every reference to automotive (ISO 26262) and aerospace (DO-178C) in docs, README, examples, and marketing content per ADR-1-14.
- Confirm `examples/`, `docs/src/`, and project README reflect medical-only scope.

Acceptance: grep for `automotive`, `aerospace`, `ISO 26262`, `DO-178C` returns only ADR-1-14 references.

### L-4 GitLab alignment checklist

Session target: 30 minutes or less.

- List GitLab epics, stories, and release milestones that should close, retarget, or be recreated against Epic A through Epic L.
- Do not rely on obsolete post-migration roadmap items.

Acceptance: GitLab cleanup has an explicit checklist.

## Epic Exit

- Architecture doc stays guidance-only.
- Roadmap folder owns the active execution plan.
- No obsolete epic references remain in the active roadmap.
