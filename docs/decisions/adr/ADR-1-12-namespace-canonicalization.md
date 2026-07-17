# ADR-1-12: Namespace Canonicalization for SysML v2 Standard Tool Interop

**Status:** Accepted
**Date:** 2026-05-02
**Supersedes:** none (refines [ADR-1-11](ADR-1-11-single-canonical-ontology.md))
**Reference:** [platform.md](../../architecture/platform.md)

---

> **Update (2026-07):** `src/base/*` was merged into `src/core/*`. Every `memo::base::*` reference below (L0 helpers, `memo::base::stdlib::*`, etc.) now resolves as `memo::core::*`. The three-segment scheme and directory-mirrors-namespace rule this ADR establishes are otherwise unchanged; this note documents the root-segment rename in place rather than rewriting the historical decision text below.

---

## Context

The existing repository contains conflicting namespace conventions:

- Legacy roadmap (W1.P*–W3.P*, issues #186–#319) targeted `memo::arch::<layer>::*`, `memo::core::*`, `memo::profile::*`, `memo::process::*`.
- `platform.md` describes a single canonical `@memoarchitect/ontology` with conceptual layers (L0 helpers, L1 ontology, L2 methodology) but does not pin the SysML package path strings.
- Currently committed SysML packages mix several styles (e.g. `medical-modeling-profile`, `ontology-arch`, `ontology-process`).

Independently, the project commits to staying compatible with standard SysML v2 toolchains — **SysON**, **SysIDE**, and **Sysand** — so that authors can use a plain text editor or any conformant tool. Standard tools resolve packages by qualified name, expect canonical SysML v2 kernel/library imports, and consume `.kpar` packages produced by Sysand.

A canonical namespace scheme is required before incremental migration epics (B–H) move kinds around. Picking it once avoids two codemod passes.

## Decision

**Three-segment qualified names anchored at `memo::`.** Top-level segment partitions the L0/L1/L2 stack:

| Layer | Root namespace | Example fully-qualified path |
|---|---|---|
| L0 helpers | `memo::base::*` | `memo::base::dimensions::ElementKind` |
| L1 ontology | `memo::ontology::*` | `memo::ontology::architecture::software::SoftwareElement` |
| L2 methodology | `memo::methodology::<id>::*` | `memo::methodology::default::scope::defaultScope` |
| L3 project | project package per `memo init` | `gpca::pump::system::PumpSystem` |
| Vendor / domain extension | `memo::ext::<vendor>::*` | `memo::ext::aerospace::AerospaceProfile` |

Within `memo::ontology`, the second segment names the **dimension** (`architecture`, `compliance`, `artifacts`, `viewpoints`, `views`, `relationships`, `rules`). The third segment refines the dimension by sublayer, standard, or document kind — e.g. `memo::ontology::architecture::software`, `memo::ontology::compliance::iso_14971`, `memo::ontology::artifacts::software_architecture_document`.

**Standard-tool conformance constraints (binding):**

1. Package files use SysML v2 standard `package <qualifiedName> { ... }` syntax. No tool-specific extensions in ontology files.
2. Cross-package references use `private import <qualifiedName>::*` or `public import <qualifiedName>::*`. No relative paths, no Langium-only shorthand.
3. Standard library imports use canonical SysML v2 paths (e.g. `ScalarValues`, `BaseFunctions`) when available. Custom helpers live under `memo::base::*` only.
4. Files are organized so that **directory path mirrors qualified name**: `memo::ontology::architecture::software::*` lives under `ontology/architecture/software/*.sysml`. Sysand `.kpar` build, SysON file resolution, and SysIDE indexing all assume this.
5. Identifiers use SysML v2 conventional case: PascalCase for `part def` / `item def` / `enum def`; camelCase for attribute names; **snake_case for all filenames and nested directory segments per Python file-naming convention** (e.g. `iso_14971`, `software_architecture_document`, `risk_management_plan`). Hyphens (`-`) are forbidden in any path segment because SysML v2 qualified-name segments cannot contain them.
6. `.project.json` (Sysand) is the package descriptor of record; `package.json` for the npm workspace is for build tooling only.
7. Every L1 ontology package is round-trippable: `sysand build` must produce a `.kpar` that imports cleanly into SysON without errors.

## Consequences

**Migration cost** — every legacy `memo::arch::*`, `memo::core::*`, `memo::profile::*`, `memo::process::*` reference moves once. Codemod runs as part of Epic C (architecture migration). Scope: ~190 SysML files plus all `import` statements. Bounded by codemod script.

**Compatibility** — `@memoarchitect/ontology-core`, `@memoarchitect/ontology-medical`, `@memoarchitect/ontology-arch`, `@memoarchitect/ontology-process`, `@memoarchitect/medical-modeling-profile` are deprecated package names from prior ADRs. The new package mapping is:

| Deprecated package | New package | New root namespace |
|---|---|---|
| `@memoarchitect/ontology-core` | `@memoarchitect/sysml-base` | `memo::base::*` |
| `@memoarchitect/ontology-arch` | `@memoarchitect/ontology` | `memo::ontology::architecture::*` |
| `@memoarchitect/ontology-process` | `@memoarchitect/ontology` | `memo::ontology::compliance::*` + `memo::ontology::artifacts::*` |
| `@memoarchitect/medical-modeling-profile` | `@memoarchitect/methodology-default` | `memo::methodology::default::*` |

**Tool interop is enforceable** — CI runs the external build and compatibility
checks for the supported SysML toolchain. A failure blocks merge.

**Forbidden patterns** — `package memo::arch::*` and `package memo::profile::*`
are not part of the canonical namespace. Filenames and nested directory segments
use snake_case; hyphens are forbidden in namespace path segments.

## Pointers

- Current platform architecture: [platform.md](../../architecture/platform.md)
