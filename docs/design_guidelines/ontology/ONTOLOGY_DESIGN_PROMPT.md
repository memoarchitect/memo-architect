# Prompt: Design MEMO Ontology — V-cycle / Arcadia Aligned, Medical Device

## Context

You are designing a three-tier SysML v2 ontology for medical device development called **MEMO** (Medical Engineering Modeling Ontology).
The ontology must:
- Follow the **Arcadia/Capella methodology** layer structure (OA → SA → LA → PA → EPBS)
- Align with the **V-cycle** (left arm = decomposition/specification, bottom = implementation, right arm = verification/validation)
- Be structured in three tiers, from domain-agnostic MBSE backbone to full medical regulatory coverage

---

## Architecture

### Tier 1 — `@memo/ontology-core`
*Domain-agnostic MBSE backbone. No medical, no industry-specific content.*
Maps directly to Arcadia layers + V-cycle artifacts.

### Tier 2 — `@memo/ontology-medical-core`
*Mandatory medical device content.* Covers the standards every regulated medical device project must comply with:
- ISO 14971 (risk management)
- IEC 62304 (software lifecycle)
- IEC 60601-1 (electrical safety)
- IEC 62366-1 (usability engineering)
- IEC 62443 / IMDRF cybersecurity guidance
- ISO 13485 (QMS)

### Tier 3 — `@memo/ontology-medical-full`
*Full regulatory coverage.* Extends Tier 2 with comprehensive EU MDR/IVDR, FDA, post-market surveillance, clinical investigation, labeling, UDI, and quality system depth.

---

## Existing Elements (DO NOT DUPLICATE — extend or specialise only)

The following kinds already exist across `@memo/ontology-core` and `@memo/ontology-medical`. Every new element you define must either:
(a) be a new concept not in this list, or
(b) specialize an existing one using `:>` notation.

### Existing `@memo/ontology-core` kinds (103 total):
**Constructs:** `part def`, `action def`, `requirement def`, `interface def`, `item def`, `port def`, `attribute def`, `enum def`

| Construct | Existing Names |
|-----------|---------------|
| `part def` | Actor, Stakeholder, Program, Capability, Mission, OperationalEntity, Context, OperationalEnvironment, OperationalActor, Resource, Substance, Observable, LogicalComponent, System, SystemOfSystems, SystemExternal, Subsystem, ArchitectureDecision, ArchitectureRationale, QualityAttribute, Question, PhysicalComponent, ElectricalComponent, MechanicalComponent, PhysicalModule, HardwareNode, ComputingDevice, FPGA, Microcontroller, SingleBoardComputer, Software, SoftwareComponent, SoftwareModule, Firmware, OperatingSystem, Docker, EventDrivenService, MessageBroker, Port, PortEthernet, PortUSB, PortSerial, PortPower, DataEndpoint, ExchangeItem (as item def), MessageSchema, MessageField, AnalysisCase, Constraint, Calculation, TradeStudy, AnalysisResult, Assumption, Measure, Test, VerificationCase, ValidationCase, Evidence, RequirementSet |
| `action def` | Function, MissionFunction, SystemFunction, ComponentFunction, Scenario, UseCase, OperationalActivity, Operation, Procedure, OperationalScenario, MissionPhase |
| `requirement def` | Requirement, StakeholderNeed, MissionRequirement, SystemRequirement, FunctionalRequirement, TechnicalRequirement, InterfaceRequirement, Specification, MissionSpecification, FunctionSpecification, SystemSpecification, DesignSpecification, Goal, Concern |
| `interface def` | Interface, DataInterface, PublishSubscribeChannel, RequestResponseInterface, SoftwareInterface, SoftwareProvidedInterface, SoftwareRequiredInterface, PublisherInterface, SubscriberInterface, ServiceProviderInterface, ServiceConsumerInterface, InterfaceContract, CommunicationProtocol, InteroperabilityProfile, EventBus, TopicChannel, QueueChannel, MessageProducer, MessageConsumer, BrokerExchange, BrokerQueue |
| `item def` | ExchangeItem, Message, EventMessage, StateMessage, CommandMessage, RequestMessage, ResponseMessage |
| `attribute def` | DataType, Parameter |
| `enum def` | RequirementCategory |
| `connection def` (44) | TraceTo, Trace, Refines, Derives, Realization, Dependency, Satisfy, Verify, Constrains, ComposedOf, DecomposedBy, Aggregation, Association, AllocateTo, ParticipatesInSystemOfSystems, PerformedBy, PerformedOn, OccursIn, UsesResource, HasEquipment, HasPersonnel, ContainsSubstance, HasSubProcedure, Succession, Flow, ExposesInterface, HasEndpoint, ImplementsProtocol, ConformsToProfile, CarriesExchangeItem, PublishesTo, SubscribesTo, PublishesMessage, ConsumesMessage, ServesInterface, InvokesInterface, CarriesRequestMessage, CarriesResponseMessage, BrokersChannel, RoutesToChannel, DefinesMessageSchema, HasMessageField |

