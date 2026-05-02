# Ontology Reference

This page catalogs every type and relationship in the MEMO ontology stack. Types are organized by package and domain. Use the [package overview](#packages) to decide which packages to enable in your project.

---

## Packages

| Package | Role | Default | Description |
|---------|------|---------|-------------|
| [`@memo/ontology-core`](#ontology-core) | Core | ✅ Always | Domain-agnostic MBSE backbone — 11 architecture layers |
| [`@memo/ontology-medical`](#ontology-medical) | Core | ✅ Always | Medical device backbone — ISO 14971, IEC 62304, IEC 62366 |
| [`@memo/medical-modeling-profile`](#medical-modeling-profile) | Profile | ✅ Recommended | Closure rules, viewpoints, and starter templates |
| [`@memo/ontology-clinical`](#ontology-clinical) | Extension | Opt-in | Niche anatomical/pharma concepts — surgery, drug delivery |
| [`@memo/ontology-clinical-interop`](#ontology-clinical-interop) | Extension | Opt-in | Terminology interop — SNOMED CT, LOINC, HL7 |
| [`@memo/medical-product-line-profile`](#medical-product-line-profile) | Extension | Opt-in | Product families, variants, and feature management |
| [`@memo/ontology-platform-robotics`](#ontology-platform-robotics) | Extension | Opt-in | ROS (Robot Operating System) platform definitions |
| [`@memo/ontology-platform-messaging`](#ontology-platform-messaging) | Extension | Opt-in | RabbitMQ messaging broker definitions |

Opt-in packages are added under `ontologies:` in your `memo.config.yaml`.

---

## `@memo/ontology-core` {#ontology-core}

Domain-agnostic MBSE backbone following the CoSMA architecture (Context → Stakeholder → Model → Analysis). Does not import any medical or domain-specific concepts.

### Business & Stakeholder

*File: `purpose/business.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Program` | `part def` | A programme of work or project |
| `Actor` | `part def` | A person, organization, or system role |
| `Stakeholder` | `part def :> Actor` | An actor with an interest or concern in the system |
| `Capability` | `part def` | An ability the system must provide |
| `Goal` | `requirement def` | A high-level stakeholder objective |
| `Concern` | `requirement def` | A stakeholder worry or risk area |

### Operational Context

*File: `operational/operational.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Mission` | `part def` | The overall purpose a system is designed to fulfil |
| `Context` | `part def` | The broader operating environment |
| `OperationalActor` | `part def` | A human or organizational role in the operational environment |
| `OperationalEntity` | `part def` | An item, tool, or object in the operational context |
| `OperationalEnvironment` | `part def :> Context` | The physical or virtual setting in which operations occur |
| `Resource` | `part def :> OperationalEntity` | An asset required to perform an operation |
| `Substance` | `part def :> OperationalEntity` | A physical material (e.g. drug, blood, saline) |
| `Observable` | `part def :> OperationalEntity` | A measurable parameter (e.g. flow rate, temperature) |
| `OperationalActivity` | `action def` | A high-level activity performed by actors |
| `Operation` | `action def :> OperationalActivity` | A specific task or group of actions |
| `Procedure` | `action def :> Operation` | A structured sequence of operations with a defined objective |
| `OperationalScenario` | `action def` | A specific sequence of events in the operational context |
| `MissionPhase` | `action def` | A distinct stage of a mission or operation |

### Functional

*File: `functional/functional.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Function` | `action def` | A generic unit of behavior |
| `MissionFunction` | `action def :> Function` | A top-level function fulfilling a mission requirement |
| `SystemFunction` | `action def :> Function` | A function provided by the system of interest |
| `ComponentFunction` | `action def :> Function` | A function allocated to a specific sub-component |
| `Scenario` | `action def` | A behavioral sequence illustrating a use case |
| `UseCase` | `action def` | A goal-oriented behavior from an actor's perspective |

### Requirements

*File: `requirements/requirements.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Requirement` | `requirement def` | A base requirement |
| `StakeholderNeed` | `requirement def :> Requirement` | A high-level goal expressed by a stakeholder |
| `MissionRequirement` | `requirement def :> Requirement` | A mission-level requirement |
| `SystemRequirement` | `requirement def :> Requirement` | A formal requirement on the system or component |
| `FunctionalRequirement` | `requirement def :> Requirement` | A requirement on system behavior |
| `TechnicalRequirement` | `requirement def :> Requirement` | A requirement on system properties or constraints |
| `InterfaceRequirement` | `requirement def :> Requirement` | A requirement on system interfaces |
| `Specification` | `requirement def :> Requirement` | A collection of requirements for a scope |
| `MissionSpecification` | `requirement def :> Specification` | Specification for a mission scope |
| `FunctionSpecification` | `requirement def :> Specification` | Specification for a functional scope |
| `SystemSpecification` | `requirement def :> Specification` | Specification for the full system |
| `DesignSpecification` | `requirement def :> Specification` | Detailed design-level specification |
| `RequirementSet` | `part def` | A named grouping of requirements |
| `RequirementCategory` | `enum def` | Enumeration of requirement categories |

### Logical Architecture

*File: `logical/logical.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `System` | `part def` | The system of interest |
| `SystemOfSystems` | `part def :> System` | A system composed of multiple cooperating systems |
| `SystemExternal` | `part def :> System` | An external system in the operational context |
| `Subsystem` | `part def` | A major subdivision of the system |
| `LogicalComponent` | `part def` | An abstract functional unit of the logical architecture |
| `ArchitectureDecision` | `part def` | A recorded design choice |
| `ArchitectureRationale` | `part def` | The reasoning behind an architecture decision |
| `QualityAttribute` | `part def` | A non-functional property (performance, reliability, etc.) |
| `Question` | `part def` | An open design question requiring resolution |

### Physical Architecture

*File: `physical/physical.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `PhysicalComponent` | `part def` | A physical hardware element |
| `ElectricalComponent` | `part def :> PhysicalComponent` | An electrical hardware element (PCB, sensor, motor) |
| `MechanicalComponent` | `part def :> PhysicalComponent` | A mechanical element (housing, clamp, connector) |
| `PhysicalModule` | `part def` | A modular physical assembly |
| `HardwareNode` | `part def :> PhysicalComponent` | A computing or networking node |
| `ComputingDevice` | `part def :> HardwareNode` | A device that executes software |
| `FPGA` | `part def :> ComputingDevice` | Field-Programmable Gate Array |
| `Microcontroller` | `part def :> ComputingDevice` | An embedded microcontroller |
| `SingleBoardComputer` | `part def :> ComputingDevice` | A single-board computer (Raspberry Pi, BeagleBone, etc.) |

### Software

*File: `software/software.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Software` | `part def` | A generic software element |
| `SoftwareComponent` | `part def :> Software` | A deployable software unit |
| `SoftwareModule` | `part def :> Software` | A logical grouping of software functions |
| `Firmware` | `part def :> Software` | Embedded firmware |
| `OperatingSystem` | `part def :> Software` | An operating system |

### Platform & Middleware

*File: `platform/platform.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Docker` | `part def :> Software` | A containerized deployment unit |
| `EventDrivenService` | `part def :> SoftwareComponent` | A service that reacts to events |
| `MessageBroker` | `part def :> SoftwareComponent` | A generic message broker |
| `EventBus` | `interface def :> PublishSubscribeChannel` | A publish/subscribe event bus |
| `TopicChannel` | `interface def :> PublishSubscribeChannel` | A named topic on a publish/subscribe channel |
| `QueueChannel` | `interface def :> PublishSubscribeChannel` | A point-to-point queue channel |
| `MessageProducer` | `interface def :> PublisherInterface` | A message-producing endpoint |
| `MessageConsumer` | `interface def :> SubscriberInterface` | A message-consuming endpoint |
| `BrokerExchange` | `interface def :> TopicChannel` | A broker-level exchange (routing point) |
| `BrokerQueue` | `interface def :> QueueChannel` | A broker-level queue |

### Interfaces & Ports

*File: `interfaces/interfaces.sysml`*

#### Ports

| Kind | Construct | Description |
|------|-----------|-------------|
| `Port` | `port def` | A generic connection point |
| `PortEthernet` | `port def :> Port` | An Ethernet port |
| `PortUSB` | `port def :> Port` | A USB port |
| `PortSerial` | `port def :> Port` | A serial (UART/RS-232/RS-485) port |
| `PortPower` | `port def :> Port` | A power supply port |
| `DataEndpoint` | `port def :> Port` | A logical data endpoint |

#### Interfaces

| Kind | Construct | Description |
|------|-----------|-------------|
| `Interface` | `interface def` | A generic interface |
| `DataInterface` | `interface def :> Interface` | An interface that carries data |
| `PublishSubscribeChannel` | `interface def :> DataInterface` | A pub/sub data channel |
| `RequestResponseInterface` | `interface def :> DataInterface` | A synchronous request/response interface |
| `SoftwareInterface` | `interface def :> Interface` | A software-level interface |
| `SoftwareProvidedInterface` | `interface def :> SoftwareInterface` | An interface provided (exposed) by a component |
| `SoftwareRequiredInterface` | `interface def :> SoftwareInterface` | An interface required (consumed) by a component |
| `PublisherInterface` | `interface def :> SoftwareProvidedInterface` | A publisher endpoint |
| `SubscriberInterface` | `interface def :> SoftwareRequiredInterface` | A subscriber endpoint |
| `ServiceProviderInterface` | `interface def :> SoftwareProvidedInterface` | A service provider endpoint |
| `ServiceConsumerInterface` | `interface def :> SoftwareRequiredInterface` | A service consumer endpoint |
| `InterfaceContract` | `interface def :> Interface` | A formal interface specification |
| `CommunicationProtocol` | `interface def :> InterfaceContract` | A communication protocol specification |
| `InteroperabilityProfile` | `interface def :> InterfaceContract` | An interoperability conformance profile |

#### Exchange Items

| Kind | Construct | Description |
|------|-----------|-------------|
| `ExchangeItem` | `item def` | A generic item flowing across an interface |
| `Message` | `item def :> ExchangeItem` | A discrete message |
| `EventMessage` | `item def :> Message` | A message signalling an event |
| `StateMessage` | `item def :> Message` | A message carrying state information |
| `CommandMessage` | `item def :> Message` | A message issuing a command |
| `RequestMessage` | `item def :> Message` | A request in a request/response exchange |
| `ResponseMessage` | `item def :> Message` | A response in a request/response exchange |
| `MessageSchema` | `part def` | Describes the structure of a message |
| `MessageField` | `part def` | A field within a message schema |
| `DataType` | `attribute def` | A primitive or composite data type |

### Analysis & Trade Studies

*File: `analysis/analysis.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `AnalysisCase` | `part def` | A structured analysis activity |
| `Constraint` | `part def` | A constraint on design or behavior |
| `Calculation` | `part def` | A computation or formula |
| `TradeStudy` | `part def` | A multi-criteria design trade-off study |
| `AnalysisResult` | `part def` | The output of an analysis case |
| `Assumption` | `part def` | A stated assumption in the model |
| `Measure` | `part def` | A quantitative measure of a quality attribute |
| `Parameter` | `attribute def` | A parametric value used in calculations |

### Verification & Validation

*File: `verification/verification.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Test` | `part def` | A test procedure or test case |
| `VerificationCase` | `part def` | A formal verification activity |
| `ValidationCase` | `part def` | A formal validation activity |
| `Evidence` | `part def` | Evidence collected during V&V |

---

### Core Relationships

*File: `relationships/relationships.sysml`*

#### Traceability & Refinement

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `TraceTo` | Any → Any | Generic traceability link |
| `Trace` | Any → Any | SysML trace dependency |
| `Refines` | Any → Any | More precise refinement of an abstraction |
| `Derives` | Requirement → Requirement | Downstream requirement derivation |
| `Realization` | Any → Any | Realization of an abstract element |
| `Dependency` | Any → Any | Generic dependency between elements |

#### Requirements

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `Satisfy` | Any → Requirement | An element fulfils a requirement |
| `Verify` | Test → Requirement | A test verifies a requirement |
| `Constrains` | Constraint → Any | A constraint applies to an element |

#### Decomposition & Composition

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `ComposedOf` | Any → Any | Whole-part composition |
| `DecomposedBy` | Any → Any | Decomposition into sub-elements |
| `Aggregation` | Any → Any | Aggregate/collection grouping |
| `Association` | Any → Any | Generic association |
| `AllocateTo` | Any → Any | Allocation of an element to an implementation |
| `ParticipatesInSystemOfSystems` | System → SystemOfSystems | System participates in a SoS |

#### Operational & Behavioral

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `PerformedBy` | Activity → Actor | An activity is performed by an actor |
| `PerformedOn` | Activity → Entity | An activity is performed on an entity |
| `OccursIn` | Activity → Environment | An activity occurs in an environment |
| `UsesResource` | Activity → Resource | An activity consumes a resource |
| `HasEquipment` | Procedure → Equipment | A procedure requires equipment |
| `HasPersonnel` | Procedure → Actor | A procedure requires personnel |
| `ContainsSubstance` | Entity → Substance | An entity contains a substance |
| `HasSubProcedure` | Procedure → Procedure | A procedure has a sub-procedure |
| `Succession` | Activity → Activity | Temporal succession between activities |
| `Flow` | Any → Any | Flow of items between elements |

#### Interfaces & Messaging

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `ExposesInterface` | Component → Interface | A component exposes an interface |
| `HasEndpoint` | Interface → Port | An interface has a port endpoint |
| `ImplementsProtocol` | Component → Protocol | A component implements a protocol |
| `ConformsToProfile` | Component → Profile | A component conforms to an interop profile |
| `CarriesExchangeItem` | Interface → ExchangeItem | An interface carries a particular item |
| `PublishesTo` | Component → Channel | A component publishes to a channel |
| `SubscribesTo` | Component → Channel | A component subscribes to a channel |
| `PublishesMessage` | Publisher → Message | A publisher emits a message type |
| `ConsumesMessage` | Subscriber → Message | A subscriber consumes a message type |
| `ServesInterface` | Provider → Interface | A provider serves an interface |
| `InvokesInterface` | Consumer → Interface | A consumer invokes an interface |
| `CarriesRequestMessage` | Interface → RequestMessage | An interface carries request messages |
| `CarriesResponseMessage` | Interface → ResponseMessage | An interface carries response messages |
| `BrokersChannel` | Broker → Channel | A broker manages a channel |
| `RoutesToChannel` | Exchange → Channel | A broker exchange routes to a channel |
| `DefinesMessageSchema` | Schema → Message | A schema defines message structure |
| `HasMessageField` | Schema → Field | A schema contains a field |

---

## `@memo/ontology-medical` {#ontology-medical}

Medical device domain backbone. Extends `@memo/ontology-core`. Covers ISO 14971 (risk management), IEC 62304 (software lifecycle), IEC 62366 (usability), IEC 62133/60601 (safety), and quality management.

### Medical Development Specializations

*File: `operations/medical-development.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `UserNeed` | `requirement def :> StakeholderNeed` | A user/patient need driving design inputs |
| `SoftwareRequirement` | `requirement def :> TechnicalRequirement` | A software-specific requirement |
| `HardwareRequirement` | `requirement def :> TechnicalRequirement` | A hardware-specific requirement |
| `OtherRequirement` | `requirement def :> Requirement` | A requirement not covered by other categories |
| `UserActivity` | `action def :> OperationalActivity` | A task performed by a device user |
| `Component` | `part def :> LogicalComponent` | A medical device component |
| `EnvironmentElement` | `part def :> Resource` | An environmental factor relevant to device use |

### Operations & Service Lifecycle

*File: `operations/operations-service.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `ManufacturingProcedure` | `action def :> Procedure` | A procedure for device manufacturing |
| `InstallationProcedure` | `action def :> Procedure` | A procedure for device installation |
| `ServiceProcedure` | `action def :> Procedure` | A device service or repair procedure |
| `PreventiveMaintenanceProcedure` | `action def :> ServiceProcedure` | A scheduled preventive maintenance procedure |
| `CalibrationProcedure` | `action def :> ServiceProcedure` | A calibration procedure |
| `ManufacturingRecord` | `part def :> QMSRecord` | Record of device manufacturing |
| `InstallationQualification` | `part def :> ComplianceEvidence` | IQ evidence for installation |
| `ServiceReport` | `part def :> QMSRecord` | Record of a service activity |
| `CalibrationRecord` | `part def :> ComplianceEvidence` | Record of a calibration event |

### Quality Management System (QMS)

*File: `qms/qms-trace.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `QMSRecord` | `part def` | A quality management record |
| `ComplianceEvidence` | `part def :> QMSRecord` | Evidence of regulatory compliance |
| `Standard` | `part def` | A referenced regulatory or technical standard |
| `RegulatoryRequirement` | `part def` | A requirement derived from a standard or regulation |
| `CollateralStandardRequirement` | `part def :> RegulatoryRequirement` | A collateral (group) standard requirement |
| `ParticularStandardRequirement` | `part def :> RegulatoryRequirement` | A particular (device-type) standard requirement |
| `DesignHistoryRecord` | `part def :> QMSRecord` | FDA DHF / EU MDR technical file record |
| `ChangeRecord` | `part def :> QMSRecord` | A document change or design change record |
| `ReleaseBaseline` | `part def :> QMSRecord` | A released configuration baseline |

### Risk Management — ISO 14971

*File: `risk/risk-management.sysml`*

#### Enumerations

| Enum | Values |
|------|--------|
| `SeverityLevel` | `Negligible`, `Minor`, `Serious`, `Critical`, `Catastrophic` |
| `ProbabilityLevel` | `Incredible`, `Improbable`, `Remote`, `Occasional`, `Probable`, `Frequent` |

#### Kinds

| Kind | Construct | Description |
|------|-----------|-------------|
| `Hazard` | `requirement def` | A potential source of harm |
| `HazardousSituation` | `requirement def` | A circumstance in which a hazard can cause harm |
| `Harm` | `requirement def` | Injury or damage to people, property, or environment |
| `Risk` | `requirement def` | The combination of probability and severity of harm |
| `RiskControl` | `requirement def` | A measure to reduce risk to acceptable levels |
| `ClinicalBenefit` | `part def` | A positive clinical outcome attributed to the device |
| `BenefitRiskAssessment` | `part def` | A formal benefit/risk determination |
| `ResidualRiskEvaluation` | `part def` | Evaluation of residual risk after controls are applied |
| `OverallResidualRiskEvaluation` | `part def` | Overall residual risk conclusion for the device |
| `RiskManagementPlan` | `part def :> QMSRecord` | ISO 14971 risk management plan |
| `RiskManagementReport` | `part def :> QMSRecord` | ISO 14971 risk management report |
| `ProductionPostProductionSignal` | `part def :> ComplianceEvidence` | Post-market surveillance signal |

### Safety — IEC 60601 / Essential Performance

*File: `safety/safety-essential-performance.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `SafetyGoal` | `requirement def` | A top-level safety objective |
| `EssentialPerformance` | `requirement def` | A performance characteristic whose loss leads to unacceptable risk |
| `PrimaryOperatingFunction` | `requirement def :> EssentialPerformance` | The primary clinical function of the device |
| `EssentialPerformanceLossCondition` | `requirement def` | A condition that causes essential performance loss |
| `BasicSafety` | `requirement def` | Freedom from unacceptable physical risk in normal use |
| `SafetyFunction` | `action def` | A function that maintains safety or essential performance |
| `ProtectiveMeasure` | `part def` | A design feature providing protection against a hazard |

### Failure Analysis — FMEA & FTA

*File: `risk/risk-analysis.sysml`*

| Enum | Values |
|------|--------|
| `FaultTreeGateType` | `And`, `Or`, `PriorityAnd`, `Inhibit` |

| Kind | Construct | Description |
|------|-----------|-------------|
| `FailureModesAndEffectsAnalysis` | `part def` | An FMEA analysis artifact |
| `FailureMode` | `requirement def` | A way in which a component or function can fail |
| `FailureCause` | `requirement def` | The root cause of a failure mode |
| `FailureEffect` | `requirement def` | The consequence of a failure mode |
| `FaultTreeAnalysis` | `part def` | A fault tree analysis artifact |
| `TopEvent` | `requirement def` | The top-level undesired event in a fault tree |
| `FaultTreeContributor` | `requirement def` | A contributing event or condition in a fault tree (intermediate or basic event) |
| `FaultTreeGate` | `part def` | A logic gate in a fault tree (AND, OR, etc.) |

### IEC 62304 Software Lifecycle

*File: `software-lifecycle/software-lifecycle.sysml`*

| Enum | Values |
|------|--------|
| `SoftwareSafetyClass` | `A`, `B`, `C` |

| Kind | Construct | Description |
|------|-----------|-------------|
| `SoftwareSystem` | `part def` | The top-level software system |
| `SoftwareItem` | `part def` | A subdivision of the software system |
| `SoftwareUnit` | `part def` | The smallest unit that is independently tested |
| `SOUPItem` | `part def` | Software of Unknown Provenance (third-party library) |
| `SoftwareAnomaly` | `part def` | A defect or unexpected behavior |
| `SoftwareLifecycleProcess` | `action def` | A software lifecycle process (development, maintenance, etc.) |
| `SoftwareLifecycleActivity` | `action def` | An activity within a lifecycle process |
| `SoftwareWorkProduct` | `part def` | An artifact produced by a lifecycle activity |
| `SoftwareDevelopmentPlan` | `part def :> SoftwareWorkProduct` | The IEC 62304 software development plan |
| `SOUPEvaluation` | `part def :> SoftwareWorkProduct` | SOUP evaluation record |
| `SBOMArtifact` | `part def :> SoftwareWorkProduct` | Software Bill of Materials |
| `SoftwareProblemReport` | `part def :> SoftwareWorkProduct` | A software problem report |
| `ChangeImpactAssessment` | `part def :> SoftwareWorkProduct` | An impact assessment for a proposed change |

### IEC 62366 Usability & Design Control

*File: `design-control/design-control.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `IntendedUse` | `requirement def` | The stated intended purpose of the device |
| `DesignInput` | `requirement def` | A formal design input requirement |
| `UserInterfaceRequirement` | `requirement def :> InterfaceRequirement` | A requirement on the user interface |
| `UseError` | `requirement def :> Requirement` | A use error identified during usability analysis |
| `UseSpecification` | `part def` | The summary of use specification (IEC 62366-1 §5.3) |
| `UseErrorAnalysis` | `part def` | Analysis of potential use errors |
| `UsabilitySpecification` | `part def` | Usability requirements and acceptance criteria |
| `DesignOutput` | `part def` | A design output document or artifact |
| `DesignReview` | `part def` | A formal design review record |
| `FormativeEvaluation` | `part def :> ValidationCase` | A formative usability evaluation |
| `SummativeEvaluation` | `part def :> ValidationCase` | A summative (final) usability evaluation |

### User Interface

*File: `ui/ui.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `UIFunction` | `action def :> SystemFunction` | A user-interface function |
| `UIElement` | `part def :> SoftwareComponent` | A UI component |
| `UIScreen` | `part def :> UIElement` | A screen or display view |
| `UIPanel` | `part def :> UIElement` | A panel or widget within a screen |

### Clinical Context & Evaluation

*File: `clinical/clinical-context.sysml`, `clinical/clinical-evaluation.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `Patient` | `part def :> OperationalEntity` | A patient as a participant in the operational context |
| `ClinicalStep` | `action def :> Procedure` | A single step in a clinical procedure |
| `TreatmentPathway` | `action def :> Procedure` | A clinical pathway or protocol |
| `ClinicalClaim` | `requirement def :> Requirement` | A clinical performance or safety claim |
| `ClinicalPerformanceClaim` | `requirement def :> ClinicalClaim` | A claim about clinical performance |
| `ClinicalSafetyClaim` | `requirement def :> ClinicalClaim` | A claim about clinical safety |
| `ClinicalBenefit` | `part def` | A defined clinical benefit |
| `ClinicalEvidenceArtifact` | `part def :> ComplianceEvidence` | A clinical evidence document |
| `ClinicalExperienceEvidence` | `part def :> ClinicalEvidenceArtifact` | Post-market clinical follow-up evidence |
| `ClinicalEvaluationPlan` | `part def :> QMSRecord` | MDR/IVDR clinical evaluation plan |
| `ClinicalEvaluationReport` | `part def :> QMSRecord` | MDR/IVDR clinical evaluation report |

### Cybersecurity

*File: `cybersecurity/cybersecurity-interoperability.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `CybersecurityRequirement` | `requirement def :> TechnicalRequirement` | A cybersecurity requirement |
| `AuthenticationRequirement` | `requirement def :> CybersecurityRequirement` | An authentication requirement |
| `AuthorizationRequirement` | `requirement def :> CybersecurityRequirement` | An authorization requirement |
| `AuditLogRequirement` | `requirement def :> CybersecurityRequirement` | An audit logging requirement |
| `ThreatScenario` | `requirement def` | A cybersecurity threat scenario |
| `Vulnerability` | `requirement def` | A known software or hardware vulnerability |
| `SecurityControl` | `requirement def :> RiskControl` | A security measure to mitigate a threat |
| `CyberAsset` | `part def` | A digital asset requiring protection |
| `ThreatModel` | `part def` | A threat model for the device |
| `SBOMArtifact` | `part def :> SoftwareWorkProduct` | A Software Bill of Materials |
| `SecureUpdateCapability` | `part def` | Device capability for secure over-the-air updates |

### Privacy & Data Governance

*File: `privacy/privacy-import-governance.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `PersonalDataCategory` | `part def` | A category of personal data processed by the device |
| `ProtectedHealthInformation` | `part def :> PersonalDataCategory` | Protected Health Information (PHI) under HIPAA/GDPR |
| `DataProcessingActivity` | `action def :> OperationalActivity` | An activity that processes personal data |
| `PrivacyNotice` | `part def :> QMSRecord` | A privacy notice or data protection statement |
| `PrivacyImpactAssessment` | `part def :> QMSRecord` | A GDPR Data Protection Impact Assessment (DPIA) |
| `DataSubjectRequest` | `part def :> QMSRecord` | A data subject access/erasure request record |

---

### Medical Relationships

*File: `relationships/relationships.sysml`*

#### Operations & Lifecycle

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `ManufacturesSubject` | ManufacturingProcedure → Any | Procedure manufactures a device |
| `InstallsSubject` | InstallationProcedure → Any | Procedure installs a device |
| `ServicesSubject` | ServiceProcedure → Any | Procedure services a device |
| `MaintainsSubject` | PreventiveMaintenanceProcedure → Any | Procedure performs preventive maintenance |
| `CalibratesSubject` | CalibrationProcedure → Any | Procedure calibrates a device |
| `QualifiesInstallation` | InstallationQualification → Any | IQ qualification for an installation |

#### Risk Management

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `Mitigates` | RiskControl → Hazard | A risk control mitigates a hazard |
| `Causes` | Hazard → HazardousSituation | A hazard leads to a hazardous situation |
| `LeadsTo` | HazardousSituation → Harm | A hazardous situation leads to harm |
| `Identifies` | Risk → Hazard | A risk identifies a hazard |
| `PlansRiskManagement` | RiskManagementPlan → Any | A plan governs risk management for a subject |
| `AssessesResidualRisk` | ResidualRiskEvaluation → Any | Evaluation assesses residual risk |
| `WeighsAgainstBenefit` | BenefitRiskAssessment → ClinicalBenefit | Assessment weighs risk against benefit |
| `ConcludesBenefitRisk` | BenefitRiskAssessment → Any | Assessment concludes benefit/risk for a subject |
| `ConcludesOverallResidualRisk` | RiskManagementReport → OverallResidualRiskEvaluation | Report captures overall residual risk conclusion |
| `MonitorsRiskSubject` | ProductionPostProductionSignal → Any | A PMS signal monitors a subject |
| `ImplementsRiskControl` | Any → RiskControl | An element implements a risk control |
| `AppliesStandardRequirement` | RegulatoryRequirement → Any | A standard requirement applies to a subject |

#### Failure Analysis (FMEA / FTA)

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `AnalyzesFailureMode` | FMEA → FailureMode | An FMEA covers a failure mode |
| `HasFailureCause` | FailureMode → FailureCause | A failure mode has a cause |
| `ResultsInFailureEffect` | FailureMode → FailureEffect | A failure mode results in an effect |
| `EscalatesToRisk` | FailureEffect → Any | A failure effect escalates to a risk |
| `DetectsFailureMode` | RiskControl → FailureMode | A control detects a failure mode |
| `DefinesTopEvent` | FaultTreeAnalysis → TopEvent | An FTA defines its top event |
| `UsesGate` | Event → FaultTreeGate | An event uses a logical gate |
| `ContributesToEvent` | Any → Any | An element contributes to an FTA event |
| `TriggersHazardousSituation` | Event → HazardousSituation | An FTA event triggers a hazardous situation |

#### Safety & Essential Performance

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `Preserves` | SafetyFunction → EssentialPerformance | A safety function preserves essential performance |
| `SupportsOperatingFunction` | EssentialPerformance → PrimaryOperatingFunction | EP supports the primary operating function |
| `DefinesLossCondition` | EssentialPerformance → EssentialPerformanceLossCondition | EP has a defined loss condition |
| `ProtectsEssentialPerformance` | RiskControl → EssentialPerformance | A control protects essential performance |

#### Usability (IEC 62366)

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `AddressesUseError` | UserInterfaceRequirement → UseError | A UI requirement addresses a use error |
| `AnalyzesUseError` | UseErrorAnalysis → UseError | An analysis examines a use error |
| `ExposesUseError` | OperationalScenario → UseError | A scenario exposes a potential use error |
| `SpecifiesScenario` | UseSpecification → OperationalScenario | A use specification specifies a scenario |
| `EvaluatesRequirement` | ValidationCase → UserInterfaceRequirement | A validation case evaluates a UI requirement |
| `ContributesToHazard` | UseError → Hazard | A use error contributes to a hazard |

#### Software Lifecycle (IEC 62304)

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `GovernsActivity` | SoftwareLifecycleProcess → SoftwareLifecycleActivity | A process governs its activities |
| `ProducesWorkProduct` | SoftwareLifecycleActivity → SoftwareWorkProduct | An activity produces a work product |

#### Clinical Evaluation

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `PlansClinicalEvaluation` | ClinicalEvaluationPlan → Any | A plan governs clinical evaluation of a subject |
| `EvaluatesClinicalClaim` | ClinicalEvaluationReport → ClinicalClaim | A report evaluates a clinical claim |
| `SupportsClinicalClaim` | ClinicalEvidenceArtifact → ClinicalClaim | Evidence supports a clinical claim |
| `ClaimsClinicalBenefit` | ClinicalClaim → ClinicalBenefit | A claim asserts a clinical benefit |
| `ClaimsForUse` | ClinicalClaim → Any | A claim is made for a specific intended use |

#### Cybersecurity

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `ModelsThreat` | ThreatModel → ThreatScenario | A threat model covers a threat scenario |
| `ThreatensAsset` | ThreatScenario → CyberAsset | A threat scenario targets an asset |
| `ExploitsVulnerability` | ThreatScenario → Vulnerability | A threat exploits a vulnerability |
| `MitigatesThreat` | SecurityControl → ThreatScenario | A security control mitigates a threat |
| `SecuresInterface` | SecurityControl → DataInterface | A security control protects an interface |
| `MaintainsSbom` | SBOMArtifact → Any | An SBOM is maintained for a subject |
| `SupportsSecureUpdate` | SecureUpdateCapability → Any | Secure update capability covers a subject |

#### Privacy

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `ClassifiesData` | PersonalDataCategory → Any | A data category classifies personal data |
| `ProcessesData` | DataProcessingActivity → Any | An activity processes data |
| `ProvidesPrivacyNotice` | Any → PrivacyNotice | A subject provides a privacy notice |
| `AssessesPrivacyImpact` | PrivacyImpactAssessment → Any | A DPIA assesses privacy impact |
| `RespondsToDataSubjectRequest` | DataSubjectRequest → Any | A request is responded to |

#### QMS & Compliance

| Relationship | Source → Target | Description |
|--------------|-----------------|-------------|
| `Evidences` | ComplianceEvidence → Any | Evidence supports a compliance subject |
| `Documents` | QMSRecord → Any | A QMS record documents a subject |

---

## `@memo/ontology-clinical` {#ontology-clinical}

**Opt-in.** Niche anatomical and pharma-specific concepts for surgical devices, drug-delivery systems, and anatomy-specific modeling. Most infusion pump, monitor, or diagnostic device projects do not need this package.

*File: `clinical/clinical-niche.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `AnatomicalSite` | `part def` | A specific anatomical location (e.g. vein, tissue, organ) |
| `ProcedureMethod` | `part def` | A clinical procedure method (e.g. laparoscopic, open) |
| `RouteOfAdministration` | `part def` | Drug delivery route (IV, IM, SC, oral, etc.) |
| `ClinicalObservation` | `part def` | A clinical observation or measurement |
| `MorphologyState` | `part def` | A morphological condition of tissue or anatomy |
| `ClinicalEnvironmentQualifier` | `part def` | A qualifier for the clinical environment (e.g. ICU, OR) |
| `ClinicalInvestigationReference` | `part def` | A reference to a clinical investigation study |
| `ClinicalLiteratureReference` | `part def` | A reference to clinical literature |

---

## `@memo/ontology-clinical-interop` {#ontology-clinical-interop}

**Opt-in.** Clinical terminology interoperability definitions for connected devices that integrate with hospital information systems (HIS/EHR) using SNOMED CT, LOINC, HL7, or FHIR.

*File: `interop/terminology.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `ClinicalCodeSystemReference` | `part def` | A reference to a clinical code system (SNOMED CT, LOINC, ICD-10) |
| `ClinicalValueSetReference` | `part def` | A reference to a value set within a code system |
| `ClinicalConceptMapReference` | `part def` | A mapping between two code systems |
| `TerminologyBinding` | `part def` | A binding of a model element to a clinical terminology concept |

---

## `@memo/medical-product-line-profile` {#medical-product-line-profile}

**Opt-in.** Product-line engineering concepts for manufacturers with device families, variant configurations, and accessory ecosystems.

*File: `product-line/product-line.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `ProductFamily` | `part def` | A family of related device variants |
| `ProductVariant` | `part def` | A specific product variant within a family |
| `FeatureOption` | `part def` | A selectable feature option in a variant |
| `Accessory` | `part def` | A device accessory or peripheral |
| `ConfigurationBaseline` | `part def` | A released configuration baseline for a variant |
| `VariantConstraint` | `requirement def` | A constraint restricting feature combinations |

---

## `@memo/ontology-platform-robotics` {#ontology-platform-robotics}

**Opt-in.** ROS (Robot Operating System) platform definitions for robotic surgical systems, rehabilitation robots, and autonomous medical devices.

*File: `platform/robotics.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `RosNode` | `part def` | A ROS node (computational graph node) |
| `RosTopic` | `interface def` | A ROS topic (pub/sub channel) |
| `RosService` | `interface def` | A ROS service (request/response) |
| `RosPublication` | `interface def` | A ROS topic publication endpoint |
| `RosSubscription` | `interface def` | A ROS topic subscription endpoint |
| `RosServiceCall` | `interface def` | A ROS service call endpoint |
| `RosServiceServer` | `interface def` | A ROS service server endpoint |
| `RosMessage` | `item def` | A ROS message |
| `RosEventMessage` | `item def :> RosMessage` | A ROS event message |
| `RosStateMessage` | `item def :> RosMessage` | A ROS state message |
| `RosCommandMessage` | `item def :> RosMessage` | A ROS command message |
| `RosRequest` | `item def :> RosMessage` | A ROS service request |
| `RosResponse` | `item def :> RosMessage` | A ROS service response |
| `RosMessageSchema` | `part def` | The schema definition of a ROS message type |
| `RosMessageField` | `part def` | A field in a ROS message schema |

---

## `@memo/ontology-platform-messaging` {#ontology-platform-messaging}

**Opt-in.** RabbitMQ messaging broker definitions for event-driven device architectures that integrate with hospital messaging infrastructure (AMQP).

*File: `platform/messaging.sysml`*

| Kind | Construct | Description |
|------|-----------|-------------|
| `RabbitMqBroker` | `part def :> MessageBroker` | A RabbitMQ broker instance |
| `RabbitMqExchange` | `interface def :> BrokerExchange` | A RabbitMQ exchange (direct, topic, fanout, headers) |
| `RabbitMqQueue` | `interface def :> BrokerQueue` | A RabbitMQ queue |
| `RabbitMqPublisher` | `interface def :> MessageProducer` | A RabbitMQ publisher endpoint |
| `RabbitMqConsumer` | `interface def :> MessageConsumer` | A RabbitMQ consumer endpoint |

---

## `@memo/medical-modeling-profile` {#medical-modeling-profile}

The default modeling profile. Extends `@memo/ontology-medical` and provides:

- **Closure rules** (`memo.rules.yaml`) — defines which relationships are required or expected for each kind (e.g. every `Hazard` must have a `Mitigates` relationship)
- **Viewpoints** (`memo.viewpoints.yaml`) — defines which kinds appear in each diagram view (Risk View, Software Architecture View, Usability View, etc.)
- **Starter template** (`templates/infusion-pump/model.sysml`) — a complete infusion pump model demonstrating all architecture layers

> The profile adds no new type definitions. It configures how existing types are used and validated.

---

## Summary Statistics

| Package | Kinds | Relationships |
|---------|-------|---------------|
| `@memo/ontology-core` | 103 | 44 |
| `@memo/ontology-medical` | 99 | 58 |
| `@memo/ontology-clinical` | 8 | — |
| `@memo/ontology-clinical-interop` | 4 | — |
| `@memo/medical-product-line-profile` | 6 | — |
| `@memo/ontology-platform-robotics` | 15 | — |
| `@memo/ontology-platform-messaging` | 5 | — |
| **Total** | **240** | **102** |
