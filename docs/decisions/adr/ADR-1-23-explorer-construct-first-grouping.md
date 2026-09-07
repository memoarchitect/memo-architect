# ADR-1-23: The Model Explorer Groups by Domain, Layer, Then Kind

**Status:** Accepted
**Date:** 2026-09-07
**Owners:** Architect maintainers
**Scope:** Model Explorer element tree (`computeExplorerGroupTree`)
**Related:** [ADR-1-11 single canonical ontology](ADR-1-11-single-canonical-ontology.md), [ADR-1-16 view presentation syntax](ADR-1-16-view-presentation-syntax-fallbacks.md)

## Decision

The Model Explorer groups elements by four rules, in this order, with no
per-branch exceptions.

**1. The top level is the ontology's own domain.** `memo/src` divides into
`architecture/` and `assurance/` before it divides into anything else, and that
is what a reader orients by first: what the device *is* versus what is claimed
*about* it.

**2. Then the layer, then the kind, then the parent/child hierarchy.** The
layer is the one the *element* reports — the ontology's *second* namespace
segment, not its first, which is the domain. Architecture divides into
operational, functional, behavior, logical, implementation and realization;
assurance into requirements, safety risk, cybersecurity, verification and human
factors.

**The SysML construct is not a level.** It decides what is a *row* — a
`connection` is an edge and a `view` is furniture, so neither is listed — but
it does not organise the tree. A reader opening the operational analysis wants
what is in it: the operative actions, the participants that perform them, the
use cases. Splitting a layer by construct first scattered it across six
branches, so parts, actions and use cases sit together under the layer they
belong to.

**A kind folder names the type the element DECLARES, and nothing above it.**
Resolution used to climb — through ontology superTypes and through project
definitions to what they specialize — until it reached a concrete ontology
kind, so a folder always named something the ontology knows. The cost was that
it named something the author did not write: `AfferaRosPublisher` and
`AfferaRosSubscriber` ports were filed under `SoftwarePort`, and the type the
model declares vanished from the tree. A project def two levels below the
ontology is the model's own structure, which the reader is entitled to see.

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

The tree mirrors the ontology's own directory structure, which is the thing
both the model and the methodology are already organised by. That is what makes
it need no per-branch judgement: there is no question of whether interfaces
deserve their own group or whether fork and join must be excluded from the
functions, because neither is a grouping decision the explorer makes. Strict
kinds put `ForkNode` and `JoinNode` in folders of their own as a consequence of
naming declared types, not as a rule about them.

An earlier revision made the SysML construct the top-level category. It read
cleanly for ports and interfaces and badly for everything else: one `Items`
branch of 989 could not distinguish interface payloads from hazard analysis,
and a reader after the operational analysis had to visit Parts, Actions and Use
Cases to assemble it.

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
ontology's top-level source directory, which is precisely the **domain** rule 1
groups by.

A kind the ontology never declared has no namespace to read a domain from, so
the domain is inferred from its layer through `LAYER_DOMAIN`. Without that,
every native SysML kind — `ItemDefinition`, `ActionDefinition` — would pile up
outside both domains.

## Consequences

Measured against the Affera model (6,058 elements):

- **The top level reads Architecture 894, Assurance 988, Methodology 1, Core
  41** on the Affera model, with no Undefined branch at all. Architecture
  divides into Operational Analysis 292, Functional Analysis 84, Behavior 193,
  Logical Architecture 108, Implementation 183, Realization 34.
- **Risk analysis reads as Assurance ▸ Safety Risk ▸ Hazard**, and the 298
  architectural `InterfaceItem`s stay in Architecture ▸ Logical, where a shared
  `Items` branch had put them together.
- **Enumerations get a home.** All five report `layer: unknown`, which stranded
  them in *"Undefined — Not in Ontology"*. `unknown` is the builder declining to
  name a layer, not a layer, so they add no layer folder; and since they are the
  only thing left without one once views, viewpoints and connections are
  excluded, they file under **Core**, where `core/enumerations` already keeps
  their kinds. A value type belongs to neither the architecture nor the claims
  made about it.
- **A `connection` is never a row.** Affera declares nineteen
  `MemoRelationship` definitions — `Composes`, `DeploysOnto`,
  `RealizesInterface`. `connection` is a construct, but it is the construct of
  the *edges*, and this tree lists elements. Composition is read from the
  `composes` relationships, so nothing depends on them appearing.
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
