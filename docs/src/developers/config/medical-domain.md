# Medical Domain Configuration

The `@memo/medical-modeling-profile` package is the medical modeling profile layered on top of `@memo/ontology`.

It now provides:

- closure rules for ISO 14971, IEC 62304, and IEC 60601 traceability/completeness
- medical-specific viewpoints and starter scaffolding
- validation, viewpoints, and starter templates on top of the medical ontology
- second-pass medical semantics for IEC 62366 usability engineering, IEC 60601 safety structure, and IEC 62304 lifecycle work products
- structured FMEA / fault-tree risk-analysis semantics connected into the medical risk backbone
- residual-risk, benefit-risk, and production/post-production signal semantics connected into the medical risk and QMS backbone
- cybersecurity, connected-system, and terminology-binding semantics for FDA-aligned cyber devices and interoperable clinical integrations
- clinical evaluation, clinical evidence, and clinical claims semantics connected back to intended use, benefit-risk, and QMS records
- manufacturing, installation, service, preventive-maintenance, calibration, and regulated product-configuration semantics
- reusable data-messaging semantics in `@memo/ontology`, including event-driven services, brokers, ROS specializations, and RabbitMQ specializations that are not specific to medical devices
- medical specializations on top of the core procedure-context backbone (`UserProfile` on `OperationalActor`, `UseEnvironment` on `OperationalEnvironment`)

## Overview

| Metric | Count |
|---|---|
| Primary role | Rules + viewpoints + templates |
| Extends | `@memo/ontology` |
| Closure Rules | 109 |
| Modeling Viewpoints | 11 |

## Standards Alignment

### ISO 14971 — Risk Management

The ontology-level risk concepts live in `@memo/ontology`. The `@memo/medical-modeling-profile`
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

The ontology-level software lifecycle concepts live in `@memo/ontology`. The
medical modeling profile package adds traceability and completeness rules over them:

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

The ontology-level safety, design-control, and product-UI concepts live in `@memo/ontology`.
The medical modeling profile package adds usability and essential-performance checks over them:

- Use specifications, use-error analysis, and formative/summative evaluations
- Essential performance linked to safety functions, risk controls, and explicit loss conditions
- Collateral / particular-standard applicability traces
- User interface requirements linked to use errors and implemented UI elements
- Usability requirements verified by tests/validation artifacts

**Enforced by rules:** CR-MED-016 through CR-MED-033

### Procedure Context — Paper-Informed Operational Backbone

Following the CIFMeDD paper's reusable ideas, both the reusable
procedure-context concepts and their medical specializations live in the single
canonical `@memo/ontology` package:

- `Procedure`, `OperationalEnvironment`, `Substance`, `Observable`, and performer/subject/resource relations live in the core backbone
- `UserProfile` now specializes `OperationalActor`
- `UseEnvironment` now specializes `OperationalEnvironment`
- `Patient`, `AnatomicalSite`, `ProcedureMethod`, `RouteOfAdministration`, `TreatmentPathway`, `ClinicalObservation`, `MorphologyState`, and `ClinicalEnvironmentQualifier` now live in `@memo/ontology`
- medical examples can now model who performs a procedure, where it occurs, what it acts on, which anatomy is involved, which method/route is used, and which observations/outcomes matter without inventing device-specific terms

**Enforced by rules:** CR-MED-049 through CR-MED-055

### External Terminology Boundary

The current boundary is deliberate:

- MEMO models stable backbone concepts locally when they are needed for medical-device design reasoning across many products
- full external clinical terminologies remain a future import/interoperability concern rather than a required local bundle
- local kinds such as `Patient`, `AnatomicalSite`, `ProcedureMethod`, `RouteOfAdministration`, and `ClinicalObservation` are intentionally lightweight anchor concepts, not an attempt to replicate the full depth of SNOMED CT
- terminology anchor kinds such as `ClinicalCodeSystemReference`, `ClinicalValueSetReference`, `ClinicalConceptMapReference`, and `TerminologyBinding` capture integration intent and versioned references without embedding full external terminology content in the local ontology
- deeper import-boundary kinds such as `TerminologyImportBoundary`, `ImportedTerminologySubset`, `ImportedConceptBinding`, and `ImportProvenanceRecord` now capture governed subset scope, local-to-imported concept alignment, and provenance without pretending MEMO already imports or hosts full external ontologies
- deeper coding systems, patient taxonomies, and externally maintained clinical hierarchies should flow through the future external ontology import capability once that interoperability layer exists

