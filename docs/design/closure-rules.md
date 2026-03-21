# Closure Rules & Validation

Closure rules enforce completeness and traceability constraints on the model. They are the backbone of regulatory compliance checking in MEMO.

## What Are Closure Rules?

A closure rule states: *"Every element of kind X must have at least N relationships of type Y."*

For example, ISO 14971 requires every identified hazard to have a risk control measure. In MEMO:

```yaml
closureRules:
  - id: CR-MED-001
    description: "Every Hazard must have at least one mitigates relationship (ISO 14971)"
    entity: Hazard
    rule:
      type: requireRelationship
      relationship: mitigates
      direction: incoming    # A RiskControl mitigates *this* Hazard
      min: 1
    severity: error
    completenessLayer: risk
```

## Rule Structure

```yaml
closureRules:
  - id: string              # Unique rule ID (e.g., "CR-MED-001")
    description: string      # Human-readable description
    entity: string           # Kind this rule applies to (e.g., "Hazard")
    rule:
      type: requireRelationship
      relationship: string   # Relationship type (e.g., "mitigates")
      direction: incoming|outgoing|any  # Which direction to check
      min: number            # Minimum required count
    severity: error|warning|info
    completenessLayer: string  # CoSMA layer for completeness tracking
```

## How Evaluation Works

The `evaluateClosureRules()` function in `@memo/core`:

1. Iterates over each closure rule in the config
2. Finds all elements matching the rule's `entity` kind
3. For each matching element, counts relationships of the specified type and direction
4. If the count is below `min`, creates a `Violation`

```typescript
interface Violation {
    ruleId: string;        // "CR-MED-001"
    description: string;   // Rule description
    severity: 'error' | 'warning' | 'info';
    elementId: string;     // "OverInfusion"
    elementKind: string;   // "Hazard"
    elementName: string;   // "Over-infusion of drug"
    layer: string;         // "risk"
}
```

## Completeness Impact

Violations affect completeness tracking:

- **Error** violations mark the element as **incomplete**
- **Warning** and **info** violations do **not** affect completeness
- Completeness percentage = `completeElements / totalElements` per layer

This means a model can be 100% complete even with warnings, but never with errors.

## Medical Domain Rules

The medical config includes 21 closure rules aligned with ISO 14971, IEC 62304, and IEC 60601 usability/safety concerns:

### Risk Management (ISO 14971)

| Rule | Entity | Requirement | Severity |
|---|---|---|---|
| CR-MED-001 | Hazard | Must have `mitigates` (incoming) | error |
| CR-MED-002 | Hazard | Must `traceTo` a SystemFunction or UseCase | warning |
| CR-MED-003 | RiskControl | Must be verified by a Test | error |
| CR-MED-004 | HazardousSituation | Must have `causes` (incoming from Hazard) | warning |
| CR-MED-005 | Harm | Must have `leadsTo` (incoming) | warning |
| CR-MED-006 | SafetyGoal | Must `traceTo` a Hazard | warning |

### Requirements (IEC 62304)

| Rule | Entity | Requirement | Severity |
|---|---|---|---|
| CR-MED-007 | SoftwareRequirement | Must `traceTo` a SystemRequirement | warning |
| CR-MED-008 | SystemRequirement | Must `traceTo` a UserNeed | warning |
| CR-MED-009 | UserNeed | Must have `traceTo` (outgoing) | info |

### Architecture

| Rule | Entity | Requirement | Severity |
|---|---|---|---|
| CR-MED-010 | SystemFunction | Must `allocateTo` a Component or Software | warning |
| CR-MED-011 | Component | Must have `aggregation` or `composedOf` | info |

### Verification

| Rule | Entity | Requirement | Severity |
|---|---|---|---|
| CR-MED-012 | Test | Must `verify` a Requirement or RiskControl | warning |

## CLI Output

`memo validate` displays violations grouped by severity:

```
  Violations:
    ERROR  CR-MED-001  Hazard "Over-infusion" has no mitigates relationship
    ERROR  CR-MED-003  RiskControl "Flow sensor" has no verify relationship
    WARN   CR-MED-007  SoftwareRequirement "Flow control" has no traceTo
    INFO   CR-MED-009  UserNeed "Safe delivery" has no traceTo

  Completeness:
    risk          ██████░░░░  60%
    requirements  ████████░░  80%
    verification  ████░░░░░░  40%
    overall       ██████░░░░  62%
```

## Writing Custom Rules

Add rules to your project's `memo.config.yaml`:

```yaml
closureRules:
  - id: CR-PROJ-001
    description: "Every Component must have an owner"
    entity: Component
    rule:
      type: requireRelationship
      relationship: association
      direction: incoming
      min: 1
    severity: warning
    completenessLayer: logical
```
