# Ontology & Type System

The MEMO ontology defines the vocabulary of entity types and relationship types that models are built from.

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
| `part def` | Physical/logical elements | System, Component, Hazard, RiskControl |
| `requirement def` | Requirements | SystemRequirement, UserNeed |
| `action def` | Functions/behaviors | SystemFunction, UseCase |
| `port def` | Interfaces/ports | Port, DataPort, FlowPort |
| `connection def` | Relationships | mitigates, traceTo, verify |

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

The `@memo/ontology` package ships:

```
packages/ontology/
  sysml/
    entities/          # Part/requirement/action/port definitions
    relationships/     # Connection definitions
    index.sysml       # Package entry point
  memo.config.yaml    # Base config (empty kinds, no rules)
```

Domain packages like `@memo/medical` extend the ontology by adding kinds, rules, and viewpoints via `memo.config.yaml`.
