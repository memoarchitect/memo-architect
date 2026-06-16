# ADR-1-8: Project Configuration Format Contract

**Status:** Accepted
**Date:** 2026-04-08
**Context:** Phase N0 — Product Contract Stabilization (#125)

## Decision

MEMO uses **two distinct configuration formats**, one per artifact type. The canonical format for each is specified below and is the single source of truth for all documentation, examples, and CLI behaviour.

---

## Format 1: Device Project — `memo.config.yaml`

Device projects (created with `memo init`) use a **single monolithic file** at the project root.

### File: `memo.config.yaml`

```yaml
projectName: my-device           # Required. Human-readable project identifier.
projectType: device              # Required. Always "device" for end projects.

extends: "@memo/medical-modeling-profile"  # Required. Ontology profile to inherit.

ontologies:                      # Optional. Additional ontology extension packages.
  - name: "@memo/ontology-clinical"
    version: "^0.1.0"
```

### Rules

- **Always at the project root** — never in `.memo/` or a subdirectory.
- **No `kinds:` block** — kinds are defined by the SysML source files in the ontology packages, not in project config.
- **No `closureRules:` block** — closure rules are owned by profile packages (e.g., `@memo/medical-modeling-profile`).
- **No `cosmaLayers:` block** — layer colors and labels are owned by `memo.rendering.yaml` in the ontology package.
- Projects inherit everything from `extends` and from the `ontologies` list. Project config is intentionally minimal.

### Example (infusion-pump)

```yaml
projectName: infusion-pump
projectType: device

extends: "@memo/medical-modeling-profile"

ontologies:
  - name: memo-ontology-medical
    version: "^0.1.0"
  - name: "@memo/ontology-platform-robotics"
    version: "^0.1.0"
```

---

## Format 2: Ontology / Profile Package — `memo.package.yaml` + side-car files

Ontology packages (`@memo/ontology-core`, `@memo/ontology-medical`, extension packages) and profile packages (`@memo/medical-modeling-profile`) use a **decomposed format** across up to three purpose-specific files.

### File 1: `memo.package.yaml` (required)

Identity and dependency declaration.

```yaml
name: "@memo/ontology-medical"   # Required. npm-style package name.
version: "0.1.0"                 # Required. Semver.
type: ontology                   # Required. "ontology" | "profile" | "library"
extends: "@memo/ontology-core"   # Optional. Parent package.
description: "Medical device backbone (ISO 14971, IEC 62304, IEC 62366)"
license: "Apache-2.0"
tags: ["mbse", "sysml-v2", "medical-device"]
```

### File 2: `memo.rendering.yaml` (optional — ontology packages only)

CoSMA layer visualization metadata: colors, display labels, icons.

```yaml
cosmaLayers:
  - id: risk
    label: Risk Management
    color: "#E74C3C"
  - id: requirements
    label: Requirements
    color: "#4A90D9"
```

### File 3: `memo.rules.yaml` (optional — profile/extension packages only)

Closure rules for model validation. Owned by extension packages, not by device projects.

```yaml
closureRules:
  - id: CR-MED-001
    description: "Every Hazard must have a mitigates relationship (ISO 14971)"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming
      min: 1
    severity: error
    completenessLayer: risk
```

### Where kinds are defined

Kinds (entity types) are **not** defined in YAML config. They are defined in SysML source files inside the package:

```
packages/ontology-medical/
  sysml/
    risk/
      hazard.sysml        ← part def Hazard { }
      risk-control.sysml  ← part def RiskControl { }
    requirements/
      requirement.sysml   ← requirement def SystemRequirement { }
```

The directory path determines the CoSMA layer (`sysml/risk/` → risk layer): the directory tree mirrors the `memo::` namespace, so the layer is read from the path. (The content layout is documented in [platform.md](../../architecture/platform.md).)

---

## Why Two Formats?

| Concern | Device project | Ontology/profile package |
|---------|---------------|--------------------------|
| Who creates it | End users (`memo init`) | Framework maintainers / package authors |
| What it declares | Which profile + extensions to use | What kinds, rules, and layers exist |
| Kind definitions | Inherited, never repeated | Defined in `.sysml` files |
| Closure rules | Inherited, never repeated | Defined in `memo.rules.yaml` |
| Rendering config | Inherited, never repeated | Defined in `memo.rendering.yaml` |
| File count | 1 | 1–3 |

Device projects are intentionally **configuration-light**: they declare a profile and optional extensions. Everything else is owned by the packages.

---

## Superseded

This ADR is the authoritative device-project format contract. It replaced an earlier exploratory config design (an outdated TypeScript `MEMOConfig` interface and a `.memo/config.yaml` path) that has since been pruned from the decision log.

The decomposed package format was introduced during Phase 7–8 rearchitecture and is documented in `docs/architecture/reference/platform-strategy.md`.

---

## Consequences

- All documentation, examples, and CLI help text must use `memo.config.yaml` for device projects.
- Ontology package documentation must use `memo.package.yaml` + side-car files.
- The `memo.config.yaml` reference doc (`docs/src/developers/config/reference.md`) documents device-project fields only — no `kinds:`, `cosmaLayers:`, or `closureRules:` at project level.
- Adding a kind requires editing the appropriate `.sysml` file in the ontology package, not the project config.
