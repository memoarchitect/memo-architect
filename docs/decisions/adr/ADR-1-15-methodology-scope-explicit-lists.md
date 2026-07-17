# ADR-1-15: Methodology Scope Uses Explicit Lists

**Status:** Accepted
**Date:** 2026-05-03
**Reference:** [platform.md](../../architecture/platform.md)

---

## Context

`platform.md` originally showed GPCA methodology tailoring as set difference:

```sysml
attribute includedArchLayers = defaultLayerSet.layers - {"cybersecurity"};
```

Epic K-1 tested the current `packages/core` Langium grammar for the methodology scope constructs needed by Wave 1. The grammar accepts scalar attribute assignments, but it does not accept set literals such as `{"operational", "functional"}` and does not accept set-difference expressions such as `defaultLayerSet.layers - {"cybersecurity"}`.

Depending on those expressions in production methodology SysML would make upcoming Wave 1 methodology files rely on speculative syntax.

## Decision

Methodology scope files MUST use explicit, fully enumerated scope entries for now. A tailored methodology such as GPCA does not express its scope as `default - exclusions`; it declares the final included and excluded values directly using grammar-supported scalar records.

Example shape:

```sysml
part gpcaScope : MethodologyScope {
    attribute includedArchLayer = "operational";
    attribute includedArchLayer = "functional";
    attribute includedStandard = "ISO 14971";
    attribute excludedKind = "SOUPComponent";
}
```

The semantic meaning remains the same as the platform architecture: methodology determines the visible subset. Only the authoring syntax changes from set algebra to explicit enumeration.

## Consequences

Production methodology packages must not use set literals or `A - B` set-difference syntax until the grammar deliberately supports and validates those constructs.

The default methodology and GPCA methodology will carry some duplicated list entries. That duplication is acceptable because the fallback is portable across the current parser and avoids unimplemented expression semantics.

If a future story adds first-class collection expressions to `packages/core`, this ADR can be superseded by a new ADR that restores set-difference authoring syntax with parser and semantic tests.

## Pointers

- Parser fixture: `memo-tools/packages/tools/src/__tests__/parser.test.ts`
- Current grammar behavior is explicit: methodology scope uses enumerated lists.
