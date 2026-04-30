# Ontology Refactor Inventory — two-ontology-refactor

**Date:** 2026-04-20  
**Rollback tag:** `pre-ontology-refactor-2026-04-20`  
**Authority:** `docs/likec4/memo-ontology-architecture.v12.drawio`

---

## 1. Source Inventory (9 old packages → 359 defs)

| Package | Files | Defs | Disposition |
|---------|-------|------|-------------|
| ontology-medical-arch | 15 | 128 | Seed → ontology-arch; drop ui/, analysis/, system/, interfaces/ layers |
| ontology-medical-process | 11 | 126 | Seed → ontology-process; split by standard |
| ontology-cybersecurity | 3 | 28 | cybersecurity/ → arch/security/; privacy/ → arch/privacy/ |
| ontology-iec62304 | 2 | 16 | → process/iec-62304/ |
| ontology-clinical-interop | 1 | 4 | → arch/functional/ (TerminologyBinding as DataObject extension) |
| ontology-clinical-procedure | 1 | 15 | → arch/behavioral/ (audit then delete; ClinicalAction covers it) |
| ontology-medical-clinical-trial | 4 | 13 | → process/iso-14155/ |
| ontology-ros | 1 | 24 | → arch/software-extension/ |
| medical-product-line-profile | 1 | 5 | **DELETE** — out of scope for v12 |

---

## 2. Mapping — Keep / Rewrite / Delete

### 2a. ontology-arch/sysml/ ← from ontology-medical-arch

| Old layer | Old defs | New layer | Action |
|-----------|----------|-----------|--------|
| operational/ + operational/purpose/ | OperationalActor, OperationalEntity, OperationalEnvironment, Resource, OperationalActivity, Operation, Procedure, Mission, Context, Substance, Observable, OperationalScenario, MissionPhase, Program, Actor, Stakeholder, Goal, Concern, Capability | operational/ | REWRITE → keep System, Actor, EnvironmentContext, UserNeed, IntendedUse per v12 C-001..C-005; collapse 19 old defs into 5 v12 classes |
| behavioral/ (was: functional/Scenario,UseCase) | Scenario, UseCase | behavioral/ | REWRITE → add StateMachine, State, Transition, Event, ClinicalAction per v12 C-006..C-012 |
| functional/ | FunctionScope(enum), Function | functional/ | KEEP Function, ConstraintDefinition; add DataObject per v12 C-013..C-015 |
| logical/ | LogicalComponent, ArchitectureDecision, QualityAttribute, ArchitectureRationale, Question | logical/ | REWRITE → keep LogicalComponent; drop arch decision/rationale/question; add Interface, Port per v12 C-016..C-018 |
| software/ | SoftwareElement, Software, SoftwareComponent, SoftwareModule, SoftwareLayer, SoftwareSystem, SoftwareThread, SoftwareDataStore, SoftwareConnector, Firmware, Docker, EventDrivenService, MessageBroker | software/ | REWRITE → keep SoftwareComponent, SoftwareInterface, ExecutionThread, SoftwareModule per v12 C-019..C-022; drop Firmware/Docker/EventDrivenService |
| interfaces/ | ~40 interface/message defs | **DELETE** | Covered by logical/Interface and Port; message types are DataObject specializations |
| hardware/ | 21 defs | hardware/ | REWRITE → keep HardwareComponent, HardwareAssembly, HardwareBoard, HardwarePart, Processor per v12 C-023..C-027; drop FPGA/MCU/SingleBoardComputer/Battery/Enclosure |
| system/ | 8 defs | **DELETE** | System → operational/System; Subsystem → logical/LogicalComponent |
| analysis/ | 8 defs | **DELETE** | Constraint, Assumption, Measure etc. not in v12; these are tool concerns |
| ui/ | 4 defs | **DELETE** | UI is viewpoint concern, not ontology |
| requirements/ | RequirementCategory(enum), EARSTemplate(enum), RequirementModality(enum), Requirement, RequirementSet | verification/ | REWRITE → Requirement only per v12 C-028; enums deleted |
| verification/ | Test, VerificationCase, ValidationCase, Evidence | verification/ | REWRITE → keep VerificationCase, Evidence; add SecurityRequirement, PrivacyRequirement per v12 C-028..C-032 |
| relationships/ | ~40 connection defs | relationships/ | REWRITE → trim to 45 v12 Tab 3 connections; many current defs (PerformedBy, HasEquipment, etc.) not in v12 |

**NEW layers (no source in old packages — author fresh):**

