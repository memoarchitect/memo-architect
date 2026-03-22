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
      relatedKinds: [RiskControl]
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
      relatedKinds: [string] # Optional filter on the related element kind(s)
      min: number            # Minimum required count
    severity: error|warning|info
    completenessLayer: string  # CoSMA layer for completeness tracking
```

## How Evaluation Works

The `evaluateClosureRules()` function in `@memo/core`:

1. Iterates over each closure rule in the config
2. Finds all elements matching the rule's `entity` kind
3. For each matching element, counts relationships of the specified type, direction, and optional related-kind filter
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

The medical config includes 97 closure rules aligned with ISO 14971, IEC 62304, IEC 62366, IEC 60601 usability/safety concerns, structured FMEA / fault-tree analysis, richer clinical-context semantics, residual-risk / post-market governance semantics, cybersecurity/interoperability semantics, clinical-evidence / claims semantics, lifecycle-configuration semantics, and event-driven / ROS-specialized data-messaging semantics:

Representative rules:

| Rule | Entity | Requirement | Severity |
|---|---|---|---|
| CR-MED-001 | Hazard | Must have at least one `mitigates` relationship | error |
| CR-MED-002 | Hazard | Must have at least one `causes` relationship | error |
| CR-MED-003 | RiskControl | Must be verified by at least one `verify` relationship | error |
| CR-MED-004 | Risk | Must identify at least one Hazard via `identifies` | error |
| CR-MED-005 | HazardousSituation | Must participate in a `causes` relationship | error |
| CR-MED-006 | Harm | Must participate in a `leadsTo` relationship | warning |
| CR-MED-007 | SoftwareRequirement | Must derive from a SystemRequirement via `derives` | error |
| CR-MED-008 | SystemRequirement | Should derive from a UserNeed via `derives` | warning |
| CR-MED-009 | SystemRequirement | Should be satisfied by architecture via `satisfy` | warning |
| CR-MED-010 | SystemFunction | Must be allocated via `allocateTo` | error |
| CR-MED-012 | UseCase | Should be refined by at least one Scenario via `refines` | warning |
| CR-MED-016 | EssentialPerformance | Should be preserved by a SafetyFunction via `preserves` | warning |
| CR-MED-017 | UserInterfaceRequirement | Should address at least one UseError via `addressesUseError` | warning |
| CR-MED-025 | FormativeEvaluation | Should evaluate a UserInterfaceRequirement via `evaluatesRequirement` | warning |
| CR-MED-027 | SummativeEvaluation | Should be evidenced by ComplianceEvidence via `evidences` | warning |
| CR-MED-032 | DesignHistoryRecord | Should document lifecycle/usability artifacts via `documents` | warning |
| CR-MED-035 | SoftwareDevelopmentProcess | Should govern lifecycle activities via `governsActivity` | warning |
| CR-MED-038 | SoftwareArchitecturalDesignActivity | Should produce architecture/design work products via `producesWorkProduct` | warning |
| CR-MED-040 | FailureModesAndEffectsAnalysis | Should analyze at least one FailureMode via `analyzesFailureMode` | warning |
| CR-MED-043 | FailureEffect | Should escalate to Hazard/HazardousSituation via `escalatesToRisk` | warning |
| CR-MED-044 | FaultTreeAnalysis | Should define at least one TopEvent via `definesTopEvent` | warning |
| CR-MED-048 | DetectionControl | Must be verified by at least one Test via `verify` | error |
| CR-MED-049 | TreatmentPathway | Should contain at least one Procedure/ClinicalStep via `hasSubProcedure` | warning |
| CR-MED-052 | ClinicalObservation | Should be produced by a Procedure via `producesObservation` | warning |
| CR-MED-055 | UseEnvironment | Should declare a ClinicalEnvironmentQualifier via `appliesEnvironmentQualifier` | warning |
| CR-MED-056 | RiskManagementPlan | Should plan at least one risk-management subject via `plansRiskManagement` | warning |
| CR-MED-058 | BenefitRiskAssessment | Should weigh at least one ClinicalBenefit via `weighsAgainstBenefit` | warning |
| CR-MED-061 | ProductionPostProductionSignal | Should monitor at least one regulated risk subject via `monitorsRiskSubject` | warning |
| CR-MED-063 | ThreatModel | Should model at least one ThreatScenario via `modelsThreat` | warning |
| CR-MED-066 | SecurityControl | Should mitigate at least one ThreatScenario via `mitigatesThreat` | warning |
| CR-MED-068 | TerminologyBinding | Should bind at least one interface/observation via `bindsTerminology` | warning |
| CR-MED-073 | SBOMArtifact | Should describe at least one software subject via `maintainsSbom` | warning |
| CR-MED-075 | ClinicalPerformanceClaim | Should reference intended use or indication via `claimsForUse` | warning |
| CR-MED-078 | ClinicalSafetyClaim | Should be evaluated by a clinical evaluation report via `evaluatesClinicalClaim` | warning |
| CR-MED-080 | ManufacturingProcedure | Should manufacture at least one subject via `manufacturesSubject` | warning |
| CR-MED-084 | InstallationQualification | Should qualify at least one installed subject via `qualifiesInstallation` | warning |
| CR-MED-085 | ProductFamily | Should declare at least one ProductVariant via `hasProductVariant` | warning |
| CR-MED-088 | ConfigurationBaseline | Should configure at least one subject via `configuresItem` | warning |
| CR-MED-090 | RosTopic | Should carry at least one ROS message via `carriesExchangeItem` | warning |
| CR-MED-091 | RosPublication | Should publish to at least one RosTopic via `publishesTo` | warning |
| CR-MED-093 | RosMessageSchema | Should define at least one ROS message via `definesMessageSchema` | warning |
| CR-MED-096 | RosServiceCall | Should invoke at least one RosService via `invokesInterface` | warning |

## CLI Output

`memo validate` displays violations grouped by severity:

```
  Violations:
    ERROR  CR-MED-001  Hazard "Over-infusion" has no mitigates relationship
    ERROR  CR-MED-003  RiskControl "Flow sensor" has no verify relationship
    WARN   CR-MED-008  SystemRequirement "Flow accuracy" has no derives relationship
    WARN   CR-MED-017  UserInterfaceRequirement "Alarm acknowledgement" has no addressesUseError relationship

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
      relatedKinds: [Stakeholder]
      min: 1
    severity: warning
    completenessLayer: logical
```
