# Epic O: Renderer Dispatcher

Wave: 4 (UI thin wrapper)

Priority: P0

Goal: introduce a renderer dispatcher with `RendererPlan` so each diagram kind is an isolated module wrapping ontology data, never owning truth.

Depends on: Epic C, Epic D, Epic E (dimension data must exist first).

## Stories

### O-1 Dispatcher core

Session target: 30 minutes or less.

- Add `apps/core/src/renderer/dispatcher.ts` with `RendererPlan` type.
- Define plan inputs from descriptor + viewpoint.

Acceptance: dispatcher selects renderer module by viewpoint type id.

### O-2 BDD renderer module

Session target: 30 minutes or less.

- Extract BDD renderer from existing `DiagramCanvas` into `apps/web/src/features/renderers/bdd/`.
- Default-on feature flag.

Acceptance: BDD diagrams render via dispatcher with no behavior change.

### O-3 IBD, AFD, decomposition tree modules

Session target: 30 minutes or less.

- Per-renderer folder + flag for IBD, AFD, decomposition tree.

Acceptance: each renders behind a flag without touching shared canvas code.

### O-4 Matrix + table renderer modules

Session target: 30 minutes or less.

- Add matrix and table renderer modules under same dispatcher contract.

Acceptance: matrix and table viewpoints render via dispatcher.

## Epic Exit

- Adding a new diagram kind requires only a new renderer module + flag.

## GitLab Source Issues

#256–#259 (S4.1–S4.4)