| New layer | v12 classes | Notes |
|-----------|-------------|-------|
| safety/ | Hazard, HazardousSituation, Harm, Risk, Mitigation, FailureMode, FaultTreeNode (C-033..C-039 approx) | Classes currently in ontology-medical-process/risk/ — move to arch |
| security/ | TrustBoundary, Asset, ThreatScenario, Control (C-046..C-047, C-052, C-054) | Rename from cybersecurity: CyberAsset→Asset, ThreatModel→ThreatScenario |
| privacy/ | DataCategory, DataSubjectCategory, ProcessingActivity, RetentionRule, PrivacyRiskScenario (C-048..C-051, C-053, C-056) | Rename from cybersecurity/privacy: PersonalDataCategory→DataCategory |
| software-extension/ | ROSNode, ROSTopic, ROSMessageType, ROSService, ROSAction (C-037..C-041) | Rename from ros-middleware: RosNode→ROSNode |
| axioms/ | 37 axioms (Tab 5) | Author fresh: disjointness, SWRL risk_before/after multiplication, SHACL shapes |

### 2b. ontology-process/sysml/ ← from multiple old packages

| Old source | Old content | New standard dir | Action |
|------------|-------------|-----------------|--------|
| ontology-medical-process/risk/ | RiskManagementPlan, RiskManagementReport, PostProductionSignal, RiskManagementProcess activities | iso-14971/ | MOVE risk **process** defs; risk **classes** (Hazard,Risk etc.) move to arch/safety/ |
| ontology-medical-process/design-control/ | DesignAndDevelopmentPlan, DesignInput, DesignOutput, DesignReview, DesignVerification, DesignValidation, IntendedUse, UseError, UsabilitySpecification | iso-13485/ + fda-21cfr820/ | SPLIT: ISO 13485 §7.3 design control; 21 CFR 820.30 DHF/DMR/DHR |
| ontology-medical-process/safety/ | SafetyGoal, EssentialPerformance, BasicSafety | iec-60601/ | MOVE essential performance process |
| ontology-medical-process/operations/ | ManufacturingProcedure, QMSRecord, QMSProcess, CAPA-adjacent, ComplianceEvidence | iso-13485/ | MOVE post-market/QMS |
| ontology-iec62304/ | SoftwareSafetyClass(enum), SoftwareItem, SoftwareUnit, SOUPItem, SoftwareLifecycleProcess, SoftwareWorkProduct, SoftwareDevelopmentPlan | iec-62304/ | MOVE directly; rename to align with v12 |
| ontology-medical-clinical-trial/ | ClinicalClaim, ClinicalEvaluationPlan, ClinicalEvaluationReport, Patient, ClinicalStep | iso-14155/ | MOVE; rename ClinicalClaim→ClinicalPerformanceClaim per IEC 62304 §5.5 language |

**NEW standard dirs (author fresh — no old source):**

| New dir | v12 content | Notes |
|---------|-------------|-------|
| common/ | ProcessActivity, WorkProduct, DesignReview base defs (C-034..C-036) | Base types that all standards extend |
| iso-27001-27701/ | ISMS processes, DPIA, StatementOfApplicability | Net-new; small (~5 activities) |
| eu-mdr/ | TechnicalDocumentation, PMCF, Annex II/III | Net-new; small (~4 work products) |
| relationships/ | producesEvidence, sourceStandard, regulatoryClause, governedBy | Cross-arch-process bridges |

---

## 3. Duplicates & Conflicts

| Name | Found in | Resolution |
|------|---------|-----------|
| SoftwareSystem | ontology-medical-arch/software/ AND ontology-iec62304/ | arch version: generic SW component. iec62304 version has safetyClass. KEEP arch version as SoftwareComponent; iec62304 SoftwareItem specializes it |
| Procedure | medical-arch/operational/, medical-process/operations/, clinical-trial | arch: no Procedure class. process: SurgicalProcedure under iso-14155. Collapse. |
| ComplianceEvidence | medical-process/qms-records AND iec62304 reference | → process/iso-13485/ComplianceEvidence as WorkProduct specialization |
| IntendedUse | medical-arch/operational/purpose/ AND medical-process/design-control/ | v12: IntendedUse is arch/operational class (C-005). Remove from process. |
| DesignReview | medical-process/design-control/ AND process/common/ | → common/DesignReview base; iso-13485 specializes |

---

## 4. v12 Gap Analysis (what must be authored fresh)

### Classes in v12 not in any old package

