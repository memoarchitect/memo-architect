# Epic A: Methodology-Centered UI IA

Wave: 4 (UI thin wrapper)

Priority: P0

Story Types: Implementation

Goal: make methodology the primary way users understand active scope, while keeping ontology inspection secondary.

## Stories

### A-1 Methodology tab shell

Session target: 30 minutes or less.

- Add a read-only Methodology tab or mode.
- Render active methodology identity plus sections for scope, viewpoints, artifacts, rules, aliases, and workflow.
- Keep existing Ontology tab behavior intact.

Acceptance: Methodology appears in primary navigation and existing tabs still work.

### A-2 Methodology descriptor read path

Session target: 30 minutes or less.

- Locate the active methodology descriptor used by the web app.
- Connect Methodology tab sections to descriptor data where available.
- Show empty states for missing sections instead of hard-coding GPCA content.

Acceptance: Methodology tab displays live descriptor data or explicit empty states.

### A-3 Remove primary Ontology tab

Session target: 30 minutes or less.

- Remove Ontology from primary navigation.
- Preserve standalone or secondary ontology inspection tooling.
- Update user-facing docs that list main workbench tabs.

Acceptance: primary UI no longer exposes Ontology as a main tab; Methodology remains.

## Epic Exit

- `examples/gpca-pump` still boots.
- Primary surfaces are Dashboard, Model Explorer, Compliance, Artifacts/DHF, Diagrams, and Methodology.
