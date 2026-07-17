# ADR-1-17: Three-Repo Split — memo-sysmlv2 / memo-cli / memo-architect

**Status:** Implemented; nested-submodule mechanics superseded by ADR-1-22
**Date:** 2026-05-29
**Supersedes:** the four-repo layout in [platform.md §10](../../architecture/platform.md#10-repo-layout-final-state) (`memo-base` / `memo-ontology` / `memo-methodologies` / `memo-architect`)
**Reference:** [ADR-1-12](ADR-1-12-namespace-canonicalization.md), [ADR-1-14](ADR-1-14-extension-package-policy.md), [platform.md](../../architecture/platform.md); GitLab Epics EE (#497), J (#356), FF (#504), GG (#505), HH (#506)

---

## Context

The prior target layout (platform.md §10) split the system into four repos: `memo-base` (L0 helpers), `memo-ontology` (L1), `memo-methodologies` (L2), and `memo-architect` (L3 — which bundled `core` + `cli` + `web` together).

Two pressures changed the grouping:

1. **Phased release by audience.** Different users want different layers: SysML/MBSE users want only the ontology; CI/terminal users want the CLI; visual users want the web app. The L0/L1/L2 content repos are not independently interesting to release — they are one product (the ontology) to the SysML audience. Meanwhile `core`+`cli` (the engine) and `web` (the tool UI) serve distinct audiences and should release independently, which the old "everything in memo-architect" grouping prevented.

2. **Rules as portable content (Epic EE).** Consistency rules are moving to native SysML v2 `constraint def` / `requirement def` (KerML expressions) instead of the proprietary `ClosureRule` enum / predicate-attribute parts. Once rules are standard SysML, the entire ontology — including its rules — is portable content consumable by any conformant tool (SysIDE, SysON, sysand). That makes a single pure-content repo the right release unit.

## Decision

Adopt a **three-repo split** along dependency lines:

```
memo-sysmlv2   pure SysML v2 / KerML content. No TypeScript, no engine.
               = old memo-base + memo-ontology + memo-methodologies, collapsed.
               Ships as a sysand package; consumable by SysIDE / SysON / sysand.
   ▲ data-dep
memo-cli       core engine (Langium grammar, parser, builder, validator,
               KerML constraint evaluator) + cli. Splits the engine OUT of the
               old memo-architect L3 bundle. Data-depends memo-sysmlv2.
   ▲ build-dep (core types) + runtime WebSocket (dev server)
memo-architect web app only (packages/web). Build-deps core types; reaches the
               cli dev server over the versioned WebSocket protocol at runtime.
```

Key facts:

- **The ontology content (L0/L1/L2) collapses into one repo** (`memo-sysmlv2`) — it is one release to one audience.
- **The L3 tool splits in two**: engine (`memo-cli`) vs UI (`memo-architect`), so CLI-only users are served without the web bundle.
- **Tools does not depend on Architect.** Tools owns headless commands and
  reusable operations. Architect depends on Tools and Ontology and owns every
  command that requires the visual client.
- **Rules ship as native SysML v2 constraints** (Epic EE), so `memo-sysmlv2` is portable, not engine config.

## Consequences

- Release phases: `memo-sysmlv2` first, then `memo-cli`, then `memo-architect`.
- Epic EE is the keystone gate (constraints must be native + portable before the sysmlv2 cut). Epic J prepares boundaries; Epics FF/GG/HH execute the cuts.
- ADR-1-14 (out-of-tree `@memoarchitect/ext-*` extensions) is unaffected — extensions remain separate repos.
- ADR-1-12 namespace scheme (`memo::{base,ontology,methodology}::*`) is unaffected — namespaces are package-path strings, independent of repo grouping. The three conceptual layers still exist; they just live together in `memo-sysmlv2`.
- Local dev keeps a workspace/subtree checkout; published consumers depend on versioned sysand artifacts, not tool internals.

## Implementation (2026-07-12)

The first cut was executed with **`memo-tools`** as the engine repo name (not
`memo-cli` — it also carries `tools/` ontology tooling and the VS Code extension):

| ADR name | Actual repo | Public repository |
|---|---|---|
| memo-sysmlv2 | `memo` | `memoarchitect/memo` |
| memo-cli | `memo-tools` | `memoarchitect/memo-tools` |
| memo-architect | `memo-architect` | `memoarchitect/memo-architect` |

Public naming follows the meMO four-layer stack (Ontology + Methodology →
`memo`; Tools → `memo-tools`; Architect → `memo-architect`). Cut mechanics:

- The former monorepo **is** the `memo-architect` webapp repo:
  the ontology was stripped into `memo` earlier, and the engine was stripped
  into `memo-tools` on 2026-07-12 — what remains is `packages/web` + docs +
  project scripts, with full history preserved. The GitHub copies are squashed
  public snapshots.
- `memo-tools` carries `memo-tools/memo` as a version-pinned git submodule.
- Dependencies are wired with git submodules mirroring the layer stack:
  `memo-architect` carries `memo-tools` (which nests
  `memo-tools/memo`), and its pnpm workspace globs the submodule
  packages so `@memoarchitect/architect` consumes `@memoarchitect/tools` as a normal `workspace:*`
  dependency. `memo-architect dev` from the nested example serves the full UI.
- `memo pack` remains headless in `@memoarchitect/tools`.
- `memo-architect build` and `memo-architect dev` live in
  `@memoarchitect/architect`; Tools tests do not skip because Architect is absent.

## Out of scope

- Splitting `memo-sysmlv2` content further (base/ontology/methodologies stay one repo unless a concrete release need appears).
- Changing sysand package identities/URNs (`urn:kpar:memo-ontology`, etc.) — package identity is orthogonal to repo grouping; revisit only if publishing requires it.

## Pointers

- Keystone (rules as native constraints): Epic EE (#497).
- Boundary prep: Epic J (#356) / J-1 (#357).
- Cuts: Epic FF memo-sysmlv2 (#504), Epic GG memo-cli (#505), Epic HH memo-architect (#506).
- Doc/ADR reconciliation: Epic L (#363) L-1/L-2.
