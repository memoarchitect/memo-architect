# Requirements & Functional Architecture Baseline

This baseline is a code-first, architecture-level decomposition of MEMO.

It replaces assumption-driven feature lists with implementation-derived evidence from:

- static code scan of production TypeScript modules (`180` files)
- AST-derived function inventory (`968` function-like symbols)
- runtime startup/protocol observation from `memo dev`
- existing LikeC4 architecture model in `docs/likec4/model.c4`

## Method

### 1. Bottom-up decomposition

The analysis starts at implementation symbols and rolls up:

1. `Function` (AST symbol)
2. `Module` (source file)
3. `Subsystem` (directory-level responsibility slice)
4. `Capability domain` (product-level functional area)
5. `User-facing workflow and compliance outcome`

### 2. SOP-ish + EARS requirements engineering

- User needs are captured in SOP-ish format (`Stakeholder`, `Objective`, `Problem`).
- Software requirements are expressed in EARS patterns (`When`, `If`, `While`, `Where`, `The system shall`).

### 3. End-to-end traceability

Each row in the matrix maps:

`User Need -> Software Requirement -> Feature -> Verification Test -> Code Evidence`

## Functional Similarity Domains

1. `CFG` Project Bootstrap & Configuration
2. `MDP` Semantic Model Pipeline
3. `VAL` Validation & Completeness
4. `UIX` Workbench UX & Navigation
5. `DGM` Diagram Authoring & Layout
6. `DHF` DHF Workbench & Evidence Generation
7. `IOP` Import/Export & Interoperability
8. `ONT` Ontology Lifecycle Management
9. `LLM` AI-Assisted Flows
10. `EXT` Extensibility & Plugin Platform

## Runtime Validation Notes

Runtime was validated by starting `pnpm example:dev` and observing:

- server boot and model build (`159` elements, `248` relationships)
- live endpoint `http://127.0.0.1:3000`
- initial WebSocket stream containing:
  - `model:update`
  - `validation:update`
  - `completeness:update`
  - `ontology:packages`
  - `llm:status`

## Documents

- [Functional Decomposition Tree](functional-decomposition-tree.md)
- [Runtime Surfaces](runtime-surfaces.md)
- [Capability Statistics](capability-statistics.md)
- [Function Catalog (Exhaustive)](function-catalog.md)
- [User Needs (SOP-ish)](user-needs.md)
- [Software Requirements (EARS)](software-requirements.md)
- [Feature Catalog](feature-catalog.md)
- [Verification Tests](verification-tests.md)
- [Traceability Matrix](traceability-matrix.md)
