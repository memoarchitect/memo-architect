# ADR-1-19: Geometry View Kind Deferred

**Status:** Accepted
**Date:** 2026-07-10
**Reference:** [sysmlv2-rulebook.md](../../design/sysmlv2-rulebook.md)

---

## Context

The SysML v2 specification defines eight standard view kinds; Epic KK requires
every MEMO diagram to resolve to exactly one of them. Seven kinds now have
standard rendering templates (KK-2 … KK-8). The eighth — **Geometry**, the
2D/3D spatial visualization of exposed elements' physical form and placement —
has no renderer, and a geometry-kind diagram currently falls through silently
to the standard graph renderer, which contradicts the kind's meaning.

KK-9 is the decision story: build a minimal 2D placement renderer, or defer
the kind explicitly.

Facts bearing on the decision:

- **MEMO's ontology carries no geometric data.** No kind declares coordinates,
  dimensions, footprints, or CAD references. A Geometry renderer would have no
  modeled spatial facts to render; any 2D placement it produced would be
  invented layout, not model content.
- **Medical device scope owns architecture, not mechanical design.** MEMO
  models logical/functional/physical architecture, requirements, and risk per
  ISO 14971 / IEC 62304 / ISO/IEC/IEEE 42010. Mechanical form lives in CAD
  tooling. In a regulated context where views feed design reviews and DHF
  artifacts, a view that *looks* like physical layout but is synthesized from
  nothing would be actively misleading.
- **No demand signal.** 0 of the 29 GPCA reference views are geometry-kind,
  and no legacy `diagramType` key semantically maps to it.

## Decision

**Defer the Geometry renderer.** No minimal-2D placement mode is built.

The kind remains a first-class citizen of the taxonomy, handled explicitly:

1. `geometry` stays in `VIEW_KINDS` (`memo-tools/packages/tools/src/model/view-kinds.ts`)
   and in `enum def DiagramViewKind` in the ontology. Parsing, building, and
   view validation accept declared geometry views without warnings.
2. **No legacy `diagramType` key maps to `geometry`.** The kind is reachable
   only by explicit `viewKind = DiagramViewKind::geometry` declaration. This
   is locked by a test so a future mapping addition is a deliberate act.
3. The web viewer renders declared geometry views as an **explicit deferred
   placeholder** (kind badge, explanation, pointer to this ADR) instead of
   silently falling back to the general graph renderer.

## Revisit trigger

Reopen this decision when either holds:

- the ontology gains geometry-bearing attributes (e.g. panel/enclosure layout
  for HMI or usability-engineering views), so a renderer would have real
  modeled facts to draw; or
- a user model declares geometry views in practice, demonstrating demand.

At that point the renderer joins `packages/web/src/views/templates/` as
`geometry-view.ts` alongside the other KK templates.

## Consequences

- Epic KK closes with 7 rendering templates + 1 explicitly deferred kind; the
  taxonomy is spec-complete and no diagram renders under the wrong semantics.
- Authors can declare geometry views today without validator noise; they see
  an honest "deferred" surface rather than a fake graph.
- No `geometry-view.ts` template file exists until the revisit trigger fires.

## Pointers

- Taxonomy + mapping lock: `memo-tools/packages/tools/src/model/view-kinds.ts`,
  `memo-tools/packages/tools/src/__tests__/view-kinds.test.ts`
- Deferred placeholder: `packages/web/src/views/DiagramCanvas.tsx`
