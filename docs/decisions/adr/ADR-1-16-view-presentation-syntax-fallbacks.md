# ADR-1-16: View and Presentation Syntax Fallbacks

**Status:** Accepted
**Date:** 2026-05-03
**Reference:** [platform.md](../../architecture/platform.md)

---

## Context

Epic K-2 tested the current `packages/core` Langium grammar for the view and presentation constructs needed by upcoming ontology view/template work.

The grammar accepts simple `view def` declarations:

```sysml
view def RiskMatrixView :> DiagramView {
}
```

It does not accept SysML import visibility modifiers such as `private import` or `public import`. It also does not accept collection-shaped `presentationKind` declarations or assignments such as:

```sysml
attribute presentationKind : PresentationKind[*];
attribute presentationKind = { PresentationKind::riskTable };
```

Depending on those unsupported forms would make Wave 1 view files rely on syntax that the current parser cannot load.

## Decision

View/template files may use `view def` directly.

Until the grammar deliberately supports import visibility modifiers, production files parsed by `packages/core` MUST use bare imports:

```sysml
import memo::core::stdlib::*;
```

This is a parser fallback only. ADR-1-12 remains the standard-tool target, and the architecture still treats imports as private by default unless a file is an intentional re-export boundary.

Until the grammar supports collection-valued attributes and multiplicity on attribute members, presentation kinds MUST be encoded as repeated scalar enum-valued assignments:

```sysml
view def RiskMatrixView :> DiagramView {
    attribute presentationKind = PresentationKind::riskTable;
    attribute presentationKind = PresentationKind::matrix;
}
```

## Consequences

View/template work has a known supported authoring subset: simple `view def`, bare `import`, and repeated scalar `presentationKind` assignments.

Production view files must not use `private import`, `public import`, `attribute presentationKind : PresentationKind[*]`, or collection-valued `presentationKind` assignments until parser support lands with fixtures.

This ADR intentionally accepts a temporary mismatch between the standard SysML target and the current Langium subset. Epic DD can re-tighten syntax once the parser supports visibility modifiers and collection attributes.

## Pointers

- Parser fixture: `packages/core/src/__tests__/parser.test.ts`
- Standard import target: [ADR-1-12](ADR-1-12-namespace-canonicalization.md)
