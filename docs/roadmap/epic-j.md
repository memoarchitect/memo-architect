# Epic J: Repo Split Preparation

Wave: 4 (UI thin wrapper)

Priority: P1

Story Types: Design (boundary inventory + split checklist)

Goal: prepare package and repository boundaries for `memo-base`, `memo-ontology`, `memo-methodologies`, and `memo-architect`.

## Stories

### J-1 Boundary inventory

Session target: 30 minutes or less.

- Inventory files belonging to L0, L1, L2, and L3.
- Identify cross-boundary imports that block a split.

Acceptance: split blockers are listed with owners.

### J-2 Package manifest cleanup

Session target: 30 minutes or less.

- Align package names and manifests with final boundaries.
- Keep local workspace integration working.

Acceptance: package metadata no longer contradicts final naming.

### J-3 Split execution checklist

Session target: 30 minutes or less.

- Write the concrete split checklist: move order, subtree strategy, verification commands, ADR updates.

Acceptance: repo split can be executed later without rediscovering boundaries.

## Epic Exit

- Final split is planned and unblocked enough to execute after Epic L.
