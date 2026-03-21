# Medical Domain Configuration

The `@memo/medical` package is the medical workbench configuration layered on top of `@memo/ontology-medical`.

It now provides:

- closure rules for ISO 14971, IEC 62304, and IEC 60601 traceability/completeness
- medical-specific viewpoints and starter scaffolding
- workbench validation, viewpoints, and starter templates on top of the medical ontology
- second-pass medical semantics for IEC 62366 usability engineering, IEC 60601 safety structure, and IEC 62304 lifecycle work products

## Overview

| Metric | Count |
|---|---|
| Primary role | Rules + viewpoints + templates |
| Extends | `@memo/ontology-medical` |
| Closure Rules | 21 |
| Workbench Viewpoints | 5 |

## Standards Alignment

### ISO 14971 — Risk Management

The ontology-level risk concepts live in `@memo/ontology-medical`. The `@memo/medical`
package adds the validation and viewpoint layer that operationalizes them:

- Hazard identification → `Hazard` elements
- Risk analysis → `HazardousSituation`, `Harm`, `Risk` elements
- Risk control → `RiskControl` elements with `mitigates` relationships
- Verification → `Test` elements with `verify` relationships to controls

**Enforced by rules:** CR-MED-001 through CR-MED-006

### IEC 62304 — Software Lifecycle

The ontology-level software lifecycle concepts live in `@memo/ontology-medical`. The
medical workbench package adds traceability and completeness rules over them:

- User needs → System requirements → Software requirements
- Explicit lifecycle processes → activities → work products
- Software architecture decomposition
- Verification of requirements
- Software item safety classification
- SOUP and anomaly documentation

In the layered ontology, `UserNeed` remains the preferred medical-device term and
specializes the core `StakeholderNeed` concept.

**Enforced by rules:** CR-MED-007 through CR-MED-021

### IEC 60601 / IEC 60601-1-6 — Safety, Essential Performance, and Usability

The ontology-level safety, design-control, and product-UI concepts live in `@memo/ontology-medical`.
The medical workbench package adds usability and essential-performance checks over them:

- Use specifications, use-error analysis, and formative/summative evaluations
- Essential performance linked to safety functions, risk controls, and explicit loss conditions
- Collateral / particular-standard applicability traces
- User interface requirements linked to use errors and implemented UI elements
- Usability requirements verified by tests/validation artifacts

**Enforced by rules:** CR-MED-016 through CR-MED-018

## Usage

Projects extend the medical config:

```yaml
projectName: my-device
projectType: device
extends: "@memo/medical"
```

Projects inherit:

- `@memo/ontology-core` via `@memo/ontology-medical`
- `@memo/ontology-medical`
- `@memo/medical` rules, viewpoints, and starter templates
