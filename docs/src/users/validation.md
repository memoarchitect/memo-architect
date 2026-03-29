# Validation & Closure Rules

MEMO enforces **closure rules** — automated checks that verify your model has
complete traceability as required by ISO 14971, IEC 62304, and ISO 13485.

## Running Validation

```bash
pnpm memo validate
```

This parses your model, checks all closure rules, and reports gaps:

```
📋 MEMO Validate

Project: my-device (device)
Kinds: 296 | Rules: 109 | Relationships: 130

✗ CR-MED-001  Every Hazard must have ≥1 mitigates relationship
              Missing: hazAirEmbolism (Air Embolism)

✗ CR-MED-007  Every SoftwareRequirement must derive from SystemRequirement
              Missing: swReqLogging (Audit Logging)

⚠ CR-MED-008  Every SystemRequirement should derive from UserNeed
              Missing: sysReqBattery (Battery Life)

Results: 2 errors, 1 warning — 94% complete
```

- **Errors** (`✗`) — must be fixed; `memo validate` exits with code 1 (blocks CI)
- **Warnings** (`⚠`) — should be fixed; does not block CI

The repo now includes two medical reference models on the same shared backbone:

- `examples/infusion-pump` — richer infusion trace model with known behavior warnings only
- `examples/irrigation-pump` — surgical irrigation model stressing pressure control, disposable setup, and reservoir alarming

Use both when changing ontology semantics or medical closure rules:

```bash
cd examples/infusion-pump
pnpm memo validate

cd ../irrigation-pump
pnpm memo validate
```

## The 97 Medical Closure Rules

### Risk Management — ISO 14971

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-001 | Every **Hazard** must have ≥1 `mitigates` relationship | Error |
| CR-MED-002 | Every **Hazard** must cause ≥1 `HazardousSituation` | Error |
| CR-MED-003 | Every **RiskControl** must be verified by ≥1 Test | Error |
| CR-MED-004 | Every **Risk** must identify ≥1 Hazard | Error |
| CR-MED-005 | Every **HazardousSituation** must be caused by a Hazard | Error |
| CR-MED-006 | Every **Harm** must be led to by a HazardousSituation | Warning |

### Requirements Traceability — IEC 62304

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-007 | Every **SoftwareRequirement** must derive from **SystemRequirement** | Error |
| CR-MED-008 | Every **SystemRequirement** should derive from **UserNeed** | Warning |
| CR-MED-009 | Every **SystemRequirement** should be satisfied by architecture | Warning |
| CR-MED-012 | Every **UseCase** should be refined by ≥1 **Scenario** | Warning |
| CR-MED-013 | Every **SystemRequirement** should be verified by ≥1 **Test** | Warning |
| CR-MED-014 | Every **SoftwareRequirement** should be verified by ≥1 **Test** | Warning |
| CR-MED-015 | Every **UserNeed** should derive ≥1 **SystemRequirement** | Warning |

### Architecture Completeness

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-010 | Every **SystemFunction** must be allocated to LogicalComponent/Software | Error |
| CR-MED-011 | Every **Software** must have `safetyClassification` attribute | Error |
| CR-MED-019 | Every **SoftwareItem** must have `safetyClass` | Error |

### Usability, Safety, and Standards Semantics

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-016 | Every **EssentialPerformance** should be preserved by ≥1 **SafetyFunction** | Warning |
| CR-MED-017 | Every **UserInterfaceRequirement** should address ≥1 **UseError** | Warning |
| CR-MED-018 | Every **UserInterfaceRequirement** should be verified by ≥1 **Test** | Warning |
| CR-MED-022 | Every **UseSpecification** should specify ≥1 **HazardRelatedUseScenario** | Warning |
| CR-MED-023 | Every **UseErrorAnalysis** should analyze ≥1 **UseError** | Warning |
| CR-MED-024 | Every **UseError** should contribute to ≥1 **Hazard** | Warning |
| CR-MED-025 | Every **FormativeEvaluation** should evaluate ≥1 **UserInterfaceRequirement** | Warning |
| CR-MED-026 | Every **SummativeEvaluation** should evaluate ≥1 **UserInterfaceRequirement** | Warning |
| CR-MED-027 | Every **SummativeEvaluation** should be evidenced by **ComplianceEvidence** | Warning |
| CR-MED-028 | Every **EssentialPerformance** should support ≥1 **PrimaryOperatingFunction** | Warning |
| CR-MED-029 | Every **EssentialPerformance** should define ≥1 loss condition | Warning |
| CR-MED-030 | Every **CollateralStandardRequirement** should apply to a regulated subject | Warning |
| CR-MED-031 | Every **ParticularStandardRequirement** should apply to a regulated subject | Warning |

