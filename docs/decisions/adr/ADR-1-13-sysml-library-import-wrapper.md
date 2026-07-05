# ADR-1-13: SysML Standard Library Import Wrapper

**Status:** Accepted
**Date:** 2026-05-02
**Reference:** [ADR-1-12](ADR-1-12-namespace-canonicalization.md), [platform.md](../../architecture/platform.md)

---

> **Update (2026-07):** following the `src/base` → `src/core` merge (see [ADR-1-12](ADR-1-12-namespace-canonicalization.md)), the wrapper lives at `memo::core::stdlib::*`. All `memo::base::stdlib::*` references below are historical; the wrapper's design and lint rule are unchanged.

---

## Context

The SysML v2 standard library (`ScalarValues`, `BaseFunctions`, `Collections`, etc.) is referenced under different qualified-name roots across the OMG pilot release, SysON, SysIDE, and Sysand `.kpar` resolution. Hardcoding any one form in 200+ ontology files locks MEMO to one implementation and forces a project-wide codemod every time a tool revs.

## Decision

Introduce a thin **library wrapper layer** under `memo::base::stdlib::*`. Every L1 ontology and L2 methodology file imports from `memo::base::stdlib::*` only. The wrapper re-exports standard library symbols and is the only place a kernel-path change lands.

```
memo::base::stdlib::scalars       → re-exports ScalarValues (Real, Integer, String, Boolean, ...)
memo::base::stdlib::collections   → re-exports Collections (List, Set, OrderedSet, ...)
memo::base::stdlib::functions     → re-exports BaseFunctions
memo::base::stdlib::time          → re-exports Time / Duration
```

Wrapper files are 100% `public import` plus minimal aliasing. No new types defined inside the wrapper.

**Rule (binding):** ontology and methodology files MUST NOT import standard library symbols by their kernel path. Lint enforces.

## Consequences

**Tool variability is absorbed at one boundary.** A SysON path change triggers exactly one wrapper edit; downstream files are untouched.

**Extra import indirection.** One additional `import` line per file, but the qualified name stays equally short (`ScalarValues::Real` vs `memo::base::stdlib::scalars::Real`).

**Lint enforcement.** Epic DD adds a lint rule rejecting kernel-path imports outside `memo::base::stdlib::*`. CI gate.

**Wrapper itself is portable.** The single set of files inside `memo::base::stdlib::*` is the only place any kernel-path divergence between SysON, SysIDE, Sysand needs to be reconciled. ADR-1-13 lint rejects kernel-path imports from elsewhere; the wrapper itself is exempt.

## Open follow-ups

- Wrapper goes live as part of Epic B (L0 helpers).
- Epic DD lint rule lands as DD-2.
- Initial wrapper picks the OMG pilot release path; tool-specific deltas isolate to wrapper edits.

## Pointers

- Wrapper home: `memo::base::stdlib::*` (Epic B)
- Lint enforcement: Epic DD-2
