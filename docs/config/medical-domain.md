# Medical Domain Configuration

The `@memo/medical` package is the medical workbench configuration layered on top of `@memo/ontology-medical`.

It now provides:

- closure rules for ISO 14971 and IEC 62304 traceability/completeness
- medical-specific viewpoints and starter scaffolding
- a small set of transitional compatibility kinds that have not yet been migrated into `@memo/ontology-core` or `@memo/ontology-medical`

## Overview

| Metric | Count |
|---|---|
| Primary role | Rules + viewpoints + templates |
| Extends | `@memo/ontology-medical` |
| Closure Rules | 15 |
| Workbench Viewpoints | 4 |

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
- Software architecture decomposition
- Verification of requirements

**Enforced by rules:** CR-MED-007 through CR-MED-012

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
