# ADR-1-3: Ontology Package Structure and Versioning

**Status:** Accepted
**Date:** 2026-03-02
**Context:** Session 1 — Ontology

## Decision

The MEMO ontology publishes as a **versioned SysML v2 package** distributed via npm. Projects version-pin the ontology and import it using SysML v2 `import` statements resolved by the MEMO CLI.

### Package Layout

```
@memo/ontology (npm package)
├── package.json              # npm metadata, version, peerDependencies
├── sysml/
│   ├── MEMO_Ontology.sysml   # Root package with public API re-exports
│   ├── entities/
│   │   ├── SoftwareItem.sysml
│   │   ├── Hazard.sysml
│   │   ├── RiskControl.sysml
│   │   ├── Requirement.sysml
│   │   ├── Interface.sysml
│   │   └── Function.sysml
│   └── relationships/
│       └── relationships.sysml
└── README.md
```

### Versioning Strategy

- **Semantic versioning** (semver) via npm: `@memo/ontology@1.2.3`
- **Major** bumps = breaking changes to entity defs or relationship signatures
- **Minor** bumps = new entity types or optional attributes added
- **Patch** bumps = doc fixes, non-breaking attribute additions

### Package Resolution

The MEMO CLI resolves SysML v2 `import` statements by:
1. Looking in `node_modules/@memo/ontology/sysml/` for `MEMO_Ontology` package
2. Following standard npm resolution (local → workspace → global)
3. Domain packages (e.g., `@memo/medical`) extend the ontology and are resolved the same way

## Consequences

- Projects lock to a specific ontology version via `package.json` / `package-lock.json`.
- Upgrading the ontology is a deliberate `npm update @memo/ontology` action.
- Multiple projects can use different ontology versions simultaneously.
- CI can validate models against a pinned ontology version — reproducible builds.

## SysML v2 Examples

### Root Ontology Package

```sysml
// File: @memo/ontology/sysml/MEMO_Ontology.sysml
package MEMO_Ontology {
    doc /* MEMO Framework Ontology v1.0.0
         * Reusable entity and relationship definitions for
         * model-based systems engineering of regulated products.
         *
         * Import this package to access all framework types.
         * Domain configurations (medical, automotive) specialize
         * these types — they do NOT modify this package. */

    // Entity definitions
    public import MEMO_Ontology::Entities::*;

    // Relationship definitions
    public import MEMO_Ontology::Relationships::*;
}
```

### Entities Sub-package

```sysml
// File: @memo/ontology/sysml/entities/package.sysml
package MEMO_Ontology::Entities {
    public import SoftwareItem;
    public import Hazard;
    public import RiskControl;
    public import Requirement;
    public import Interface;
    public import Function;
}
```

### Project Import Statement

```sysml
// File: my-pump-project/src/system.sysml
package InfusionPump {
    // Version-pinned import — resolved via node_modules by MEMO CLI
    import MEMO_Ontology::*;

    // Use framework types directly
    part pumpController : SoftwareItem {
        attribute redefines name = "Pump Controller Software";
        attribute redefines version = "2.1.0";
        attribute redefines safetyClass = SafetyClassification::C;
    }
}
```

### Project package.json

```json
{
  "name": "my-pump-project",
  "version": "0.1.0",
  "dependencies": {
    "@memo/ontology": "^1.0.0",
    "@memo/medical": "^1.0.0"
  }
}
```

### Domain Extension Import

```sysml
// File: my-pump-project/src/risk.sysml
package InfusionPump::RiskAnalysis {
    // Import both core ontology and medical domain extensions
    import MEMO_Ontology::*;
    import MEMO_Medical::*;

    // Medical domain adds ISO 14971-specific hazard categories
    part h001 : MedicalHazard {
        attribute redefines name = "Over-infusion hazard";
        attribute redefines hazardCategory = HazardCategory::useError;
    }
}
```

## SysML v2 Syntax Uncertainty

> **Flag:** SysML v2 `public import` is in the spec for controlling visibility across packages. The `::` namespace separator is confirmed. However, the exact mechanism for resolving imports from external file paths (as opposed to in-memory model) is implementation-specific. The MEMO CLI bridges this by mapping npm packages to SysML v2 package namespaces.

> **Flag:** Sub-package syntax `package MEMO_Ontology::Entities` (qualified nested package) is valid in the spec but some pilot tools may require physical nesting instead. The CLI should handle both forms.