### Existing `@memo/ontology-medical` kinds (99 total):

| Construct | Existing Names |
|-----------|---------------|
| `part def` | QMSRecord, ComplianceEvidence, Standard, RegulatoryRequirement, CollateralStandardRequirement, ParticularStandardRequirement, DesignHistoryRecord, ChangeRecord, ReleaseBaseline, ManufacturingRecord, ServiceReport, CalibrationRecord, InstallationQualification, Component, EnvironmentElement, Patient, ClinicalBenefit, BenefitRiskAssessment, ResidualRiskEvaluation, OverallResidualRiskEvaluation, RiskManagementPlan, RiskManagementReport, ProductionPostProductionSignal, ProtectiveMeasure, FailureModesAndEffectsAnalysis, FaultTreeAnalysis, FaultTreeGate, SoftwareSystem, SoftwareItem, SoftwareUnit, SOUPItem, SoftwareAnomaly, SoftwareWorkProduct, SoftwareDevelopmentPlan, SOUPEvaluation, SBOMArtifact, SoftwareProblemReport, ChangeImpactAssessment, UseSpecification, UseErrorAnalysis, UsabilitySpecification, DesignOutput, DesignReview, FormativeEvaluation, SummativeEvaluation, UIElement, UIScreen, UIPanel, ClinicalEvidenceArtifact, ClinicalExperienceEvidence, ClinicalEvaluationPlan, ClinicalEvaluationReport, PersonalDataCategory, ProtectedHealthInformation, PrivacyNotice, PrivacyImpactAssessment, DataSubjectRequest, CyberAsset, ThreatModel, SecureUpdateCapability |
| `action def` | UserActivity, ManufacturingProcedure, InstallationProcedure, ServiceProcedure, PreventiveMaintenanceProcedure, CalibrationProcedure, SafetyFunction, SoftwareLifecycleProcess, SoftwareLifecycleActivity, UIFunction, ClinicalStep, TreatmentPathway, DataProcessingActivity |
| `requirement def` | UserNeed, SoftwareRequirement, HardwareRequirement, OtherRequirement, Hazard, HazardousSituation, Harm, Risk, RiskControl, SafetyGoal, EssentialPerformance, PrimaryOperatingFunction, EssentialPerformanceLossCondition, BasicSafety, FailureMode, FailureCause, FailureEffect, TopEvent, FaultTreeContributor, IntendedUse, DesignInput, UserInterfaceRequirement, UseError, ClinicalClaim, ClinicalPerformanceClaim, ClinicalSafetyClaim, CybersecurityRequirement, AuthenticationRequirement, AuthorizationRequirement, AuditLogRequirement, ThreatScenario, Vulnerability, SecurityControl |
| `enum def` | SeverityLevel (Negligible/Minor/Serious/Critical/Catastrophic), ProbabilityLevel (Incredible/Improbable/Remote/Occasional/Probable/Frequent), SoftwareSafetyClass (A/B/C), FaultTreeGateType (And/Or/PriorityAnd/Inhibit) |
| `connection def` (58) | ManufacturesSubject, InstallsSubject, ServicesSubject, MaintainsSubject, CalibratesSubject, QualifiesInstallation, Mitigates, Causes, LeadsTo, Identifies, PlansRiskManagement, AssessesResidualRisk, WeighsAgainstBenefit, ConcludesBenefitRisk, ConcludesOverallResidualRisk, MonitorsRiskSubject, ImplementsRiskControl, AppliesStandardRequirement, AnalyzesFailureMode, HasFailureCause, ResultsInFailureEffect, EscalatesToRisk, DetectsFailureMode, DefinesTopEvent, UsesGate, ContributesToEvent, TriggersHazardousSituation, Preserves, SupportsOperatingFunction, DefinesLossCondition, ProtectsEssentialPerformance, AddressesUseError, AnalyzesUseError, ExposesUseError, SpecifiesScenario, EvaluatesRequirement, ContributesToHazard, GovernsActivity, ProducesWorkProduct, PlansClinicalEvaluation, EvaluatesClinicalClaim, SupportsClinicalClaim, ClaimsClinicalBenefit, ClaimsForUse, ModelsThreat, ThreatensAsset, ExploitsVulnerability, MitigatesThreat, SecuresInterface, MaintainsSbom, SupportsSecureUpdate, ClassifiesData, ProcessesData, ProvidesPrivacyNotice, AssessesPrivacyImpact, RespondsToDataSubjectRequest, Evidences, Documents |

