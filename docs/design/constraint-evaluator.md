# Constraint Evaluator — Value Model & Semantics (Epic EE)

Design note for the KerML-subset evaluator in
`packages/core/src/validator/constraint-eval.ts`. Authoring subset is fixed by
[ADR-1-18](../decisions/adr/ADR-1-18-kerml-expression-subset.md); this note
documents the evaluator's runtime semantics (the EE-2 breadth).

## Value model

```
Value = boolean | number | string | MemoElement | MemoElement[]
```

- **Relationship navigation** yields `MemoElement[]`.
- **Attribute / typed-field access** yields a `string` scalar (`''` when absent).
- **Literals** are `boolean`, `number`, `string`.
- **`subject` / `allOfKind`** yield a `MemoElement` / `MemoElement[]`.

Coercions (used by operators):

| context | rule |
|---|---|
| truthiness (`and`/`or`/`not`, bare constraint result) | bool→self; number→`≠0`; string→non-empty; collection→non-empty; element→true |
| numeric (`+ - * /`, ordering) | number→self; bool→0/1; string→`Number(s)` (NaN→0); collection→size; element→1 |
| `->size/notEmpty/isEmpty` | length of collection **or** string |

## Navigation & resolution order

A feature-chain segment resolves against the current element in this order:

1. `attributes` — the attribute-map accessor; the **next** segment (or `["key"]`
   index) names the attribute key (`attributes["safetyClass"]` ≡ `attributes.safetyClass`).
2. **Relationship** — if `segment.toLowerCase()` is a key in
   `model.relationshipsByType`, navigate it (outgoing targets ∪ incoming sources,
   matching ClosureRule `direction: 'any'`). Yields a collection.
3. **Typed field** — `kind`, `layer`, `construct`, `allocatedTo`, `name`, `id`,
   `package`, `shortId`. Yields a string scalar.
4. **Attribute** — otherwise `attributes[segment]` (`''` when absent).

Relationship navigation chains across collections (flatMap); attribute access on
a collection is an error.

## Quantifier evaluation (nested scope)

`coll->forAll(e)`, `->exists(e)`, `->select(e)` evaluate the body with each
collection element bound as the **implicit subject** (`current`), while `subject`
keeps referring to the constraint's **root** element (`Env { root, current }`).
`forAll`→`every`, `exists`→`some`, `select`→filtered collection.

`allOfKind("Kind")` exposes a kind extent so cross-element rules (uniqueness) have
a native form.

## Error handling

Grammar-legal-but-unsupported and type-misuse cases throw with a clear message
(unsupported collection op, attribute-on-collection, navigation on a primitive,
quantifier on a non-collection). The evaluator never silently mis-evaluates.

## ClosureRule → native expression (EE-3 migration contract)

Every `ClosureRuleDefinition` predicate (`config.ts`) has a native equivalent:

| ClosureRule predicate | Native KerML-subset expression |
|---|---|
| `requireRelationship` (min 1) | `rel->notEmpty()` |
| `requireRelationship` (min N) | `rel->size() >= N` |
| `cardinalityCheck` (min,max) | `rel->size() >= min and rel->size() <= max` |
| `conditionalRequireRelationship` | `(attributes["a"] == "v") implies rel->notEmpty()` → authored as `not (cond) or rel->notEmpty()` |
| `requireAttribute` | `attributes["a"]->notEmpty()` |
| `uniqueAttribute` | `allOfKind("K")->select(attributes["a"] == subject.attributes["a"])->size() <= 1` |

`relatedKinds` filtering composes via `->select(kind == "K")` on the navigated
collection. `direction` other than `any` is deferred (current navigation is
always bidirectional, matching the dominant ClosureRule default).
