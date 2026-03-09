# ADR-1-4: Closure Rule Representation

**Status:** Accepted
**Date:** 2026-03-02
**Context:** Session 1 — Ontology

## Decision

Closure rules are encoded as **external YAML evaluated by the MEMO CLI**, not as SysML v2 constraints.

### Options Evaluated

| Option | Diffs cleanly | Runs in CI | Expressiveness | Tooling burden |
|--------|:---:|:---:|:---:|:---:|
| SysML v2 `constraint def` | Partial | Needs SysML solver | High (OCL-like) | Requires SysML v2 constraint evaluator |
| External YAML + CLI evaluation | Yes | Yes (CLI only) | Medium (declarative rules) | Low (custom evaluator) |
| Both (YAML primary, SysML optional) | Yes | Yes | High | Medium |

**Decision: External YAML only.** Rationale:

1. **Diffs cleanly** — YAML is line-oriented text. Adding a rule = adding lines. Git diffs are human-readable.
2. **Runs in CI without a GUI** — The MEMO CLI evaluates rules against the parsed model. No Eclipse, no SysML solver, no graphical tool chain needed.
3. **Domain configs override rules** — YAML files compose via `extends`. Medical adds stricter rules; generic relaxes them. This is simpler in YAML than in SysML constraint inheritance.
4. **SysML v2 constraint evaluator maturity** — Pilot tools have inconsistent constraint evaluation support. YAML rules work today.

### Rule Schema

```yaml
# Closure rule definition
closureRules:
  - id: "CR-001"
    description: "Every SoftwareItem must have at least one allocatedTo relationship"
    entity: "SoftwareItem"
    rule:
      type: "requireRelationship"
      relationship: "allocatedTo"
      min: 1
    severity: "error"

  - id: "CR-002"
    description: "Every Hazard with severity >= serious must have a mitigates relationship"
    entity: "Hazard"
    rule:
      type: "conditionalRequireRelationship"
      condition:
        attribute: "severity"
        operator: "in"
        values: ["serious", "critical", "catastrophic"]
      relationship: "mitigates"
      min: 1
    severity: "error"

  - id: "CR-003"
    description: "Every Requirement should have an implements relationship"
    entity: "Requirement"
    rule:
      type: "requireRelationship"
      relationship: "implements"
      min: 1
    severity: "warning"
```

### Rule Types

| Rule Type | Description | Example |
|-----------|-------------|---------|
| `requireRelationship` | Entity must have N+ relationships of type | "Every SoftwareItem must have allocatedTo" |
| `conditionalRequireRelationship` | If condition on attribute, require relationship | "Hazard with severity >= serious must have mitigates" |
| `requireAttribute` | Entity must have non-empty attribute | "Every Hazard must have a description" |
| `uniqueAttribute` | Attribute must be unique across all instances | "SoftwareItem names must be unique" |
| `cardinalityCheck` | Relationship count within bounds | "RiskControl must mitigate 1..5 hazards" |

## Consequences

- Closure rules are versioned alongside config.yaml in the `.memo/` directory.
- `memo validate` command reads rules from config and evaluates against parsed SysML model.
- CI pipeline runs `memo validate --strict` to enforce all `error`-severity rules.
- Domain packages ship their own closure rules that compose via `extends`.
- Rules are testable in isolation — unit tests can verify rule evaluation logic.

## Example: CLI Validation Output

```
$ memo validate

Evaluating 12 closure rules against model...

  CR-001  ERROR  SoftwareItem "DisplayModule" has no allocatedTo relationship
  CR-002  PASS   All high-severity Hazards have mitigates relationships
  CR-003  WARN   Requirement "REQ-007" has no implements relationship
  CR-004  PASS   All SoftwareItem names are unique

Result: 1 error, 1 warning, 10 passed
Validation FAILED — fix errors before commit.
```

## SysML v2 Constraint Alternative (Not Chosen)

For reference, the equivalent SysML v2 constraint for CR-001 would be:

```sysml
// NOT USED — shown for comparison only
package MEMO_Ontology {
    constraint def RequireAllocatedTo {
        doc /* Every SoftwareItem must have at least one allocatedTo relationship. */
        in item : SoftwareItem;
        item.allocatedFunctions->size() >= 1
    }
}
```

This was rejected because:
- Requires a SysML v2 constraint solver in CI
- OCL-like expression syntax varies across tools
- Cannot easily express conditional rules or cross-entity uniqueness checks