---

## Task: Design the expanded ontology

### Layer Model

Every element must be tagged with its **V-cycle stage** and **Arcadia layer**:

| Arcadia Layer | V-cycle Position | Focus |
|---------------|-----------------|-------|
| OA — Operational Analysis | Left-arm top | Stakeholder needs, operational context, mission |
| SA — System Need Analysis | Left-arm upper | System requirements, use cases, capabilities |
| LA — Logical Architecture | Left-arm middle | Logical components, functions, interfaces (what, not how) |
| PA — Physical Architecture | Left-arm lower | Physical/software components, deployment |
| EPBS — End Product Breakdown | Bottom | Configuration items, bill of materials |
| V&V Right Arm | Right arm (bottom→top) | Unit test → integration → system test → acceptance → clinical validation |

### What to produce

For **each tier**, produce a complete catalogue of:

1. **New elements to add** (name, construct type, description, Arcadia layer, V-cycle position, normative reference)
2. **Relationships to add** (name, source type, target type, description, normative reference)
3. **Enumerations to add** (name, values, normative reference)
4. **Gap analysis table** — what each standard requires vs. what exists vs. what is new

---

## Gap Analysis Targets

### Tier 1 — `@memo/ontology-core` gaps (V-cycle / Arcadia alignment)

These Arcadia/SysML v2 concepts are missing and should be added:

| Gap Area | Missing Concepts | Reference |
|----------|-----------------|-----------|
| **Arcadia OA** | OperationalCapability, OperationalExchange, OperationalInteraction | Arcadia 1.2 §3.2 |
| **Arcadia SA** | SystemCapability, SystemBoundary, CapabilityRealization | Arcadia 1.2 §3.3 |
| **Arcadia LA** | FunctionalChain, FunctionalExchange, LogicalFunction, AllocatedFunction | Arcadia 1.2 §3.4; SysML v2 |
| **Arcadia PA** | ConfigurationItem, PhysicalFunction, PhysicalLink, PhysicalPort, DeploymentNode | Arcadia 1.2 §3.5; ISO 15288 |
| **EPBS** | EndProductBreakdownStructure, ConfigurationBaseline, BillOfMaterials | ISO 10007; ISO 15288 |
| **V&V artifacts** | TestCampaign, TestSuite, TestProcedure, TestResult, TestReport, InspectionRecord, ReviewRecord, WalkthroughRecord | IEEE 829; ISO 29119 |
| **Trade/Analysis** | SafetyCase, SafetyCaseArgument, SafetyCaseEvidence | GSN Community Standard v2 |
| **Configuration Mgmt** | ChangeRequest, ProblemReport, ConfigurationAudit | ISO 10007; CMII |
| **Interface control** | InterfaceControlDocument, InterfaceDefinitionDocument | MIL-STD-973 |

### Tier 2 — `@memo/ontology-medical-core` gaps (mandatory standards)

**ISO 14971 (Risk Management) — missing:**
- `RiskAcceptabilityCriteria`, `RiskEstimation`, `RiskEvaluation`
- `PredefinedSafetyState` (IEC 60601-1 §4.3)
- `ResidualRiskCategory` enum (Acceptable / ALARP / Unacceptable)

