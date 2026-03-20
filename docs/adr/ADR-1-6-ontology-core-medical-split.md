# ADR-1-6: Ontology Core vs Medical Backbone Split

**Status:** Accepted
**Date:** 2026-03-19
**Context:** Ontology Backbone Restructuring

## Decision

MEMO will evolve from a single broad `@memo/ontology` package into a layered ontology stack:

1. **`@memo/ontology-core`** — domain-agnostic MBSE backbone
2. **`@memo/ontology-medical-base`** — reusable medical device development backbone built on top of core
3. **Product-family extensions** — infusion, ablation, monitoring, SaMD-specific concepts
4. **Rules / views / templates packages** — closure rules, completeness logic, DHF generation, examples

The current `@memo/ontology` package is treated as a transitional package whose contents must be reclassified and split.

## Why

The current ontology mixes four different concerns:

- domain-agnostic systems engineering concepts
- medical device regulatory concepts
- product/platform-specific concepts
- app/workbench-specific modeling conveniences

That prevents clean standalone publication and makes it difficult to defend the ontology as a reusable backbone for medical device development.

The target layering aligns with:

- **ISO/IEC/IEEE 42010** for architecture description structure
- **Arcadia/Capella** for operational/function/logical/physical separation
- **ISO 13485**, **ISO 14971**, **IEC 62304**, and **IEC 60601-1** for the medical backbone

## Boundary Rules

### `@memo/ontology-core`

Keep only reusable, domain-agnostic MBSE concepts:

- stakeholders, concerns, goals, capabilities
- operational concepts
- requirements and specification containers
- functions and behavior
- logical architecture
- physical architecture
- software architecture
- interfaces, ports, contracts, exchange items
- analysis, constraints, assumptions, parameters
- verification and evidence
- traceability relationships

Core must not contain:

- ISO 14971-specific risk constructs
- IEC 62304-specific lifecycle semantics
- IEC 60601-specific safety semantics
- product-family concepts
- ROS-specific concepts
- UI wireframe concepts
- app- or dashboard-specific viewpoints/rules

### `@memo/ontology-medical-base`

Build on top of core to provide a reusable medical device development backbone:

- intended use, indications, users, use environments
- design inputs, design outputs, design verification, design validation
- ISO 14971 risk concepts
- IEC 62304 software lifecycle concepts
- IEC 60601-1 safety and essential performance concepts
- ISO 13485-oriented traceable record concepts
- medical compliance relationships that remain ontology-level rather than rule-level

Medical base must not contain:

- product-family-specific device classes such as infusion-only or ablation-only parts
- workbench-specific closures, completeness metrics, or UI views
- app/runtime artifacts unrelated to the ontology itself

### Rules / Views / Templates

Keep out of ontology packages:

- closure rule implementations
- completeness scoring logic
- DHF generation/report rendering
- view filters and UI workbench concerns
- example projects and starter templates

These belong in separate packages such as `@memo/rules-medical` and `@memo/examples`.

## Current Content Classification

### Stays in Core

Files and concepts that should remain in the future core package:

- `packages/ontology/sysml/entities/business.sysml`
- `packages/ontology/sysml/entities/requirements.sysml` (after requirement stratification cleanup)
- `packages/ontology/sysml/entities/functional.sysml` (after adding operational split)
- `packages/ontology/sysml/entities/logical.sysml`
- generic portions of `packages/ontology/sysml/entities/physical.sysml`
- generic portions of `packages/ontology/sysml/entities/software.sysml`
- generic portions of `packages/ontology/sysml/entities/interfaces.sysml`
- generic portions of `packages/ontology/sysml/entities/cross-cutting.sysml`
- `packages/ontology/sysml/relationships/relationships.sysml`

### Moves to Medical Base

Files and concepts that should move into the medical backbone:

- `packages/ontology/sysml/entities/risk.sysml`
- medical-specific regulatory/reference semantics in `packages/ontology/sysml/entities/cross-cutting.sysml`
- medical-device design-control concepts that do not yet exist and must be added

### Moves to Product or Technology Extensions

These are too specific for both core and medical-base:

- `Catheter` in `packages/ontology/sysml/entities/physical.sysml`
- `RosNode` in `packages/ontology/sysml/entities/software.sysml`
- `RosTopic`, `RosService`, `RosPublication`, `RosSubscription`, `RosServiceCall` in `packages/ontology/sysml/entities/interfaces.sysml`
- `Docker` in `packages/ontology/sysml/entities/software.sysml`
- `packages/ontology/sysml/entities/ui.sysml`

### Stays Out of Ontology Packages

These remain rules/config/workbench concerns:

- closure rules in `packages/medical/memo.config.yaml`
- viewpoint filtering and diagram declarations in `packages/ontology/memo.config.yaml`
- completeness logic and compliance workflows

## Missing P0 Concepts

The current ontology must add the following before the split is complete:

- **Operational layer** — operational actors, operational entities, operational activities, mission phases/states, operational scenarios
- **Need separation** — stakeholder need vs system need vs functional/technical requirement
- **Specification containers** — requirement/specification groupings
- **Traceability normalization** — `refines`, `derives`, `constrains`, and actual SysML definitions for YAML-declared relationships
- **Analysis abstractions** — constraints, calculations, assumptions, measures, parameters

## Consequences

- The current `@memo/ontology` package should be considered transitional and broad, not the final standalone core release.
- Future work will split the package without changing the architectural intent recorded here.
- `@memo/medical` should eventually depend on `@memo/ontology-medical-base`, not directly on a monolithic base ontology.
