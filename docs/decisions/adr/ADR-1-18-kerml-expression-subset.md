# ADR-1-18: KerML Expression Subset for Native Constraints

**Status:** Accepted
**Date:** 2026-05-29
**Reference:** [platform.md](../../architecture/platform.md), Epic EE (#497), EE-1 (#499)

---

## Context

MEMO's keystone thesis (Epic EE) is that well-formedness rules should be authored
as native SysML v2 / KerML boolean expressions inside `constraint def` /
`requirement def` bodies, instead of the proprietary `ClosureRule` enum or the
`predicate="..."` attribute hack interpreted by `RuleRegistry`.

The EE-0 spike (`packages/core/src/validator/constraint-eval.ts`) proved the
evaluator works against the built `MemoModel`, but it parsed expressions with a
hand-written recursive-descent parser. That parser is a stand-in — it lives
outside the SysML AST, so authored rules are not part of the parsed model.

The full KerML expression language is large (calculation defs, sequence
expressions, metadata access, invocation chains, conditional expressions, etc.).
Importing all of it is out of scope and out of proportion to the medical
well-formedness checks MEMO needs. We therefore define a **closed, documented
subset** that the Langium grammar accepts, and reject everything else with a
clear diagnostic rather than silently parsing.

## Decision

The MEMO Langium grammar supports the following KerML expression subset inside
`require constraint { … }` / `assert constraint { … }` members of `constraint def`
and `requirement def` bodies.

### Supported surface

- **Feature / relationship navigation:** bare `name`, and feature chains
  `a.b.c` (dot-separated identifiers).
- **Collection operations** (postfix `->`):
  `->size()`, `->notEmpty()`, `->isEmpty()`, `->forAll(expr)`,
  `->exists(expr)`, `->select(expr)`.
- **Operators**, by precedence (loosest to tightest):
  `or` < `and` < comparison (`== != >= <= > <`) < additive (`+ -`) <
  multiplicative (`* /`) < `not` < postfix `->` < primary.
- **Literals:** integer, string (`"…"`), boolean (`true` / `false`).
- **Grouping:** parentheses.

### Grammar / evaluator split

EE-1 lands the **grammar** for the full subset above: any such expression parses
into the SysML AST with zero errors. The **evaluator** (`constraint-eval.ts`)
consumes the Langium AST via a mapping layer (`langiumExprToNode`). The mapping
currently realizes the EE-0 evaluable core — single-segment navigation,
`size`/`notEmpty`/`isEmpty`, comparison, `and`/`or`/`not`, integer + boolean
literals — and raises a clear `deferred to EE-2` diagnostic for the grammar
surface whose evaluation is not yet implemented (`forAll`/`exists`/`select`,
arithmetic, string comparison, multi-segment feature chains).

This is intentional: grammar coverage runs ahead of evaluator coverage so that
authored rule files are stable while EE-2 fills in evaluation semantics.

### Closed subset

Anything outside the surface above (calculation defs, `if`/`then`/`else`
expressions, metadata `@`-access, invocation/instantiation, sequence literals,
unary minus on arithmetic, etc.) is **not** supported. The grammar rejects it as
a parse error; the mapping rejects grammar-legal-but-not-yet-evaluable forms with
an explicit message. We do not silently accept unsupported KerML.

## Consequences

- Rule authors have a known, documented authoring subset for native constraints.
- The hand-written tokenizer/parser in `constraint-eval.ts` is superseded for
  Langium-authored constraints; it remains only as the EE-0 string-expression
  entry point until EE-3 migrates all rules to native bodies.
- Grammar additions introduce keywords (`require`, `assert`, `and`, `or`, `not`,
  comparison/arithmetic operators). Identifiers colliding with these must be
  escaped via the grammar's name-escape rules.
- The subset can be widened later (new ADR) as medical well-formedness needs
  grow; widening must stay closed and documented.

## Pointers

- Grammar: `packages/core/src/grammar/memo-sysml.langium` (constraint expression rules)
- Evaluator + mapping: `packages/core/src/validator/constraint-eval.ts`
- Tests: `packages/core/src/__tests__/constraint-grammar.test.ts`
- Spike origin: EE-0 (`constraint-eval.ts` header)