### Lifecycle, QMS, and Evidence Structure

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-020 | Every **SOUPItem** should be documented by ≥1 record/evidence link | Warning |
| CR-MED-021 | Every **SoftwareAnomaly** should be documented by ≥1 record/evidence link | Warning |
| CR-MED-032 | Every **DesignHistoryRecord** should document regulated lifecycle/usability artifacts | Warning |
| CR-MED-033 | Every **ComplianceEvidence** should evidence a regulated subject | Warning |
| CR-MED-034 | Every **ReleaseBaseline** should document software realization/evaluation artifacts | Warning |
| CR-MED-035 | Every **SoftwareDevelopmentProcess** should govern ≥1 lifecycle activity | Warning |
| CR-MED-036 | Every **SoftwareMaintenanceProcess** should govern ≥1 problem-resolution activity | Warning |
| CR-MED-037 | Every **SoftwareRequirementsAnalysisActivity** should produce ≥1 requirements work product | Warning |
| CR-MED-038 | Every **SoftwareArchitecturalDesignActivity** should produce architecture/design work products | Warning |
| CR-MED-039 | Every **ProblemResolutionActivity** should produce problem-resolution work products | Warning |

### Structured Risk Analysis — ISO 14971 / ISO/TR 24971

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-040 | Every **FailureModesAndEffectsAnalysis** should analyze ≥1 **FailureMode** | Warning |
| CR-MED-041 | Every **FailureMode** should have ≥1 **FailureCause** | Warning |
| CR-MED-042 | Every **FailureMode** should result in ≥1 **FailureEffect** | Warning |
| CR-MED-043 | Every **FailureEffect** should escalate to ≥1 **Hazard** or **HazardousSituation** | Warning |
| CR-MED-044 | Every **FaultTreeAnalysis** should define ≥1 **TopEvent** | Warning |
| CR-MED-045 | Every **TopEvent** should have ≥1 contributing **BasicEvent** or **IntermediateEvent** | Warning |
| CR-MED-046 | Every **TopEvent** should trigger ≥1 **HazardousSituation** | Warning |
| CR-MED-047 | Every **DetectionControl** should detect ≥1 **FailureMode** | Warning |
| CR-MED-048 | Every **DetectionControl** must be verified by ≥1 **Test** | Error |

### Clinical Context — Procedure, Patient, Anatomy, and Observation

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-049 | Every **TreatmentPathway** should contain ≥1 **Procedure** or **ClinicalStep** | Warning |
| CR-MED-050 | Every **ProcedureMethod** should be used by ≥1 **Procedure** | Warning |
| CR-MED-051 | Every **RouteOfAdministration** should be used by ≥1 **Procedure** | Warning |
| CR-MED-052 | Every **ClinicalObservation** should be produced by ≥1 **Procedure** | Warning |
| CR-MED-053 | Every **ClinicalObservation** should observe ≥1 **Patient**, **AnatomicalSite**, or **MorphologyState** | Warning |
| CR-MED-054 | Every **MorphologyState** should be affected by ≥1 **Procedure** | Warning |
| CR-MED-055 | Every **UseEnvironment** should declare ≥1 **ClinicalEnvironmentQualifier** | Warning |

### Risk Governance and Post-Market Feedback — ISO 14971 / ISO 13485

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-056 | Every **RiskManagementPlan** should plan at least one regulated risk-management subject | Warning |
| CR-MED-057 | Every **ResidualRiskEvaluation** should assess ≥1 **Risk**, **HazardousSituation**, or **Harm** | Warning |
| CR-MED-058 | Every **BenefitRiskAssessment** should weigh at least one **ClinicalBenefit** | Warning |
| CR-MED-059 | Every **BenefitRiskAssessment** should conclude ≥1 **ResidualRiskEvaluation** or **OverallResidualRiskEvaluation** | Warning |
| CR-MED-060 | Every **RiskManagementReport** should conclude ≥1 **OverallResidualRiskEvaluation** | Warning |
| CR-MED-061 | Every **ProductionPostProductionSignal** should monitor at least one regulated risk subject | Warning |