**IEC 62304 (Software Lifecycle) — missing:**
- `SoftwareArchitectureDocument`, `SoftwareDetailedDesignDocument`
- `SoftwareIntegrationTestPlan`, `SoftwareSystemTestPlan`
- `SoftwareUnitTestPlan`, `SoftwareUnitTestRecord`
- `SoftwareRelease`, `SoftwareConfiguration`
- `DeviceSpecificSOUP` (SOUP used in a specific safety class context)
- `SoftwareChangeRequest :> ChangeRecord`
- `SoftwareVerificationRecord :> ComplianceEvidence`
- `SoftwareTransferRecord` (design transfer to manufacturing)

**IEC 60601-1 (General Safety) — missing:**
- `DeviceSafetyClass` enum (ClassI / ClassII / ClassIIa / ClassIIb / ClassIII — MDR; 510k / PMA — FDA)
- `MeansOfProtection` (basic / supplementary / reinforced insulation)
- `OperatingMode` (normal / single fault / test)
- `AppliedPart` (type B / BF / CF)
- `AppliedPartType` enum
- `EnvironmentalRatingCategory` (IPXX, temp, humidity)
- `MainsVoltageRange`, `PowerConsumption`

**IEC 62366-1 (Usability) — missing:**
- `TaskAnalysis`, `UserProfile`, `UseEnvironmentProfile`
- `KnownAnomalyList`, `UseRelatedRisk`
- `SummativeEvaluationProtocol`, `SummativeEvaluationReport`

**IEC 62443 / Cybersecurity — missing:**
- `SecurityZone`, `SecurityConduit`
- `SecurityLevel` enum (SL0–SL4)
- `SecurityPolicy`, `SecurityRiskAssessment`
- `PenetrationTest :> VerificationCase`
- `SecurityUpdateRecord`
- `CyberIncident`
- `ThreatAndRiskAnalysis` (TARA per UNECE WP.29 / ISO 21434)

**ISO 13485 (QMS) — missing:**
- `NonConformance`, `CAPA` (Corrective and Preventive Action)
- `InternalAudit`, `AuditFinding`
- `ManagementReview`, `ManagementReviewRecord`
- `SupplierAssessment`, `ApprovedSupplierList`
- `TrainingRecord`, `QualificationRecord`
- `ProcessValidation :> ValidationCase` (IQ/OQ/PQ)
- `InstallationQualificationProtocol`, `OperationalQualificationProtocol`, `PerformanceQualificationProtocol`

### Tier 3 — `@memo/ontology-medical-full` gaps (comprehensive coverage)

**EU MDR 2017/745 / IVDR 2017/746:**
- `TechnicalFile`, `TechnicalDocumentation`
- `DeclarationOfConformity`
- `NotifiedBody`, `NotifiedBodyCertificate`
- `EUDRDecision`, `ScrutinyProcedure`
- `SummaryOfSafetyAndClinicalPerformance` (SSCP)
- `PostMarketSurveillancePlan`, `PostMarketSurveillanceReport` (PMSR)
- `PostMarketClinicalFollowUpPlan` (PMCF)
- `PeriodicSafetyUpdateReport` (PSUR)
- `VigilanceReport`, `SeriousIncidentReport`, `FieldSafetyNotice`, `FieldSafetyCorrective Action`

**FDA 21 CFR:**
- `PremarketNotification510k`, `SubstantialEquivalenceDetermination` (21 CFR 807)
- `PremarketApprovalApplication` (PMA) (21 CFR 814)
- `InvestigationalDeviceExemption` (IDE) (21 CFR 812)
- `DesignHistoryFile` (DHF) (21 CFR 820.30)
- `DeviceMasterRecord` (DMR), `DeviceHistoryRecord` (DHR)
- `CorrectiveAndPreventiveAction` (CAPA) (21 CFR 820.100)
- `ComplaintRecord` (21 CFR 820.198)
- `MDRReport` (Medical Device Report / 21 CFR 803)

**UDI (IMDRF/FDA/MDR):**
- `UDI`, `DeviceIdentifier` (DI), `ProductionIdentifier` (PI)
- `UDIDatabase`, `UDICarrier`, `BarcodeSymbology` enum (GS1/HIBC/ISBT)
- `BasicUDIDevice` (MDR Art 27)

