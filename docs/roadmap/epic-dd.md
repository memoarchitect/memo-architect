# Epic DD: SysML v2 Standard Conformance And Tool Interop

Wave: 1 (SysML foundation)

Priority: P0

Goal: guarantee that MEMO ontology and methodology packages open cleanly in **SysON**, **SysIDE**, and **Sysand** without MEMO-specific tooling, so authors can use any SysML v2 conformant editor — text editor remains the primary workflow.

Depends on: ADR-1-12, Epic K, Epic T.

## Stories

### DD-1 Conformance test suite

Session target: 30 minutes or less.

- Add a conformance suite that loads each ontology/methodology package through a SysON-compatible parser and asserts zero diagnostics.
- Run the suite against every PR.

Acceptance: suite runs in CI and gates merge on standard conformance.

### DD-2 Standard library import wrapper enforcement

Session target: 30 minutes or less.

- Audit every SysML file for kernel-path imports (per ADR-1-13, only `memo::base::stdlib::*` is permitted outside the wrapper itself).
- Add lint rule rejecting kernel-path imports outside the wrapper.

Acceptance: lint runs in CI; no ontology or methodology file imports standard library symbols by kernel path.

### DD-3 SysON round-trip smoke test

Session target: 30 minutes or less.

- Take the GPCA pump example, build to `.kpar`, install into SysON headless, export as SysML text, diff against source.

Acceptance: round-trip diff is empty (or has documented expected differences with rationale).

### DD-4 SysIDE compatibility check

Session target: 30 minutes or less.

- Verify SysIDE indexes the ontology package and resolves cross-package imports.
- Document any SysIDE-specific configuration required.

Acceptance: SysIDE opens GPCA pump and resolves all references.

### DD-5 Sysand publish dry-run

Session target: 30 minutes or less.

- Run `sysand publish --dry-run` for `@memo/sysml-base`, `@memo/ontology`, `@memo/methodology-default`.

Acceptance: each dry-run completes without errors and reports the publishable artifact.

### DD-6 Naming + casing lint

Session target: 30 minutes or less.

- Lint enforcing PascalCase part-defs / camelCase attributes / snake_case nested filename segments per ADR-1-12.

Acceptance: lint runs in CI and produces zero violations on main.

## Epic Exit

- MEMO packages are tool-agnostic. Authors can pick their editor — text, VS Code, SysON, SysIDE — without losing fidelity.
- CI gates merges on standard conformance.

## GitLab Source Issues

(new — no legacy mapping; supersedes implicit conformance work scattered across SFB, S7)
