# Ontology & Type System

The MEMO ontology defines the vocabulary of entity types and relationship types that models are built from.

## Package Direction

MEMO is moving to a layered ontology structure:

- **`@memo/ontology-core`** — domain-agnostic MBSE backbone
- **`@memo/ontology-medical`** — regulated medical device development backbone built on top of core
- **Product-family extensions** — device or platform specific packages
- **Rules / views / templates** — separate from ontology packages

The current `@memo/ontology` package is a frozen compatibility shim layered on top of `@memo/ontology-medical`. It preserves the legacy `MEMO_Ontology` surface while the clean backbone lives in `@memo/ontology-core` and `@memo/ontology-medical`. See [ADR-1-6](../adr/ADR-1-6-ontology-core-medical-split.md) and [ADR-1-7](../adr/ADR-1-7-legacy-ontology-compatibility-policy.md).

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
| `requirement def` | Needs and requirements | StakeholderNeed, UserNeed, SystemRequirement |
| `action def` | Functions/behaviors | SystemFunction, OperationalActivity |
| `port def` | Interfaces/ports | Port, DataPort, FlowPort |
| `connection def` | Relationships | mitigates, derives, verify |

### Intended Boundary

As the ontology is split:

- **Core** keeps reusable MBSE concepts such as stakeholders, requirements, functions, logical/physical/software architecture, interfaces, analysis, and verification.
- **Medical base** adds medical-device-specific concepts such as `UserNeed`, risk management, design-control/usability artifacts, software lifecycle semantics, safety/essential-performance concepts, and the second-pass 62366 / 60601 / 62304 backbone.
- **Extensions** carry product-family or technology-specific concepts when the repo eventually supports them as independent packages.

### Compatibility Policy

`@memo/ontology` is now treated as a frozen compatibility shim:

- new ontology concepts go to `@memo/ontology-core` or `@memo/ontology-medical`
- legacy `MEMO_Ontology::*` imports remain supported
- remaining legacy-only content such as `Responsibility`, `LogicalComponentExternal`, behavior helper kinds, and `Catheter` should not drive new backbone design

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

### Selected Relationship Types

| Type | Source → Target | Layer | Purpose |
|---|---|---|---|
| `derives` | Need/Requirement → derived Requirement | requirements | Downstream requirement derivation |
| `refines` | Base concern/use case → refiner | requirements | More precise refinement when generic tracing is too weak |
| `traceTo` | Element → Element | requirements | Fallback trace only when no stronger stable semantics are worth encoding |
| `mitigates` | RiskControl → Hazard | risk | ISO 14971 risk mitigation |
| `causes` | Hazard → HazardousSituation | risk | Causal chain |
| `leadsTo` | HazardousSituation → Harm | risk | Harm pathway |
| `identifies` | Risk → Hazard | risk | Risk record identifies the associated hazard |
| `addressesUseError` | UI Requirement → Use Error | design-control | Explicit IEC 62366 usability trace |
| `analyzesUseError` | Use Error Analysis → Use Error | design-control | Use-error analysis structure |
| `evaluatesRequirement` | Validation Case → UI Requirement | verification | Formative/summative evaluation linkage |
| `supportsOperatingFunction` | Essential Performance → Primary Operating Function | safety | Essential-performance claim tied to the protected function |
| `definesLossCondition` | Essential Performance → EP Loss Condition | safety | Explicit loss-of-essential-performance semantics |
| `protectsEssentialPerformance` | RiskControl → Essential Performance | safety | Stronger safety trace from control to protected performance |
| `implementsRiskControl` | Implementer → RiskControl | safety | Requirement/function/architecture implementation of a control |
| `governsActivity` | Lifecycle Process → Lifecycle Activity | software-lifecycle | IEC 62304 process-to-activity structure |
| `producesWorkProduct` | Lifecycle Activity → Work Product | software-lifecycle | IEC 62304 activity-to-artifact structure |
| `satisfy` | Element → Requirement | requirements | Satisfaction link |
| `verify` | Test → Requirement/RiskControl | verification | Verification evidence |
| `documents` / `evidences` | QMS record/evidence → subject | qms | DHF / evidence trace across regulated artifacts |

## Ontology Package

The current `@memo/ontology` package ships a compatibility surface:

```
packages/ontology/
  sysml/
    entities/          # Part/requirement/action/port definitions
    relationships/     # Connection definitions
    index.sysml       # Package entry point
  memo.config.yaml    # Base config for layers, kinds, relationships, and viewpoints
```

`@memo/medical` now extends `@memo/ontology-medical` for rules, viewpoints, and templates. The legacy `@memo/ontology` package remains only as a frozen compatibility shim for existing imports.

## Target Package Stack

The target package stack is:

```text
@memo/ontology-core
  ├── purpose / program / stakeholder concerns
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

@memo/ontology-medical
  ├── design-control
  ├── medical-development (`UserNeed` on top of `StakeholderNeed`)
  ├── risk-management
  ├── software-lifecycle
  ├── safety-essential-performance
  ├── regulatory-trace references
  └── medical relationship specializations
```

Rules, viewpoints, completeness logic, and example models remain outside ontology packages.