### ISO 13485 — QMS, Traceability, and Records

The ontology-level QMS and record concepts live in `@memo/ontology`, and the
medical modeling profile package uses them to keep regulated records tied to lifecycle,
usability, and risk-analysis artifacts:

- Design history and release records → `DesignHistoryRecord`, `ReleaseBaseline`, `ChangeRecord`
- Objective evidence → `ComplianceEvidence`
- Risk-governance records → `RiskManagementPlan` and `RiskManagementReport`
- Production/post-production feedback → `ProductionPostProductionSignal`
- Cybersecurity lifecycle records → SBOMs, secure-update capability descriptions, and post-market cyber review signals can be documented and evidenced alongside other regulated artifacts
- Risk-analysis artifacts documented under QMS trace → FMEA / fault-tree analyses can be documented alongside lifecycle and usability artifacts

### Cybersecurity and Interoperability — FDA / IEC 81001-5-1 / IEC 80001 / HL7 FHIR

The canonical `@memo/ontology` contains both reusable connected-system concepts
and medical interface specializations:

- domain-agnostic system-of-systems and interface concepts such as `SystemOfSystems`, `DataInterface`, `DataEndpoint`, `CommunicationProtocol`, and `InteroperabilityProfile` live in `@memo/ontology`
- medical cybersecurity and clinical-terminology anchors such as `CybersecurityRequirement`, `ThreatModel`, `ThreatScenario`, `SecurityControl`, `SBOMArtifact`, `SecureUpdateCapability`, `ClinicalCodeSystemReference`, `ClinicalValueSetReference`, `ClinicalConceptMapReference`, and `TerminologyBinding` live in `@memo/ontology`
- medical examples can now model cyber-device interfaces, secure integration controls, threat models, SBOM/update artifacts, and versioned clinical-terminology bindings without pretending to import full external terminologies into the local model

**Enforced by rules:** CR-MED-062 through CR-MED-074

### Privacy, Data Governance, and Import Boundary — HIPAA / GDPR

The ontology-level privacy and import-governance semantics now also live in `@memo/ontology`:

- governed data-classification anchors → `PersonalDataCategory`, `SpecialCategoryPersonalData`, `ProtectedHealthInformation`
- governed processing/activity semantics → `DataProcessingActivity`
- explicit legal/governance basis anchors → `ProcessingBasis`, `LawfulBasis`, `HIPAAPermissionBasis`, `ConsentRecord`, `PrivacyNotice`, `DataRetentionPolicy`, `MinimumNecessaryPolicy`
- accountable roles and privacy-by-design anchors → `DataControllerRole`, `DataProcessorRole`, `PrivacyImpactAssessment`, `DataSubjectRequest`
- data-handling safeguards → `DeIdentificationMethod`, `PseudonymizationMethod`
- deeper external terminology import-boundary anchors → `TerminologyImportBoundary`, `ImportedTerminologySubset`, `ImportedConceptBinding`, `ImportProvenanceRecord`

These concepts are intended to support architecture and traceability reasoning for connected medical devices. They are not a substitute for legal review. The medical examples now capture HIPAA-style permission basis and minimum-necessary handling alongside GDPR-style lawful-basis, controller/processor, privacy-impact, retention, and request-handling semantics.

**Enforced by rules:** CR-MED-098 through CR-MED-109

### Clinical Evaluation, Evidence, and Claims

The ontology-level claim and evidence semantics now live in `@memo/ontology`:

- clinical-use and submission-facing claims → `ClinicalPerformanceClaim`, `ClinicalSafetyClaim`
- claim evidence anchors → `ClinicalEvidenceArtifact`
- governed evaluation planning and reporting → `ClinicalEvaluationPlan`, `ClinicalEvaluationReport`
- explicit trace back to intended use / indication, claimed benefit, and supporting evidence using `claimsForUse`, `claimsClinicalBenefit`, `supportsClinicalClaim`, and `evaluatesClinicalClaim`