**Clinical Investigation (ISO 14155):**
- `ClinicalInvestigation`, `ClinicalInvestigationPlan`
- `ClinicalInvestigator`, `SponsorOrganization`
- `SubjectInformedConsent`, `Ethics CommitteeApproval`
- `SeriousAdverseEvent`, `AdverseEvent`, `DeviceDeficiency`
- `ClinicalInvestigationReport`

**Labeling (IEC 62366 / MDR Annex I / FDA 21 CFR 801):**
- `LabelingArtifact`, `InstructionsForUse` (IFU)
- `QuickReferenceGuide`, `ServiceManual`
- `LabelRequirement`, `PictogramReference`
- `LanguageVersion`, `LocalizationRecord`

**Supply Chain / Manufacturing:**
- `SupplierQualityAgreement`, `SupplierAudit`
- `MaterialSpecification`, `AcceptanceTestProcedure`
- `SterilizationProcess`, `SterilizationValidation`
- `PackagingValidation`, `ShelfLifeStudy`

---

## Output Format

### 1. Excel Workbook (`MEMO_Ontology_Design.xlsx`)

Create one workbook with these tabs:

| Tab Name | Contents |
|----------|---------|
| `README` | Legend, colour key, how to read |
| `V-cycle Map` | V-cycle diagram as a table: each row = V-cycle stage, columns = Arcadia layer, existing kinds, new kinds to add |
| `Tier1 — Core` | All `@memo/ontology-core` elements: Name, Construct, Arcadia Layer, V-cycle Stage, Description, Parent, Status (Existing/New/Modified) |
| `Tier2 — Medical Core` | All `@memo/ontology-medical-core` elements with same columns + Normative Reference (e.g. "ISO 14971 §6.2"), Standard Clause |
| `Tier3 — Medical Full` | All `@memo/ontology-medical-full` elements with same columns + Normative Reference + Regulation (MDR/FDA/etc.) |
| `Relationships — Core` | All connection defs: Name, Source Kind, Target Kind, Description, Status |
| `Relationships — Medical` | Medical connection defs + normative references |
| `Gap Analysis` | Standard → Required concept → Existing element (or "MISSING") → Proposed new element → Priority (P0/P1/P2) |
| `Standards Index` | Standard code, full title, edition, key sections relevant to each ontology layer |

**Colour coding (rows):**
- 🟦 Blue fill = existing element (do not change)
- 🟩 Green fill = new element proposed in this design
- 🟨 Yellow fill = existing element to be modified or extended
- 🟥 Red fill = gap with no proposed solution yet (needs expert input)

**Colour coding (Construct column):**
- `part def` = light blue
- `action def` = light green
- `requirement def` = light orange
- `interface def` = light purple
- `item def` = mint
- `enum def` = light yellow
- `connection def` = light red

### 2. draw.io Diagram (`MEMO_Ontology_Design.drawio`)

Create one multi-page draw.io file. Each page uses:
- **Swimlane groups** for Arcadia layers / domain clusters
- **Color-coded boxes** matching the Excel colour scheme above
- **Open-triangle arrows** (UML generalisation style) for inheritance (`:>`)
- **Dashed arrows** for `connection def` relationships
- **Right-side arrow routing** (`exitX=1;exitY=0.5` / `entryX=1;entryY=0.5`) to avoid label overlap
- **12px vertical gap** between element boxes inside each swimlane
- **Legend** on every page

Pages:

| Page | Contents |
|------|---------|
| `Overview` | Three-tier package dependency graph (boxes for each package, arrows for extends/imports) |
| `V-cycle Map` | V-cycle shape with Arcadia layers overlaid, kinds positioned at their stage |
| `Tier1 — MBSE Core` | `@memo/ontology-core` — all kinds, grouped by Arcadia layer |
| `Tier1 — Relationships` | Core connection defs as relationship table |
| `Tier2 — Medical Core` | `@memo/ontology-medical-core` — grouped by standard domain |
| `Tier2 — Relationships` | Medical core connection defs |
| `Tier3 — Medical Full` | `@memo/ontology-medical-full` — grouped by regulation/standard |
| `Tier3 — Relationships` | Medical full connection defs |
| `Gap Analysis` | Table view: Standard → Missing → Proposed |

---

## Normative References

Include standard references in this format: `[STANDARD §CLAUSE: description]`