### Cybersecurity and Interoperability — FDA / IEC 81001-5-1 / IEC 80001 / HL7 FHIR

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-062 | Every **CybersecurityRequirement** should be satisfied by at least one software, structure, or interface element | Warning |
| CR-MED-063 | Every **ThreatModel** should model at least one **ThreatScenario** | Warning |
| CR-MED-064 | Every **ThreatScenario** should threaten at least one **CyberAsset** | Warning |
| CR-MED-065 | Every **ThreatScenario** should exploit at least one **Vulnerability** | Warning |
| CR-MED-066 | Every **SecurityControl** should mitigate at least one **ThreatScenario** | Warning |
| CR-MED-067 | Every **SecurityControl** should secure at least one interface | Warning |
| CR-MED-068 | Every **TerminologyBinding** should bind at least one interface or observation | Warning |
| CR-MED-069 | Every **TerminologyBinding** should reference at least one **ClinicalCodeSystemReference** | Warning |
| CR-MED-070 | Every **TerminologyBinding** should reference at least one **ClinicalValueSetReference** | Warning |
| CR-MED-071 | Every **ClinicalConceptMapReference** should identify at least one source code system | Warning |
| CR-MED-072 | Every **ClinicalConceptMapReference** should identify at least one target code system | Warning |
| CR-MED-073 | Every **SBOMArtifact** should describe at least one software subject | Warning |
| CR-MED-074 | Every **SecureUpdateCapability** should support at least one software or cyber asset subject | Warning |

### Clinical Evidence and Claims

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-075 | Every **ClinicalPerformanceClaim** should reference at least one **IntendedUse** or **IndicationForUse** | Warning |
| CR-MED-076 | Every **ClinicalPerformanceClaim** should be supported by at least one clinical evidence artifact | Warning |
| CR-MED-077 | Every **ClinicalSafetyClaim** should reference at least one **IntendedUse** or **IndicationForUse** | Warning |
| CR-MED-078 | Every **ClinicalSafetyClaim** should be evaluated by at least one **ClinicalEvaluationReport** | Warning |
| CR-MED-079 | Every **ClinicalEvaluationPlan** should plan at least one clinical claim | Warning |

### Manufacturing, Service, and Configuration

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-080 | Every **ManufacturingProcedure** should manufacture at least one subject | Warning |
| CR-MED-081 | Every **InstallationProcedure** should install at least one subject | Warning |
| CR-MED-082 | Every **PreventiveMaintenanceProcedure** should maintain at least one subject | Warning |
| CR-MED-083 | Every **CalibrationProcedure** should calibrate at least one subject | Warning |
| CR-MED-084 | Every **InstallationQualification** should qualify at least one installed subject | Warning |
| CR-MED-085 | Every **ProductFamily** should declare at least one **ProductVariant** | Warning |
| CR-MED-086 | Every **ProductVariant** should select at least one **FeatureOption** | Warning |
| CR-MED-087 | Every **ProductVariant** should support at least one **Accessory** | Warning |
| CR-MED-088 | Every **ConfigurationBaseline** should configure at least one subject | Warning |
| CR-MED-089 | Every **VariantConstraint** should constrain at least one **ProductVariant** | Warning |

### Data Messaging and ROS-Style Interfaces

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-090 | Every **RosTopic** should carry at least one ROS message | Warning |
| CR-MED-091 | Every **RosPublication** should publish to at least one **RosTopic** | Warning |
| CR-MED-092 | Every **RosSubscription** should subscribe to at least one **RosTopic** | Warning |
| CR-MED-093 | Every **RosMessageSchema** should define at least one ROS message | Warning |
| CR-MED-094 | Every **RosService** should carry at least one request message | Warning |
| CR-MED-095 | Every **RosService** should carry at least one response message | Warning |
| CR-MED-096 | Every **RosServiceCall** should invoke at least one **RosService** | Warning |
| CR-MED-097 | Every **RosServiceServer** should serve at least one **RosService** | Warning |

### Privacy, Data Governance, and External Ontology Import Boundary