These semantics keep clinical claims from collapsing into generic `documents` or `traceTo` links and make the evidence basis auditable.

**Enforced by rules:** CR-MED-075 through CR-MED-079

### Manufacturing, Service, and Configuration Semantics

The regulated lifecycle and product-configuration anchors now also live in `@memo/ontology`:

- manufacturing / installation / service procedures → `ManufacturingProcedure`, `InstallationProcedure`, `ServiceProcedure`
- preventive maintenance / calibration procedures → `PreventiveMaintenanceProcedure`, `CalibrationProcedure`
- lifecycle records and qualifications → `ManufacturingRecord`, `InstallationQualification`, `ServiceReport`, `CalibrationRecord`
- reusable product-line anchors → `ProductFamily`, `ProductVariant`, `FeatureOption`, `Accessory`, `ConfigurationBaseline`, `VariantConstraint`
- typed lifecycle and configuration traces → `manufacturesSubject`, `installsSubject`, `servicesSubject`, `maintainsSubject`, `calibratesSubject`, `qualifiesInstallation`, `hasProductVariant`, `selectsFeature`, `supportsAccessory`, `configuresItem`, and `constrainsVariant`

These semantics are intended for reusable regulated medical-device backbone reasoning, not device-specific SKU taxonomy.

**Enforced by rules:** CR-MED-080 through CR-MED-089

### Data Messaging and Event-Driven Interface Semantics

The ontology-level data-modeling backbone now lives in `@memo/ontology`:

- domain-agnostic data-exchange concepts such as `PublishSubscribeChannel`, `RequestResponseInterface`, `Message`, `RequestMessage`, `ResponseMessage`, `MessageSchema`, and `MessageField` live in `@memo/ontology`
- event-driven microservice and broker concepts such as `EventDrivenService`, `MessageBroker`, `EventBus`, `TopicChannel`, `QueueChannel`, `MessageProducer`, `MessageConsumer`, `BrokerExchange`, and `BrokerQueue` also live in `@memo/ontology`
- generic typed messaging relations such as `publishesTo`, `subscribesTo`, `publishesMessage`, `consumesMessage`, `servesInterface`, `invokesInterface`, `carriesRequestMessage`, `carriesResponseMessage`, `brokersChannel`, `routesToChannel`, `definesMessageSchema`, and `hasMessageField` also live in `@memo/ontology`
- technology specializations such as `RosNode` / `RosTopic` / `RosService` and `RabbitMqBroker` / `RabbitMqExchange` / `RabbitMqQueue` now also live in `@memo/ontology` because they are reusable integration-platform concepts rather than medical-only semantics

This keeps reusable interface/data semantics in the core MBSE backbone while still supporting platform-specific modeling of ROS, RabbitMQ, and similar non-medical integration technologies where teams need them.

**Enforced by rules:** CR-MED-090 through CR-MED-097

### SysML v2 Compliance Boundary

The medical ontology is authored against MEMO's supported SysML v2 textual subset:

- packages and imports
- `part def`, `requirement def`, `action def`, `port def`, `interface def`, `item def`, `connection def`, `attribute def`, and `enum def`
- specialization via `:>`
- typed connection usages, viewpoints, and views

The ontology packages validate cleanly within that supported subset. MEMO should not currently be described as a full SysML 2.0 implementation; the parser intentionally covers the subset needed by the ontology and reference models.

### ISO/IEC/IEEE 42010 — Viewpoint Separation

`@memo/ontology` carries the medical semantics, while `@memo/medical-modeling-profile`
adds viewpoint definitions on top. The dedicated risk-analysis viewpoint keeps
FMEA / FTA concerns separate from broader safety and software views, which is
consistent with ISO/IEC/IEEE 42010's viewpoint-driven architecture-description direction.

## Usage

Projects extend the medical config:

```yaml
projectName: my-device
projectType: device
extends: "@memo/medical-modeling-profile"
```

Projects inherit:

- `@memo/ontology`
- `@memo/medical-modeling-profile` rules, viewpoints, and starter templates
