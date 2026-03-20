# Ontology & Type System

The MEMO ontology defines the vocabulary of entity types and relationship types that models are built from.

## Package Direction

MEMO is moving to a layered ontology structure:

- **`@memo/ontology-core`** — domain-agnostic MBSE backbone
- **`@memo/ontology-medical-base`** — regulated medical device development backbone built on top of core
- **Product-family extensions** — device or platform specific packages
- **Rules / views / templates** — separate from ontology packages

The current `@memo/ontology` package is the transitional source package that will be split along those boundaries. See [ADR-1-6](../adr/ADR-1-6-ontology-core-medical-split.md).

## Design Philosophy

MEMO uses **SysML v2 specialization** as the type mechanism. Rather than inventing a proprietary metamodel, entity kinds are defined as SysML v2 definitions that specialize base constructs:

```sysml
// Ontology definition (in @memo/ontology)
part def Hazard {
    attribute name : String;
    attribute severity : String;
}

// User model (specializes the ontology type)
part def OverInfusion :>> Hazard {
    attribute redefines name = "Over-infusion of drug";
    attribute redefines severity = "critical";
}
```

The `:>>` operator means "specializes" — the user's `OverInfusion` inherits all attributes from `Hazard`.

## Entity Kinds

Entity kinds are mapped to SysML v2 constructs:

| Construct | Used For | Examples |
|---|---|---|
| `part def` | Physical/logical elements | System, Component, InterfaceContract |
| `requirement def` | Needs and requirements | StakeholderNeed, SystemRequirement |
| `action def` | Functions/behaviors | SystemFunction, OperationalActivity |
| `port def` | Interfaces/ports | Port, DataPort, FlowPort |
| `connection def` | Relationships | mitigates, traceTo, verify |

### Intended Boundary

As the ontology is split:

- **Core** keeps reusable MBSE concepts such as stakeholders, requirements, functions, logical/physical/software architecture, interfaces, analysis, and verification.
- **Medical base** adds medical-device-specific concepts such as risk management, design-control artifacts, software lifecycle semantics, and safety/essential-performance concepts.
- **Extensions** carry product-family or technology-specific concepts such as ROS integration, UI wireframes, or device-family parts.

## Relationship Types

Relationships are defined as SysML v2 connection definitions with typed ends:

```sysml
connection def mitigates {
    end control : RiskControl;
    end hazard : Hazard;
}
```

Each relationship type has:

- **Name** — The relationship identifier (e.g., `mitigates`)
- **Source end** — Typed reference to the source element kind
- **Target end** — Typed reference to the target element kind
- **Layer** — CoSMA layer it belongs to
- **Color** — Visualization color

### Built-in Relationship Types

| Type | Source → Target | Layer | Purpose |
|---|---|---|---|
| `mitigates` | RiskControl → Hazard | risk | ISO 14971 risk mitigation |
| `causes` | Hazard → HazardousSituation | risk | Causal chain |
| `leadsTo` | HazardousSituation → Harm | risk | Harm pathway |
| `identifies` | SystemFunction → Hazard | risk | Hazard identification |
| `traceTo` | Requirement → Requirement | requirements | Requirement traceability |
| `satisfy` | Element → Requirement | requirements | Satisfaction link |
| `verify` | Test → Requirement/RiskControl | verification | Verification evidence |
| `allocateTo` | Function → Component | functional | Function allocation |
| `aggregation` | Parent → Child | logical | Composition |
| `composedOf` | Parent → Child | logical | Decomposition |
| `dependency` | Source → Target | software | Dependency |
| `realization` | Impl → Spec | software | Realization link |
| `association` | Element → Element | general | General association |
| `extend` | UseCase → UseCase | functional | Use case extension |
| `include` | UseCase → UseCase | functional | Use case inclusion |

## Ontology Package

The current `@memo/ontology` package ships:

```
packages/ontology/
  sysml/
    entities/          # Part/requirement/action/port definitions
    relationships/     # Connection definitions
    index.sysml       # Package entry point
  memo.config.yaml    # Base config for layers, kinds, relationships, and viewpoints
```

Domain packages like `@memo/medical` extend the ontology by adding kinds, rules, and viewpoints via `memo.config.yaml`.

## Target Package Stack

The target package stack is:

```text
@memo/ontology-core
  ├── purpose / stakeholder concerns
  ├── operational
  ├── requirements
  ├── functional
  ├── logical
  ├── physical
  ├── software
  ├── interfaces
  ├── analysis
  ├── verification
  └── relationships

@memo/ontology-medical-base
  ├── design-control
  ├── risk-management
  ├── software-lifecycle
  ├── safety-essential-performance
  └── regulatory-trace references
```

Rules, viewpoints, completeness logic, and example models remain outside ontology packages.
