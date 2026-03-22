# Medical Domain Configuration

The `@memo/medical` package is the medical workbench configuration layered on top of `@memo/ontology-medical`.

It now provides:

- closure rules for ISO 14971, IEC 62304, and IEC 60601 traceability/completeness
- medical-specific viewpoints and starter scaffolding
- workbench validation, viewpoints, and starter templates on top of the medical ontology
- second-pass medical semantics for IEC 62366 usability engineering, IEC 60601 safety structure, and IEC 62304 lifecycle work products
- structured FMEA / fault-tree risk-analysis semantics connected into the medical risk backbone
- residual-risk, benefit-risk, and production/post-production signal semantics connected into the medical risk and QMS backbone
- cybersecurity, connected-system, and terminology-binding semantics for FDA-aligned cyber devices and interoperable clinical integrations
- medical specializations on top of the core procedure-context backbone (`UserProfile` on `OperationalActor`, `UseEnvironment` on `OperationalEnvironment`)

## Overview

| Metric | Count |
|---|---|
| Primary role | Rules + viewpoints + templates |
| Extends | `@memo/ontology-medical` |
| Closure Rules | 74 |
| Workbench Viewpoints | 7 |

## Standards Alignment

### ISO 14971 — Risk Management

The ontology-level risk concepts live in `@memo/ontology-medical`. The `@memo/medical`
package adds the validation and viewpoint layer that operationalizes them:

- Hazard identification → `Hazard` elements
- Risk analysis → `HazardousSituation`, `Harm`, `Risk` elements
- Structured failure analysis → `FailureModesAndEffectsAnalysis`, `FailureMode`, `FailureCause`, `FailureEffect`, `DetectionControl`
- Fault propagation analysis → `FaultTreeAnalysis`, `TopEvent`, `IntermediateEvent`, `BasicEvent`, `FaultTreeGate`
- Risk control → `RiskControl` elements with `mitigates` relationships
- Residual-risk and benefit-risk reasoning → `ResidualRiskEvaluation`, `OverallResidualRiskEvaluation`, `ClinicalBenefit`, and `BenefitRiskAssessment`
- Governance and feedback anchors → `RiskManagementPlan`, `RiskManagementReport`, and `ProductionPostProductionSignal`
- Cybersecurity anchors → `CybersecurityRequirement`, `ThreatModel`, `ThreatScenario`, `Vulnerability`, `SecurityControl`, `SBOMArtifact`, and `SecureUpdateCapability`
- Verification → `Test` elements with `verify` relationships to controls
- Failure-analysis trace → `escalatesToRisk`, `triggersHazardousSituation`, and `detectsFailureMode` connect analysis results directly into the ISO 14971 chain
- Governance trace → `plansRiskManagement`, `assessesResidualRisk`, `weighsAgainstBenefit`, `concludesBenefitRisk`, `concludesOverallResidualRisk`, and `monitorsRiskSubject` connect planning, acceptability, benefit-risk rationale, and post-market feedback into that same chain
- Cyber trace → `modelsThreat`, `threatensAsset`, `exploitsVulnerability`, `mitigatesThreat`, `securesInterface`, `maintainsSbom`, and `supportsSecureUpdate` connect threat modeling, secure design controls, SBOMs, and update capability into the regulated backbone

This follows the direction of ISO 14971:2019 plus ISO/TR 24971:2020 guidance:
failure-analysis artifacts are modeled as part of risk analysis, not as detached UI-only tooling.

**Enforced by rules:** CR-MED-001 through CR-MED-006, CR-MED-040 through CR-MED-048, CR-MED-056 through CR-MED-061, and CR-MED-062 through CR-MED-074

### IEC 62304 — Software Lifecycle

The ontology-level software lifecycle concepts live in `@memo/ontology-medical`. The
medical workbench package adds traceability and completeness rules over them:

- User needs → System requirements → Software requirements
- Explicit lifecycle processes → activities → work products
- Software architecture decomposition
- Verification of requirements
- Software item safety classification
- SOUP and anomaly documentation

In the layered ontology, `UserNeed` remains the preferred medical-device term and
specializes the core `StakeholderNeed` concept.

**Enforced by rules:** CR-MED-007 through CR-MED-039

### IEC 60601 / IEC 60601-1-6 — Safety, Essential Performance, and Usability

The ontology-level safety, design-control, and product-UI concepts live in `@memo/ontology-medical`.
The medical workbench package adds usability and essential-performance checks over them:

- Use specifications, use-error analysis, and formative/summative evaluations
- Essential performance linked to safety functions, risk controls, and explicit loss conditions
- Collateral / particular-standard applicability traces
- User interface requirements linked to use errors and implemented UI elements
- Usability requirements verified by tests/validation artifacts