| v12 class | Target layer | Notes |
|-----------|-------------|-------|
| EnvironmentContext | arch/operational/ | Old: OperationalEnvironment — rename |
| UserNeed | arch/operational/ | Old: Goal/Concern approx — net-new |
| ClinicalAction | arch/behavioral/ | Partially in ontology-clinical-procedure — rewrite |
| StateMachine, State, Transition, Event | arch/behavioral/ | Net-new |
| ConstraintDefinition | arch/functional/ | Old: Constraint in analysis/ — move + rename |
| Interface, Port | arch/logical/ | Old: interfaces/ package had many — collapse to 2 |
| SoftwareInterface, ExecutionThread | arch/software/ | Old: SoftwareInterface existed in interfaces/ — consolidate |
| HardwareAssembly, HardwareBoard, HardwarePart | arch/hardware/ | Old: Board, HardwareModule partially — rename |
| Mitigation | arch/safety/ | Old: RiskControl in medical-process — rename |
| FaultTreeNode | arch/safety/ | Old: TopEvent+FaultTreeContributor+FaultTreeGate — collapse |
| TrustBoundary | arch/security/ | Net-new |
| DataCategory, DataSubjectCategory, RetentionRule, PrivacyRiskScenario | arch/privacy/ | Rename from cybersecurity/privacy |
| SecurityRequirement, PrivacyRequirement | arch/verification/ | Net-new |
| ROSNode, ROSTopic, ROSMessageType, ROSService, ROSAction | arch/software-extension/ | Rename from ros-middleware (RosNode→ROSNode) |
| ProcessActivity, WorkProduct, DesignReview (base) | process/common/ | Net-new base types |
| ISO 60601, 27001/27701, EU MDR, FDA 21 CFR 820 defs | process/<standard>/ | Net-new |

### Defs in old packages NOT in v12 → DELETE

| Def | Old package | Reason |
|-----|-------------|--------|
| UIFunction, UIElement, UIScreen, UIPanel | medical-arch/ui/ | UI is viewpoint concern |
| ArchitectureDecision, QualityAttribute, ArchitectureRationale, Question | medical-arch/logical/ | Tool concerns, not ontology classes |
| All 40+ interface/message types | medical-arch/interfaces/ | Collapsed to Interface + DataObject |
| SoftwareLayer, SoftwareDataStore, SoftwareConnector, Firmware, Docker, EventDrivenService, MessageBroker | medical-arch/software/ | Not in v12; too implementation-specific |
| SystemBoundary, ExternalSystem, SystemOfSystems | medical-arch/system/ | Collapsed to EnvironmentContext |
| Assumption, Measure, AnalysisCase, Calculation, TradeStudy, AnalysisResult | medical-arch/analysis/ | Tool layer, not ontology |
| RequirementCategory(enum), EARSTemplate(enum), RequirementModality(enum), RequirementSet | medical-arch/requirements/ | Enums are tool concerns |
| ClinicalCodeSystemReference, ClinicalValueSetReference, ClinicalConceptMapReference | clinical-interop/ | TerminologyBinding only survives as DataObject extension |
| AnatomicalSite, ProcedureMethod, RouteOfAdministration, MorphologyState, ClinicalEnvironmentQualifier | clinical-procedure/ | Not in v12; too clinical-domain specific |
| ProductFamily, ProductVariant, FeatureOption, Accessory, ConfigurationBaseline | medical-product-line-profile/ | Out of scope for v12 |
| RiskMatrix, RiskMatrixCell, BenefitRiskAssessment, ResidualRiskEvaluation, OverallResidualRiskEvaluation | medical-process/risk/ | Tool output, not ontology class |
| FPGA, Microcontroller, SingleBoardComputer, Battery, PowerSupply, Enclosure | medical-arch/hardware/ | Too implementation-specific; v12 keeps 5 hardware classes |

---

## 5. Relationship Count Check (v12 Tab 3 = 45)

Current ontology-medical-arch/relationships/ has ~40 connection defs. After removing non-v12 ones:

| Keep | Rename/rewrite | Drop |
|------|----------------|------|
| Refines, Satisfy, Verify, AllocateTo, ComposedOf, TraceTo, Flow, Succession | Constrains→ConstrainedBy, Realization→Realizes | PerformedBy, PerformedOn, OccursIn, UsesResource, HasEquipment, HasPersonnel, ContainsSubstance, HasEndpoint, ImplementsProtocol, ConformsToProfile, PublishesTo, SubscribesTo, all message-channel defs |

Net-new for v12 count (to reach 45): security (ThreatensAsset, ExploitsVulnerability), privacy (ClassifiesData, ProcessesData), and process bridges added in ontology-process/relationships/.

---

## 6. medical-modeling-profile Current State

- `extends: "@memo/ontology-medical-process"` — must change to both new packages
- `memo.rules.yaml` (33.6K): 33+ closure rules referencing old class names — require systematic rename
- `memo.viewpoints.yaml` (17.2K): viewpoints referencing old kinds — require rename
- Templates: 5 device templates referencing old namespace — update imports

---

## 7. Acceptance Criteria (from two-ontology-refactor.md §7)

1. `packages/ontology-arch` and `packages/ontology-process` exist; all 9 old packages deleted
2. `pnpm run build && pnpm run test` green
3. All three examples run via `memo dev` and render every view type
4. v12 sanity check passes: 56 classes, 45 connections, ~55 data props, 37 axioms
5. ADR-1-10 merged
6. `pre-ontology-refactor-2026-04-20` tag exists