| Standard | Scope in ontology | Key clauses |
|----------|------------------|-------------|
| **ISO 14971:2019** | Risk management | §4 (framework), §5 (risk analysis), §6 (risk evaluation), §7 (risk controls), §8 (residual risk), §9 (benefit-risk), §10 (PMS) |
| **IEC 62304:2015+AMD1:2015** | Software lifecycle | §5 (development), §6 (maintenance), §7 (risk mgmt), §8 (config mgmt), §9 (problem resolution) |
| **IEC 60601-1:2005+AMD2:2020** | General electrical safety | §4 (classification), §8 (protection), §11 (power supply), §14 (programmable electrical medical systems) |
| **IEC 62366-1:2015+AMD1:2020** | Usability | §5 (process), §6 (summative evaluation) |
| **IEC 62443-4-1:2018** | Secure development lifecycle | §5–12 (security practices) |
| **IMDRF/CYBER WP (2020)** | Medical device cybersecurity | Threat modelling, SBOM, TARA |
| **ISO 13485:2016** | QMS | §4 (QMS), §7 (product realisation), §8 (measurement) |
| **ISO/IEC/IEEE 15288:2023** | System lifecycle | §6.4 (technical processes) |
| **ISO/IEC/IEEE 42010:2022** | Architecture description | §4 (AD), §5 (viewpoints), §7 (frameworks) |
| **Arcadia/Capella 1.2** | MBSE methodology | OA §3.2, SA §3.3, LA §3.4, PA §3.5 |
| **SysML v2 (2024)** | Modeling language | Part Def, Action Def, Requirement Def, Connection Def |
| **EU MDR 2017/745** | EU market access | Art.10 (obligations), Art.61 (clinical evaluation), Annex XIV (PMCF), Annex XV (clinical investigation) |
| **EU MDR Annex I** | General safety/performance | Chapter I (general), Chapter II (design/mfg), Chapter III (information) |
| **FDA 21 CFR Part 820** | Quality system | §820.30 (design controls), §820.100 (CAPA), §820.198 (complaints) |
| **FDA 21 CFR Part 803** | MDR reporting | §803.50 (manufacturer reports) |
| **ISO 14155:2020** | Clinical investigation | §5 (obligations), §6 (ethics), §7 (plan), §9 (monitoring), §10 (adverse events) |
| **IMDRF UDI WG (2013)** | Unique Device Identification | §5 (DI), §6 (PI), §7 (carrier) |
| **GSN Community Standard v2** | Safety cases | Goal, Strategy, Solution, Context, Assumption, Justification |
| **ISO/IEC 27001:2022** | Information security | §6.1 (risk treatment), §8.2 (risk assessment) |
| **NIST SP 800-30 Rev1** | Cybersecurity risk | Threat source, threat event, vulnerability, likelihood, impact |

---

## Design Principles

1. **Minimal and orthogonal** — prefer one concept for one purpose; avoid synonyms
2. **Specialise, don't duplicate** — new medical elements must extend core elements via `:>`
3. **Standard-traceability** — every element in Tier 2/3 must reference at least one normative clause
4. **V-cycle mapping** — every element must have a clear left-arm (spec), bottom (implementation), or right-arm (V&V) assignment
5. **Arcadia layer discipline** — no cross-layer references except through allocation relationships
6. **Relationship completeness** — for every new element, define at least one incoming and one outgoing connection def
7. **Enumeration richness** — prefer enumerations over free-text attributes for classification
8. **Avoid regulatory detail** — ontology captures structure, not procedure text; keep element names abstract enough to apply across MDR, FDA, and PMDA

---

## Acceptance Criteria

- [ ] All existing elements preserved (no renames, no deletions without annotation)
- [ ] Each new element has: name, construct, description, Arcadia layer, V-cycle stage, normative reference
- [ ] ISO 14971, IEC 62304, IEC 60601-1, IEC 62366-1, IEC 62443 fully covered in Tier 2
- [ ] MDR, FDA, ISO 13485, ISO 14155, UDI fully covered in Tier 3
- [ ] Excel gap analysis table complete (no blank cells in Required/Proposed columns)
- [ ] draw.io diagram valid XML, opens in app.diagrams.net without errors
- [ ] Tier 1 has 0 medical/regulatory concepts
- [ ] All inheritance chains are consistent (child construct type = parent construct type)
- [ ] No connection def whose source or target kind does not exist in the ontology
