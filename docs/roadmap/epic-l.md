# Epic L: Alignment And Merge

Original scope: G

Priority: P0

Goal: remove competing plans and align docs, ADRs, examples, roadmap, and GitLab pointers after Epic A through Epic K.

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

### L-3 GitLab alignment checklist

Session target: 30 minutes or less.

- List GitLab epics, stories, and release milestones that should close, retarget, or be recreated against Epic A through Epic L.
- Do not rely on obsolete post-migration roadmap items.

Acceptance: GitLab cleanup has an explicit checklist.

## Epic Exit

- Architecture doc stays guidance-only.
- Roadmap folder owns the active execution plan.
- No obsolete epic references remain in the active roadmap.
