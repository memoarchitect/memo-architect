# Epic F: Methodology Scope Expansion

Wave: 2 (Methodology in SysML)

Priority: P0

Story Types: Design + Implementation (filter helper API)

Goal: make UI surfaces filter ontology dimensions by active methodology scope.

## Stories

### F-1 Viewpoint type scope

Session target: 30 minutes or less.

- Add viewpoint type scope to methodology descriptors.
- Ensure viewpoint instances expose a stable type reference.

Acceptance: descriptor data can include `includedViewpointTypes`.

### F-2 Dimension filter helper

Session target: 30 minutes or less.

- Add a reusable helper for `(ontology kinds in dimension) intersect (methodology included set)`.
- Preserve current behavior when a methodology does not declare a set.

Acceptance: helper has focused tests for included, excluded, and missing scope.

### F-3 Apply first UI filter

Session target: 30 minutes or less.

- Apply the helper to one UI surface, preferably Diagrams or Artifacts.
- Keep fallback behavior explicit.

Acceptance: one surface filters by methodology scope without project-specific hard-coding.

## Epic Exit

- Filtering contract exists and at least one primary surface uses it.
