# ADR-1-2: Relationship Representation in SysML v2

**Status:** Accepted (Revised v2)
**Date:** 2026-03-03
**Context:** Session 1 — Ontology (expanded from EA MDG reference)

## Decision

MEMO relationships map to SysML v2 `connection def` types. The EA MDG defines 11 relationship stereotypes; we add 5 more for ISO 14971 risk chains and verification, totaling **16 relationship types**.

### Complete Relationship Mapping

| MEMO Relationship | SysML v2 | From | To | Domain |
|---|---|---|---|---|
| Aggregation | `connection def` | whole | part | logical |
| Association | `connection def` | source | target | logical |
| TraceTo | `connection def` | source | target | requirements |
| Trace | `connection def` | source | target | requirements |
| AllocateTo | `connection def` | function | structure | functional |
| ComposedOf | `connection def` | whole | part | logical |
| Dependency | `connection def` | client | supplier | logical |
| Realization | `connection def` | realizing | realized | logical |
| Satisfy | `connection def` | satisfiedBy | satisfies | requirements |
| Verify | `connection def` | verifiedBy | verifies | verification |
| **Mitigates** | `connection def` | control | hazard | risk |
| **Causes** | `connection def` | hazard | situation | risk |
| **LeadsTo** | `connection def` | situation | harm | risk |
| **Identifies** | `connection def` | risk | hazard | risk |
| Extend | `connection def` | base | extension | functional |
| Include | `connection def` | including | included | functional |

### EA Relationship Constraints (from profile.xml)

The EA profile encodes which entity types can participate in each relationship via `<stereotypedrelationship>` constraints. Key rules:

- **Hazard** → Association → {Component, System, SystemFunction, UseCase}
- **Hazard** → TraceTo → {SystemFunction, UseCase}
- **Risk** → Association → {Actor, Hazard, HazardousSituation, Requirement, Scenario, UseCase, ...} (broad)
- **SystemFunction** → AllocateTo → {Component, DesignSpecification}
- **Requirement** → Association → {Actor, Component, Hazard, System, ...} (broad)
- **UseCase** → Extend/Include → {UseCase}
- **UserNeed** → TraceTo → {Requirement, UseCase}

These constraints are enforced by MEMO CLI closure rules (ADR-1-4), not by SysML v2 syntax.

### ISO 14971 Risk Chain (Mitigates, Causes, LeadsTo, Identifies)

```
Hazard ──causes──► HazardousSituation ──leadsTo──► Harm
   ▲
   │
   mitigates
   │
RiskControl

Risk ──identifies──► Hazard
```

These four risk-specific relationships are NOT in the EA MDG (which uses generic Association/TraceTo for everything). We add them as first-class `connection def` types because:
1. The ISO 14971 risk chain is the core value proposition of MEMO for medical devices
2. Typed relationships enable automated risk matrix generation
3. Closure rules can enforce chain completeness (every Hazard must have Mitigates, etc.)

## Consequences

- 16 typed relationships cover all EA MDG stereotypes plus ISO 14971 risk chain.
- All relationships are `connection def` — first-class, navigable, diagrammable.
- Relationship constraints from EA are enforced via YAML closure rules, not SysML v2 syntax.
- Risk chain relationships (Mitigates, Causes, LeadsTo, Identifies) enable automated compliance checking.

## SysML v2 Syntax Notes

> **Note:** The `connection def` with `end` keyword is stable in SysML v2. The `connect ... ::>` usage syntax is pilot syntax.

> **Note:** SysML v2 has native `satisfy` and `verify` relationship semantics. Our `Satisfy` and `Verify` connection defs mirror these but add MEMO-specific metadata capability.