**Enforced by rules:** CR-MED-016 through CR-MED-033

### Procedure Context — Paper-Informed Operational Backbone

Following the CIFMeDD paper's reusable ideas, the domain-agnostic procedure-context
concepts live in `@memo/ontology-core`, while medical specializations live in
`@memo/ontology-medical`:

- `Procedure`, `OperationalEnvironment`, `Substance`, `Observable`, and performer/subject/resource relations live in the core backbone
- `UserProfile` now specializes `OperationalActor`
- `UseEnvironment` now specializes `OperationalEnvironment`
- `Patient`, `AnatomicalSite`, `ProcedureMethod`, `RouteOfAdministration`, `TreatmentPathway`, `ClinicalObservation`, `MorphologyState`, and `ClinicalEnvironmentQualifier` now live in `@memo/ontology-medical`
- medical examples can now model who performs a procedure, where it occurs, what it acts on, which anatomy is involved, which method/route is used, and which observations/outcomes matter without inventing device-specific terms

**Enforced by rules:** CR-MED-049 through CR-MED-055

### External Terminology Boundary

The current boundary is deliberate:

- MEMO models stable backbone concepts locally when they are needed for medical-device design reasoning across many products
- full external clinical terminologies remain a future import/interoperability concern rather than a required local bundle
- local kinds such as `Patient`, `AnatomicalSite`, `ProcedureMethod`, `RouteOfAdministration`, and `ClinicalObservation` are intentionally lightweight anchor concepts, not an attempt to replicate the full depth of SNOMED CT
- terminology anchor kinds such as `ClinicalCodeSystemReference`, `ClinicalValueSetReference`, `ClinicalConceptMapReference`, and `TerminologyBinding` capture integration intent and versioned references without embedding full external terminology content in the local ontology
- deeper coding systems, patient taxonomies, and externally maintained clinical hierarchies should flow through the future external ontology import capability once that interoperability layer exists

### ISO 13485 — QMS, Traceability, and Records

The ontology-level QMS and record concepts live in `@memo/ontology-medical`, and the
medical workbench package uses them to keep regulated records tied to lifecycle,
usability, and risk-analysis artifacts:

- Design history and release records → `DesignHistoryRecord`, `ReleaseBaseline`, `ChangeRecord`
- Objective evidence → `ComplianceEvidence`
- Risk-governance records → `RiskManagementPlan` and `RiskManagementReport`
- Production/post-production feedback → `ProductionPostProductionSignal`
- Cybersecurity lifecycle records → SBOMs, secure-update capability descriptions, and post-market cyber review signals can be documented and evidenced alongside other regulated artifacts
- Risk-analysis artifacts documented under QMS trace → FMEA / fault-tree analyses can be documented alongside lifecycle and usability artifacts

### Cybersecurity and Interoperability — FDA / IEC 81001-5-1 / IEC 80001 / HL7 FHIR

The ontology-level connected-system and interface semantics are split between `@memo/ontology-core`
and `@memo/ontology-medical`:

- domain-agnostic system-of-systems and interface concepts such as `SystemOfSystems`, `DataInterface`, `DataEndpoint`, `CommunicationProtocol`, and `InteroperabilityProfile` live in `@memo/ontology-core`
- medical cybersecurity and clinical-terminology anchors such as `CybersecurityRequirement`, `ThreatModel`, `ThreatScenario`, `SecurityControl`, `SBOMArtifact`, `SecureUpdateCapability`, `ClinicalCodeSystemReference`, `ClinicalValueSetReference`, `ClinicalConceptMapReference`, and `TerminologyBinding` live in `@memo/ontology-medical`
- medical examples can now model cyber-device interfaces, secure integration controls, threat models, SBOM/update artifacts, and versioned clinical-terminology bindings without pretending to import full external terminologies into the local model

**Enforced by rules:** CR-MED-062 through CR-MED-074

**Enforced by rules:** CR-MED-020 through CR-MED-039

### ISO/IEC/IEEE 42010 — Viewpoint Separation

`@memo/ontology-medical` carries the medical semantics, while `@memo/medical`
adds viewpoint definitions on top. The dedicated risk-analysis viewpoint keeps
FMEA / FTA concerns separate from broader safety and software views, which is
consistent with ISO/IEC/IEEE 42010's viewpoint-driven architecture-description direction.

## Usage

Projects extend the medical config:

```yaml
projectName: my-device
projectType: device
extends: "@memo/medical"
```

Projects inherit:

- `@memo/ontology-core` via `@memo/ontology-medical`
- `@memo/ontology-medical`
- `@memo/medical` rules, viewpoints, and starter templates
