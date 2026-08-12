# ADR-1-16: View and Presentation Syntax Fallbacks

**Status:** Accepted — **both fallbacks superseded 2026-08-12; the parser now
supports the standard forms**
**Session-3 note (native semantic contract):** Reviewed 2026-08-01. Constructs used by the native contract — `ref :>> targetRule : <ConstraintDef>`, `abstract constraint def`, nested `RulePolicy` parts — were verified in SysIDE before adoption.
**Date:** 2026-05-03
**Reference:** [platform.md](../../architecture/platform.md)

---

## Both fallbacks are obsolete (2026-08-12, R7-S1 audit)

This ADR's §17 action was *review/supersede obsolete parser fallbacks; accept
only standard constructs verified in supported tools*. The 2026-08-01 review
recorded the constructs it had verified but did not retract the two fallbacks
below, and the tree has contradicted both ever since:

1. **Import visibility modifiers are supported.** The grammar accepts them —
   `memo-tools/packages/tools/src/grammar/memo-sysml.langium`, the `Import` rule
   carries `visibility=('private' | 'public')?` — and the ontology uses
   `private import` throughout. The "production files MUST use bare imports"
   rule below is withdrawn; ADR-1-12's private-by-default target is now simply
   the rule.
2. **`presentationKind` is not written as repeated scalars.** Every view in
   `memo/src/viewpoints/**` writes the redefining collection form
   `attribute :>> presentationKind = (PresentationKind::blockDiagram);`. The
   repeated-scalar encoding below is withdrawn.

Everything after this section is the historical 2026-05-03 decision, retained
for the reasoning. Nothing in it constrains new files.

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

- Parser fixture: `memo-tools/packages/tools/src/__tests__/parser.test.ts`
- Standard import target: [ADR-1-12](ADR-1-12-namespace-canonicalization.md)