| Rule | Check | Severity |
|------|-------|----------|
| CR-MED-098 | Every **DataProcessingActivity** should process at least one data-bearing subject | Warning |
| CR-MED-099 | Every **DataProcessingActivity** should be governed by at least one **ProcessingBasis** | Warning |
| CR-MED-100 | Every **DataProcessingActivity** should declare at least one **DataControllerRole** | Warning |
| CR-MED-101 | Every **PersonalDataCategory** should classify at least one governed subject | Warning |
| CR-MED-102 | Every **ConsentRecord** should support at least one governed subject | Warning |
| CR-MED-103 | Every **DataRetentionPolicy** should govern at least one subject | Warning |
| CR-MED-104 | Every **PrivacyImpactAssessment** should assess at least one processing or interface subject | Warning |
| CR-MED-105 | Every **ImportedTerminologySubset** should scope at least one **ClinicalCodeSystemReference** | Warning |
| CR-MED-106 | Every **TerminologyImportBoundary** should govern at least one terminology/import subject | Warning |
| CR-MED-107 | Every **ImportProvenanceRecord** should provide provenance for at least one imported terminology artifact | Warning |
| CR-MED-108 | Every **TerminologyBinding** should bind at least one **ImportedConceptBinding** when imported terminology subsets are modeled | Warning |
| CR-MED-109 | Every **MinimumNecessaryPolicy** should apply to at least one **DataProcessingActivity** | Warning |

## The Completeness Bar (Web UI)

When running `memo dev`, the web UI shows a **completeness bar** at the bottom
of the screen. This visualizes the same closure rules in real time:

- **Green segments** — rules fully satisfied
- **Red/orange segments** — rules with gaps
- **Percentage** — overall model completeness

Click a segment to see which elements are missing connections.

## Fixing Common Gaps

### "Hazard has no mitigates" (CR-MED-001)

Every hazard needs at least one risk control mitigating it:

```sysml
// Add a risk control
requirement rcAlarmSystem : RiskControl {
    attribute redefines title = "Audible Alarm System";
}

// Connect it to the hazard
connection : mitigates connect rcAlarmSystem to hazAirEmbolism;
```

### "SoftwareRequirement not derived from SystemRequirement" (CR-MED-007)

```sysml
connection : Derives connect source ::> sysReqAuditTrail to derived ::> swReqLogging;
```

### "Software missing safetyClassification" (CR-MED-011)

```sysml
part myFirmware : Software {
    attribute redefines name = "Control Software";
    attribute redefines safetyClassification = "C";  // A, B, or C per IEC 62304
}
```

### "SystemRequirement not verified by Test" (CR-MED-013)

```sysml
part testBattery : Test {
    attribute redefines name = "Battery Life Test";
    attribute redefines testType = "System";
}

connection : Verify connect verifiedBy ::> testBattery to verifies ::> sysReqBattery;
```

### "SummativeEvaluation has no evidence" (CR-MED-027)

```sysml
part evidenceAlarmWorkflow : ComplianceEvidence {
    attribute redefines recordId = "EV-010";
    attribute redefines title = "Alarm workflow summative report";
    attribute redefines artifactType = "Usability Test Report";
}

connection : Evidences
    connect evidence ::> evidenceAlarmWorkflow
    to subject ::> summativeEvalAlarmWorkflow;
```

## Using Validation in CI

Add validation to your CI pipeline to block merges with incomplete traceability:

```yaml
# .github/workflows/validate.yml
- name: Validate MEMO model
  run: pnpm memo validate
  # Exit code 1 = errors found → build fails
```

!!! tip "Progressive enforcement"
    Start with warnings-only mode while your model is still growing. Once
    the core traceability is in place, enable error-level rules in CI.

## Custom Closure Rules

You can define additional closure rules in your `memo.config.yaml`:

```yaml
extends: "@memo/medical-modeling-profile"

closureRules:
  - id: CR-PROJ-001
    description: "Every UserInterfaceRequirement should be implemented by a UI element"
    entity: UserInterfaceRequirement
    rule:
      type: requireRelationship
      relationship: satisfy
      direction: incoming
      relatedKinds: [UIElement, UIScreen, UIPanel]
      min: 1
    severity: warning
```

## Next Steps

- [Viewpoints & Diagrams](viewpoints-diagrams.md) — visualize your model by concern
- [Modeling Your Device](modeling-guide.md) — add more elements and relationships
