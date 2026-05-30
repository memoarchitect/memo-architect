# Ontology Portability — MEMO constraints are standard SysML v2

> **MEMO ontology constraints are standard SysML v2.** Open the released ontology in
> any conformant SysML v2 tool — it parses without error. MEMO *evaluates* the
> constraints; it does not own them.

## What this means

Epic EE migrated MEMO's consistency rules from a bespoke `ClosureRule` path to native
SysML v2 `constraint def` / `requirement def` bodies (KerML expressions). Those bodies
are **portable content**, not MEMO-private metadata:

- `constraint def hazardMaxControlsRule { require constraint { mitigates->size() <= 10 } }`
  is read identically by sysand, SysIDE, and SysON.
- An external tool is not required to *evaluate* the constraint (the KerML evaluator that
  computes pass/fail lives in `@memo/core`, see [constraint-evaluator.md](constraint-evaluator.md)).
  It only has to *parse* it. Parse-fidelity is the bar.

This is the exit gate for Epic EE and the precondition for cutting the standalone
`memo-sysmlv2` repo: if only MEMO could read the rules, the split would ship dead text.

## Portability gate (CI)

`scripts/sysand-portability-check.sh` builds each ontology project with the external
Sensmetry `sysand` tool and fails if the parse reports any error:

```bash
./scripts/sysand-portability-check.sh
# ▶ ontology               → memo_ontology-1.0.0.kpar built — 39 source files, zero errors
# ▶ ontology/methodology   → memo_methodology_default-1.0.0.kpar built — 10 source files, zero errors
# ✔ EE-5 portability gate PASSED — MEMO ontology constraints are portable SysML v2.
```

The same script runs in `.gitlab-ci.yml` (`sysand-portability` job) on any change under
`ontology/`. It complements Epic DD's `memo round-trip` / `memo check --sysml-compat`,
which are MEMO-internal model heuristics — this is the real external-tool round-trip.

## Standard authoring forms the ontology must use

The MEMO grammar (`packages/core/src/grammar/memo-sysml.langium`) is a **strict SysML v2
subset**: the two formerly-accepted non-standard forms are now **rejected by the parser**, so
compliance is guaranteed by construction (not only by lint):

| Former MEMO extension (now rejected) | Standard SysML v2 form |
|---|---|
| `package memo::a::b { … }` | nested `package memo { package a { package b { … } } }` |
| bare `title = "x";` | `attribute redefines title = "x";` (or `:>> title = "x";`) |

`PackageDeclaration` takes a single-identifier `name=ID`; the bare `ShorthandRedefinition`
rule was removed. The serializer and importers emit nested packages via the shared
`wrapPackage()` helper, so generated SysML is compliant too. Negative tests in
`parser.test.ts` assert the grammar rejects both forms.

Being a *subset* only constrains which **non-standard** forms are accepted — the subset
still grows to cover more **standard** SysML v2 constructs as the ontology needs them. Three
standard forms the grammar accepts (added for the gpca reference model, issue #516) are:

| Standard SysML v2 form | Used by |
|---|---|
| real (rational) literals — `attribute periodMs = 20.0;` | timing/quantity attributes |
| part feature-value / subsetting members — `part requirement = req1;`, `part protectedAsset :> asset1;` | the source/target ends of `SemanticLink` instances |
| nested untyped part bodies — `part selectionQuery { … }` | view selection queries |

The part feature-value / subsetting members carry the source/target ends of the
`SemanticLink` part defs in `memo::core::relationships`; the model builder projects those
into navigable relationships (see `LINK_RELATION_MAP` in `model/builder.ts`).

## Extending MEMO — via SysML v2, never via grammar

Domain extension happens through **standard SysML v2 mechanisms**, so any conformant tool
still reads the result:

1. **Specialize ontology definitions.** Import the ontology library and specialize its
   `part def` / `item def`s — e.g. `item def RadiationHazard :> Hazard`. This is how the
   gpca reference model and downstream device models extend MEMO today.
2. **Apply semantic metadata.** Define a `metadata def` (see `ontology/base/semantics.sysml`:
   `StandardReference`, `Provenance`) and apply it with `@Name` / `@Name { … }` on any
   element. This is SysML v2's purpose-built extension construct.

There is no MEMO-private syntax to learn or invent — if it isn't standard SysML v2, the
grammar rejects it, which is the point: extensions stay portable.

## The one portability rule that matters

External SysML v2 tools require a **single-identifier** name in a package *declaration*.
Qualified names (`::`) are valid only in *references*. MEMO therefore declares namespaces
in **nested** form — see rulebook **P1**:

```sysml
package memo {
    package rules {
        package quantitative {
            constraint def … { … }
        }
    }
}
```

not the former flat `package memo::rules::quantitative { … }` extension. The model builder
reconstructs the full FQN from the nesting, so imports and addressing are unchanged. This is
enforced both by the grammar (`name=ID`) and by the conformance test `EE-5: no qualified
names in package declarations`.

## Feeds into

- **CC-1 ontology quickstart** — "open the ontology in your own SysML v2 tool" walkthrough.
- **Epic J / FF** — `memo-sysmlv2` boundary inventory can place the rule packages on the
  ontology side, knowing they are genuinely portable.
