# ADR-1-23: The SysML Construct Is the Model Explorer's Category

**Status:** Accepted
**Date:** 2026-09-07
**Owners:** Architect maintainers
**Scope:** Model Explorer element tree (`computeExplorerGroupTree`)
**Related:** [ADR-1-11 single canonical ontology](ADR-1-11-single-canonical-ontology.md), [ADR-1-16 view presentation syntax](ADR-1-16-view-presentation-syntax-fallbacks.md)

## Decision

The Model Explorer groups elements by four rules, in this order, with no
per-branch exceptions.

**1. The top-level category is the SysML construct.** Part, Action, Port, Item,
Interface, Requirement, Use case, Verification, Enumeration. Each is its own
category because the language says so, not because a judgement was made.
Interfaces are separate for the same reason ports are: interface is a construct.

**2. Inside a category: layer → kind → parent/child hierarchy.** The layer is
the one the *element* reports, not the ontology namespace its kind was declared
in. Kind folders are strict — a concrete kind never rolls up into an abstract
ancestor.

**3. A usage clubs under its definition when one exists; otherwise it takes its
own place in the breakdown.** An element earns a row by being defined or used.
A definition of an *ontology* kind that nothing uses does not get a row — it is
a Definitions-tab finding, and listing every one doubled the catalog. A
definition the *project* authored, whose kind the ontology does not declare — a
function def among them — is shown even when unused: that is the catalog the
conversion is building, and nothing else in the tool lists it. Usages are never
hidden, including one whose type is missing from the model.

**4. Relationships are edges, not rows.** `connection` is not listed because the
explorer lists elements. `view` and `viewpoint` are not listed because they are
the viewer's own furniture and have their own tab; the exclusion reaches
everything declared in a view's file.

## Rationale

Grouping by ontology layer required a decision per branch, and each new decision
contradicted an earlier one: whether interfaces deserved their own group, whether
`UsbConnectorPort` was a folder or a row, whether fork and join needed excluding
from the functions. Construct-first answers all three without a rule naming any
of them — the third is answered by rule 2's strict kinds, which already put
`ForkNode` and `JoinNode` in folders of their own.

The rule also survives a model the ontology has not seen. Every element carries
a construct even when its kind is unknown, so it lands somewhere predictable;
only a *missing construct* is a finding.

### Which "layer"

Three layer vocabularies exist in the codebase and none of them agree:

| Constant | Vocabulary | Example |
|---|---|---|
| `VIEWPOINT_LAYER_ORDER` | viewpoint layers | `risk`, `verification` |
| `LAYER_ORDER` | viewpoint vocabulary reused for elements | `risk`, `verification` — never names `implementation`, `realization`, `core` |
| `EXPLORER_SUBGROUP_ORDER` | ontology namespace directories | `safety-risk`, `verification-validation` |

Only the third matches what the builder actually emits on `MemoElement.layer`.
Rule 2 therefore orders by a fourth list, `EXPLORER_LAYER_ORDER`, spelled as the
model spells it, and compares with separators normalised so `safety_risk` and
`safety-risk` are one layer. `kindToLayerId` is *not* the layer — it is the
ontology's top-level source directory (`architecture`, `assurance`).

## Consequences

Measured against the Affera model (6,058 elements):

- **Risk analysis moves one level down.** 249 assurance elements — Hazard (53),
  HazardousSituation (53), Harm (53), SequenceOfEvents (53), RiskControlMeasure
  (7) — and 30 Vulnerabilities are `item` construct, so they read as
  **Items ▸ Safety Risk ▸ Hazard** rather than under a top-level Risk branch.
  Rule 2's layer level carries the distinction; no exception was added.
- **Enumerations get a home.** All five report `layer: unknown`, which stranded
  them in *"Undefined — Not in Ontology"* under layer-first grouping. `unknown`
  is the builder declining to name a layer, not a layer, so those kinds sit
  directly under their construct rather than in a folder called Unknown.
- **The "Other — SysML Diagram Elements" branch is gone.** An `ActionUsage` is
  an action; rule 1 admits no such category and rule 2 already keeps the kinds
  apart. `isNativeSysmlDiagramElement` and `buildLayerGroupsFromRegistry` were
  removed with it.
- **`ItemDefinition` is no longer hidden.** It was suppressed on the grounds
  that an untyped item is not yet a MEMO element. 394 of Affera's 440 are
  untyped usages in an *architecture* layer — exactly the gap the modelling
  guideline below exists to surface, and hiding the kind hid the finding.

## What this is not

The explorer holds no opinion about which layers *ought* to define. That is a
modelling guideline for the conversion work, not an explorer rule:

> **Architecture layers define; assurance layers state.**

The model already obeys it almost everywhere — `InterfaceItem` is 298/298
definitions; Hazard, Harm, HazardousSituation, SequenceOfEvents,
RiskControlMeasure and Vulnerability are 0/249, all usage-only. The one
exception is `ItemDefinition` in the behavior layer at 46/440. The explorer
shows the model as authored, so the tree fills in on its own as the conversion
progresses, and changing your mind about a layer needs no explorer edit.

## Tests

`packages/web/src/components/__tests__/explorer-group-tree.test.ts` is organised
by rule, and each case names the rule it holds down. A rule that needs a special
case added there is a rule that was wrong.
