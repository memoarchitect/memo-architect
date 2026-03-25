# Roadmap

## Architecture Vision

MEMO follows the **ISO/IEC/IEEE 42010** architecture description standard and draws from the **Arcadia/Capella** MBSE methodology. The tool is designed for **medical device development** with a layered ontology strategy:

- **`@memo/ontology-core`** — domain-agnostic MBSE backbone aligned to ISO/IEC/IEEE 42010
- **`@memo/ontology-medical`** — reusable medical device development backbone built on top of core

The medical backbone is intended to support traceable development against **ISO 13485**, **ISO 14971**, **IEC 62304**, and **IEC 60601-1**, with product-family ontologies extending it further.

**Core principle:** Viewpoint → View → Model. Views (diagrams) are organized under viewpoints, not as separate application modes. The app uses a unified canvas that renders any view type (BDD, IBD, ACT, AFD, REQ, etc.) based on selection.

**Target UI Architecture:**
- **Left Panel:** Model Explorer (elements by kind/layer) + View Explorer (views under viewpoints)
- **Center:** Unified Canvas (renders selected view)
- **Right Panel:** Properties Panel (element or view properties)
- **Toolbar:** Analysis Tools (DSM, Consistency, FMEA) + Create View button

**Reference documents:**
- `/Users/someshkashyap/Downloads/System Architecture Document-wip.pdf` — ISO 42010 template
- `/Users/someshkashyap/Downloads/System Architecture Overview.pdf` — Viewpoint/view examples
- `/Users/someshkashyap/EA/NewMDG/AfferaMDG.qea` — Sparx EA MDG profile (78 stereotypes)

---

## Completed

### Phase 1 — Foundation

- [x] Langium SysML v2 subset parser grammar
- [x] Ontology with 60+ entity types and a layered relationship vocabulary
- [x] Ontology viewer (standalone HTML)
- [x] Medical domain config evolved into layered ontology + modeling-profile split (`@memo/ontology-medical` + `@memo/medical-modeling-profile`, 109 rules, 11 viewpoints)
- [x] Semantic model layer (`MemoModel`, `MemoModelDTO`)
- [x] Model builder (AST to semantic model)
- [x] Parser utilities
- [x] Configuration system with YAML loading and `extends` inheritance
- [x] 5 Architecture Decision Records (ADRs)

### Phase 2 — CLI & Web App

- [x] Closure rule validation engine (`evaluateClosureRules`)
- [x] Completeness tracking per CoSMA layer
- [x] WebSocket protocol for live updates
- [x] `memo validate` command with formatted output
- [x] `memo dev` command with HTTP + WebSocket server
- [x] `memo init` command for project scaffolding
- [x] File watcher (Chokidar) with debounced rebuild
- [x] React 18 web app with Vite 6
- [x] Interactive diagram (ReactFlow + ELK.js layout)
- [x] Sidebar with searchable model explorer
- [x] Completeness bar visualization
- [x] Gap bar (violation display)
- [x] Viewpoint filtering (end-to-end: config → CLI → WebSocket → diagram)
- [x] Config resolver for package-based `extends` chains
- [x] 69 tests passing (60 core + 9 CLI E2E)

### Phase 3 — Modular Ontology & Multi-Mode Web App

- [x] **Modular ontology architecture** — layered `@memo/ontology-core` + `@memo/ontology-medical` with `@memo/medical-modeling-profile` on top
- [x] **Ontology metadata** — `OntologyMetadata` type with id, version, description, author, license, tags
- [x] **Config merge deduplication** — `dedup()` for cosmaLayers, relationshipTypes, closureRules
- [x] **External ontology types** — `ExternalOntologyRef` and `LibraryRef` type definitions
- [x] **4-mode web app** — Mode switcher with Catalog, Diagram, Scenarios, Ontology tabs
- [x] **Catalog Explorer** — Tree browser with layer/kind/file grouping
- [x] **Diagramming mode** — Viewpoint-first sidebar, ELK.js diagram canvas, properties panel
- [x] **Scenario Catalog** — Filters Scenario/UseCase/UserActivity elements
- [x] **Ontology Viewer** — Tree View + Graph View with grouping
- [x] **OWL/RDF export** — `exportToOwlTurtle()` and `exportToOwlXml()`
- [x] **Ontology CLI commands** — `memo ontology show`, `memo ontology export owl/xml`
- [x] **Properties panel** — Shared across modes with element attributes, relationships, violations

### Phase 4A — CSV Import/Export & SysML Generation

- [x] **CSV import/export** — Ontology-aware parsing with kind validation, construct auto-derivation
- [x] **SysML generator** — Generate valid SysML v2 files from imported CSV
- [x] **CSV CLI commands** — `memo import csv`, `memo import csv-rel`, `memo import template`
- [x] **22 tests** for CSV roundtrip, validation, edge cases, SysML generation

### Phase 4B — First-Class Diagram System

- [x] **DiagramType & DiagramDefinition** types in core config
- [x] **DiagramDTO** in semantic model transport layer
- [x] **Diagram CRUD protocol** — Create/Update/Delete messages over WebSocket
- [x] **Config-driven diagrams** — Viewpoints declare `supportedDiagramTypes` and `diagrams` arrays
- [x] **Auto-generated diagrams** — Model Viewpoint auto-generates Context + Decomposition BDDs
- [x] **SysML v2 diagram types** — BDD, IBD, REQ, UCD, ACT, PKG, PAR, RISK with color badges
- [x] **ViewpointBrowser rewrite** — Diagrams rendered from model DTO, type badges, auto indicators

### Phase 4C — Documentation

- [x] **Medical Device Quick Start Tutorial** — End-to-end guide: setup → CSV import → traceability → validation → CI

### Phase 4D — UI Polish

- [x] **Git user identity in status bar** — GapBar shows git user.name / user.email + branch
- [x] **Vertical completeness bar** — Collapsible compact tab
- [x] **Branding** — MEMO chat-bubble logo, favicon, brain watermark
- [x] **Decomposition/containment diagram modes** — BDD + IBD auto-generated diagrams
- [x] **Collapsible left sidebar** — Toggle sidebar with vertical label
- [x] **Comments/discussion panel** — Element-level annotations with git user attribution

### Phase 4 — Multi-File SysML & Cross-File Resolution

- [x] **Cross-file import resolution** — PackageRegistry, two-pass builder, deferred connections
- [x] **SysML v2 `library` keyword** — Grammar supports `library package`
- [x] **Wildcard and named imports** — `::*` and `::SpecificType` syntax
- [x] **Multi-file model splitting** — Convention with example split files, 100 passing tests

### Phase 5 — Behavior Viewpoint (SysML v2 Actions & Flows)

- [x] **Phase 5a: Behavior grammar** — `action def`, `item def`, `flow`, `succession`, `allocate`; 30 tests
- [x] **Phase 5b: Action Flow Diagram** — ELK.js swimlane layout, flow/succession edges, ActionFlowNode
- [x] **Phase 5c: Viewpoint integration** — Action Flow mode, behavior-view viewpoint, PropertiesPanel
- [x] **Phase 5d: Behavior validation** — BV-001/002/003 rules, `validateModel()` composer; 6 tests
- [x] **Example models** — Infusion pump behavior, irrigation pump with parallel branches

### Phase 5e — UI Polish & Viewpoint Restructuring

- [x] **Design system tokens** — `styles/tokens.ts` with SHADOW, RADIUS, FONT, EDGE, TRANSITION
- [x] **Viewpoint config restructuring** — ISO 42010 viewpoints: context/functional/logical/interface
- [x] **Node polish** — Drop shadows, hover lift, smooth transitions
- [x] **Medical domain viewpoints** — Safety Analysis, Physical Containment, Model Viewpoint

### Phase 6a — Functional Breakdown Structure (FBS)

- [x] **`decomposedBy` relationship type** — Function decomposition in ontology config
- [x] **FBS tree diagram** — `buildFunctionalTree()` + `computeFBSLayout()` with ELK MRTree
- [x] **FBS diagram integration** — `diag-fbs-tree` auto-diagram in functional-view

### Phase 6b — DSM Analysis

- [x] **DSM matrix computation** — `computeDSM()` N×N matrix with kind/relationship filters
- [x] **Clustering algorithm** — Union-find connected component detection
- [x] **Interactive DSM view** — Color-coded matrix, hover tooltips, allocation overlay
- [x] **9 DSM tests**

### Phase 6c — Functional-Logical Consistency + Visual Polish

- [x] **Consistency analysis** — Unallocated functions, cross-component flows, interface needs
- [x] **Consistency panel in DSM view** — Clickable issue list with severity badges
- [x] **Bezier edges** — All edge types except succession (stays smoothstep for temporal ordering)
- [x] **FONT tokens** — Applied across PropertiesPanel, ViewpointBrowser, DiagramCanvas, ActionFlowDiagram
- [x] **CSS transitions** — Edge hover, node transitions

---

## In Progress / Next Up

### Current Phase — Ontology Backbone Restructuring **[CRITICAL]**

Refactor the ontology roadmap so MEMO has a clean base ontology plus a standards-driven medical device backbone:

- [x] **Define `@memo/ontology-core` boundary** — documented in ADR-1-6 and ontology design doc
- [x] **Define `@memo/ontology-medical` boundary** — documented in ADR-1-6 and ontology design doc
- [x] **Classify current ontology content** — documented in ADR-1-6 with core / medical / extension buckets
- [x] **Remove core contamination** — clean backbone responsibilities now live in `@memo/ontology-core` and `@memo/ontology-medical`; the legacy `@memo/ontology` package is explicitly marked as compatibility-only, and ROS-specific references were removed from its generic interface viewpoint
- [x] **Add missing P0 method concepts** — legacy `@memo/ontology` now includes first-cut operational concepts, requirement/specification containers, analysis abstractions, and normalized SysML relationship definitions
- [x] **Keep rules/views separate** — `@memo/medical-modeling-profile` now extends `@memo/ontology-medical` and carries profile rules/viewpoints/templates, with only transitional compatibility kinds left outside the ontology packages

### Next Milestone — `@memo/ontology-core` **[CRITICAL]**

- [x] **Core ontology package split** — first `@memo/ontology-core` workspace package added with standalone config, SysML package, and OWL export entrypoints
- [x] **Operational layer** — first cut added with mission, operational actor/entity, operational activity/scenario, and mission phase concepts
- [x] **Requirements stratification** — first cut added with stakeholder need, system requirement, functional/technical/interface requirement concepts
- [x] **Relationship normalization** — first cut added with `refines`, `derives`, `constrains`, `decomposedBy`, `flow`, and `succession` in SysML and YAML
- [x] **Analysis + verification abstractions** — first cut added with analysis case, constraint, calculation, assumption, measure, parameter, verification case, validation case, and evidence

### Next Milestone — `@memo/ontology-medical` **[CRITICAL]**

- [x] **Medical backbone package** — first `@memo/ontology-medical` workspace package added on top of the core split
- [x] **Design control artifacts** — first cut added with intended use, indications for use, user profile, use environment, design inputs/outputs, and design review concepts
- [x] **Risk management backbone** — first cut added with hazard, hazardous situation, harm, risk, risk control, and benefit-risk assessment concepts
- [x] **Software lifecycle backbone** — first cut added with software system, software item, software unit, SOUP item, anomaly, maintenance release, and software safety class
- [x] **Safety + essential performance backbone** — first cut added with safety goal, essential performance, basic safety, safety function, and protective measure concepts
- [x] **QMS trace backbone** — first cut added with QMS record, design history record, change record, release baseline, compliance evidence, and supporting relationships

### Next Milestone — Ontology Migration **[HIGH]**

- [x] **Default medical entrypoints** — `memo init`, starter template imports, medical guides, and example configs now point at `@memo/ontology-medical` / `MEMO_Ontology_Medical`
- [x] **Move common medical-development kinds into ontology** — `UserNeed`, `SoftwareRequirement`, `HardwareRequirement`, `OtherRequirement`, `UserActivity`, `Component`, and `EnvironmentElement` now live in `@memo/ontology-medical` instead of only `@memo/medical-modeling-profile`
- [x] **Move generic platform kinds into core** — `Microcontroller`, `FPGA`, and `SingleBoardComputer` now live in `@memo/ontology-core` instead of only `@memo/medical-modeling-profile`
- [x] **Move reusable compliance and rationale kinds into ontology** — `Standard` and `RegulatoryRequirement` now live in `@memo/ontology-medical`, and `Question` now lives in `@memo/ontology-core`
- [x] **Remove remaining transitional duplicates from `@memo/medical-modeling-profile`** — reusable UI/platform realization kinds and medical software defaults now live in the ontology layer, leaving the modeling profile package focused on rules, viewpoints, and templates
- [x] **Migrate examples off compatibility-only kinds** — starter/example models now use the layered backbone vocabulary, with `UserNeed` retained as the preferred medical-facing specialization on top of core `StakeholderNeed`

### Next Milestone — Standards Hardening **[CRITICAL]**

- [x] **Apollo-aligned core scaffolding** — added `Program`, `Context`, `Operation`, `MissionRequirement`, `Specification` containers, `MissionFunction`, and richer analysis result/trade study primitives to `@memo/ontology-core`
- [x] **Verification semantics widened** — `Verify` now supports broader medical verification subjects instead of only generic requirements
- [x] **IEC 62304 lifecycle hardening** — added development plan, architecture, detailed design, SOUP evaluation, problem report, and change impact concepts to `@memo/ontology-medical`
- [x] **IEC 60601 usability/safety hardening** — added user interface requirement, use error, hazard-related use scenario, usability specification/validation, and primary operating function concepts
- [x] **Medical modeling-profile rules/viewpoints extended** — added 60601/62304 closure rules and a dedicated usability engineering viewpoint

### Next Milestone — Compatibility Retirement + Standards Traceability **[HIGH]**

- [x] **Migrate active entrypoints to the layered stack** — examples, starter templates, CLI defaults, and docs now point at `@memo/ontology-medical` / `MEMO_Ontology_Medical`
- [x] **Retire the legacy compatibility package** — `packages/ontology` was removed after repo-wide migration off `@memo/ontology`
- [x] **Exercise new standards concepts in live models** — infusion-pump example and starter template now instantiate IEC 60601 usability, essential performance, IEC 62304 lifecycle, and QMS trace artifacts
- [x] **Complete example trace chains** — the split infusion-pump example now includes a compliance package linking user interface requirements, use errors, risk controls, software items, records, evidence, and release artifacts
- [x] **Promote product UI into the medical ontology** — `UIElement`, `UIScreen`, `UIPanel`, and `UIFunction` now live in `@memo/ontology-medical` and inherit from shared software/function concepts so requirements and risk can trace to them directly

### Next Ontology Milestone — Legacy Compatibility Decision **[HIGH]**

Choose the final fate of the legacy `@memo/ontology` package instead of letting it drift indefinitely:

- [x] **Audit remaining compatibility-only content** — confirmed the remaining legacy-only surface is the `MEMO_Ontology` namespace, compatibility viewpoints, a few legacy helper kinds (`Responsibility`, `LogicalComponentExternal`, `ActionDefinition`, `ActionUsage`, `ItemDefinition`), and the product-specific leftover `Catheter`
- [x] **Decide and execute retirement path** — the temporary shim policy was superseded by full repo migration, and `@memo/ontology` has now been removed
- [x] **Isolate legacy-only domain content** — `Catheter` is explicitly treated as legacy-only until a future product-family ontology promotes it deliberately
- [x] **Document deprecation path** — active docs now state that new work targets `MEMO_Ontology_Medical` / `@memo/ontology-medical`, and legacy `MEMO_Ontology` imports are no longer part of the supported repo surface

Exit criteria:
- active repo surfaces use `@memo/ontology-core` and `@memo/ontology-medical`
- the legacy compatibility package no longer exists in the workspace

### Next Ontology Milestone — Second-Pass Medical Semantics **[CRITICAL]**

Deepen the medical ontology beyond the first-cut backbone so it is methodologically stronger for regulated development:

- [x] **IEC 62366 usability engineering enrichment** — added `UseSpecification`, `UseErrorAnalysis`, `FormativeEvaluation`, and `SummativeEvaluation`, with explicit analysis/evaluation/evidence relationships in `@memo/ontology-medical`
- [x] **IEC 60601 safety structure enrichment** — added collateral/particular-standard applicability, essential-performance loss conditions, and stronger essential-performance / risk-control trace semantics
- [x] **IEC 62304 lifecycle enrichment** — added lifecycle process/activity/work-product concepts and exercised them in the infusion-pump example and starter template
- [x] **Tighten relationship semantics** — replaced generic `traceTo` links with `derives`, `refines`, `satisfy`, and new medical relations where the domain meaning is stable

Exit criteria:
- [x] `@memo/ontology-medical` covers a stronger second-pass 62366/60601/62304 backbone
- [x] at least one live example uses the new concepts

### Next Ontology Milestone — Rule-Pack Expansion **[HIGH]**

Bring the workbench validation layer up to the level of the newer ontology concepts:

- [x] **Add rules for newer medical ontology concepts** — added usability, essential-performance, lifecycle, and QMS/evidence rules on top of the second-pass medical semantics
- [x] **Add stricter traceability checks** — `@memo/core` closure rules now support direction- and kind-aware relationship checks, and the medical rule pack uses them to enforce more precise chains
- [x] **Align viewpoints with the richer ontology** — expanded the existing medical viewpoints so lifecycle, QMS, usability, and essential-performance artifacts are visible in the appropriate review contexts
- [x] **Update validation docs/examples** — refreshed validation docs, tutorial output, and config references to the expanded rule pack

Exit criteria:
- [x] `@memo/medical-modeling-profile` validates the newer ontology concepts, not just the original subset
- [x] docs and examples show the intended rule coverage

### Next Ontology Milestone — Additional Reference Models **[HIGH]**

Prove the ontology against more than a single infusion-pump reference:

- [x] **Add a second medical reference model** — `examples/irrigation-pump` is now a surgical irrigation console reference model built on the shared medical backbone
- [x] **Exercise different ontology slices** — the irrigation model stresses disposable setup, pressure regulation, depletion alarming, and a different software/physical partition than infusion pump
- [x] **Compare rule behavior across examples** — infusion pump and irrigation pump both validate against the same 97-rule medical pack, exposing only the pre-existing infusion behavior warnings
- [x] **Use findings to refine ontology boundaries** — the second example validated the existing `@memo/ontology-medical` concepts without adding new device-specific ontology primitives

Exit criteria:
- [x] at least two strong reference models validate on the shared backbone
- [x] ontology changes are driven by cross-example evidence rather than a single product

### Next Ontology Milestone — Structured Risk Analysis Semantics **[CRITICAL]**

Promote FTA / FMEA / deeper ISO 14971 analysis structure into the medical ontology backbone instead of treating it as UI-only tooling:

- [x] **Add FMEA ontology concepts** — added first-class medical failure-analysis concepts such as `FailureMode`, `FailureCause`, `FailureEffect`, `DetectionControl`, and `FailureModesAndEffectsAnalysis` in `@memo/ontology-medical`
- [x] **Add fault-tree ontology concepts** — added explicit fault-tree semantics such as `TopEvent`, `IntermediateEvent`, `BasicEvent`, `FaultTreeGate`, and typed propagation/gate relationships
- [x] **Tie analysis semantics into the existing risk backbone** — connected FMEA / FTA artifacts to `Hazard`, `HazardousSituation`, and `RiskControl` through `escalatesToRisk`, `triggersHazardousSituation`, `detectsFailureMode`, and existing mitigation/verification traces
- [x] **Exercise the new semantics in live medical examples** — extended `examples/irrigation-pump` with failure analysis and fault propagation on the shared medical backbone
- [x] **Add workbench validation on top of the ontology** — extended `@memo/medical-modeling-profile` with FMEA / FTA closure rules and a dedicated risk-analysis viewpoint without collapsing ontology and tooling concerns

Exit criteria:
- [x] `@memo/ontology-medical` contains first-class FTA / FMEA / structured risk-analysis semantics
- [x] risk-analysis traces connect directly into the existing medical risk-management ontology
- [x] at least one reference model exercises the new concepts end to end

### Next Ontology Milestone — Clinical Context Enrichment **[HIGH]**

Continue the paper-driven ontology enrichment by pulling more of the clinical and procedural context into the backbone:

- [x] **Add patient / subject ontology semantics** — added `Patient`, `AnatomicalSite`, and richer recipient-of-procedure traces to `@memo/ontology-medical`
- [x] **Deepen procedure semantics** — added `ProcedureMethod`, `RouteOfAdministration`, `ClinicalStep`, and `TreatmentPathway` semantics on top of the new core `Procedure` structure
- [x] **Enrich clinical environment modeling** — added `ClinicalEnvironmentQualifier` plus explicit sterile/context/resource modeling on top of the core procedure-context relations
- [x] **Add observable / outcome context** — added `ClinicalObservation` and `MorphologyState` semantics so procedures can produce observations and act on clinically meaningful states
- [x] **Evaluate terminology import boundaries** — docs now state that MEMO keeps lightweight local anchor concepts while deeper SNOMED-style taxonomies remain future external-import work
- [x] **Exercise the richer clinical context in examples and viewpoints** — extended the irrigation and infusion reference models and the medical usability view so the new patient/context concepts are exercised in live models

Exit criteria:
- [x] `@memo/ontology-medical` covers patient/subject, anatomy, procedure-context, and observation semantics needed for early medical-device design reasoning
- [x] at least one reference model uses the enriched clinical context end to end
- [x] roadmap direction is explicit about what should be modeled locally versus imported from external clinical ontologies

### Next Ontology Milestone — Risk Governance & Post-Market Semantics **[HIGH]**

Continue refining the medical risk backbone so it covers residual-risk acceptance, benefit-risk rationale, and production/post-production feedback:

- [x] **Add residual-risk and benefit semantics** — added `ClinicalBenefit`, `ResidualRiskEvaluation`, `OverallResidualRiskEvaluation`, and richer `BenefitRiskAssessment` semantics to `@memo/ontology-medical`
- [x] **Add risk-governance record semantics** — added `RiskManagementPlan` and `RiskManagementReport` as first-class ontology artifacts tied to the medical risk backbone
- [x] **Add production/post-production signal semantics** — added `ProductionPostProductionSignal` plus typed monitoring relations back into hazards, harms, risks, and controls
- [x] **Tie governance semantics into live examples and views** — the irrigation reference model now exercises plan/report/residual-risk/post-market traces, and the medical risk viewpoints surface them
- [x] **Add workbench validation on top of the ontology** — `@memo/medical-modeling-profile` now validates risk-governance and post-market artifacts with dedicated closure rules

Exit criteria:
- [x] `@memo/ontology-medical` covers residual risk, benefit-risk, and post-market anchors needed for ISO 14971 / ISO 13485 reasoning
- [x] at least one reference model exercises the new semantics end to end

### Next Ontology Milestone — Cybersecurity, Systems Integration, and Terminology Boundary **[CRITICAL]**

Refine the ontology so connected medical cyber devices and interoperable system-of-systems contexts can be modeled without collapsing into product-specific ad hoc traces:

- [x] **Add system-of-systems and interface semantics to the core backbone** — added `SystemOfSystems`, `DataInterface`, `DataEndpoint`, `CommunicationProtocol`, `InteroperabilityProfile`, and typed integration relationships in `@memo/ontology-core`
- [x] **Add FDA/IEC-aligned medical cybersecurity semantics** — added `CybersecurityRequirement`, `ThreatModel`, `ThreatScenario`, `Vulnerability`, `SecurityControl`, `SBOMArtifact`, and `SecureUpdateCapability` in `@memo/ontology-medical`
- [x] **Add terminology-boundary anchor semantics** — added `ClinicalCodeSystemReference`, `ClinicalValueSetReference`, `ClinicalConceptMapReference`, and `TerminologyBinding` so models can reference external terminology intent and versioning without embedding full imported hierarchies
- [x] **Exercise the new semantics in live examples** — the irrigation reference model now includes hospital-system integration surfaces, cyber threat/control traces, SBOM/update artifacts, and terminology bindings
- [x] **Add workbench validation and viewpoints on top of the ontology** — `@memo/medical-modeling-profile` now validates cybersecurity and terminology-binding artifacts and includes a dedicated cybersecurity/interoperability viewpoint

Exit criteria:
- [x] `@memo/ontology-core` supports reusable system-of-systems and data-interface modeling
- [x] `@memo/ontology-medical` supports medical cybersecurity and external-clinical-terminology anchor semantics
- [x] at least one reference model exercises the new semantics end to end

### Next Ontology Milestone — Clinical Evidence, Lifecycle Operations, and Product Configuration **[HIGH]**

Refine the medical backbone so clinical claims, product realization lifecycle operations, and regulated product-family configuration no longer depend on generic documentation traces:

- [x] **Add clinical evidence and claims semantics** — added `ClinicalPerformanceClaim`, `ClinicalSafetyClaim`, `ClinicalEvidenceArtifact`, `ClinicalEvaluationPlan`, and `ClinicalEvaluationReport` plus typed claim/evidence/use relations in `@memo/ontology-medical`
- [x] **Add manufacturing, installation, servicing, and calibration semantics** — added first-class lifecycle procedures and governed records for manufacturing, installation qualification, preventive maintenance, and calibration
- [x] **Add reusable regulated product-configuration semantics** — added `ProductFamily`, `ProductVariant`, `FeatureOption`, `Accessory`, `ConfigurationBaseline`, and `VariantConstraint` so product-line reasoning stays typed and auditable
- [x] **Exercise the new semantics in live examples** — the irrigation reference model now traces clinical claims to evidence, lifecycle operations to serviced subjects, and product variants to features/accessories/baselines
- [x] **Audit the ontology against MEMO's SysML v2 subset** — ontology packages now stay within the supported textual subset, docs use `:>` specialization consistently, and roadmap wording no longer claims full-language coverage

Exit criteria:
- [x] `@memo/ontology-medical` supports clinical-evaluation / evidence / claims semantics on the regulated backbone
- [x] `@memo/ontology-medical` supports manufacturing / installation / service / calibration semantics on the regulated backbone
- [x] `@memo/ontology-medical` supports reusable regulated product-family / configuration semantics without falling back to generic trace links
- [x] ontology files validate cleanly inside MEMO's supported SysML v2 subset

### Next Ontology Milestone — Data Modeling, Event-Driven Services, and Technology Specializations **[HIGH]**

Refine the ontology so message-oriented software integration can be modeled with typed semantics instead of generic interfaces and trace links:

- [x] **Add reusable data-modeling semantics to the core backbone** — added publish/subscribe channels, request/response interfaces, message types, schemas, fields, broker routing, and typed messaging relationships in `@memo/ontology-core`
- [x] **Add event-driven microservice and broker backbone semantics** — added `EventDrivenService`, `MessageBroker`, `EventBus`, `TopicChannel`, `QueueChannel`, `MessageProducer`, `MessageConsumer`, `BrokerExchange`, and `BrokerQueue` in `@memo/ontology-core`
- [x] **Add reusable technology specializations on top of the backbone** — added ROS and RabbitMQ specializations in `@memo/ontology-core` instead of the medical layer so those concepts remain cross-domain
- [x] **Add workbench validation and viewpoint support** — `@memo/medical-modeling-profile` now validates ROS-style topic/service/message structures and includes a dedicated data-messaging viewpoint over the shared event-driven backbone
- [x] **Exercise the new semantics in live reference models** — the infusion-pump reference model now includes both ROS-style messaging and a RabbitMQ-backed brokered alarm relay slice

Exit criteria:
- [x] `@memo/ontology-core` supports reusable message/data-model semantics plus event-driven microservice and broker semantics
- [x] ROS and RabbitMQ specializations build on top of that backbone without being modeled as medical-only ontology concepts
- [x] at least one reference model exercises publishers, subscribers, brokered routing, services, messages, and schemas end to end

### Next Ontology Milestone — Privacy, Data Governance, and External Ontology Import Boundary **[CRITICAL]**

Refine the medical backbone so connected-device data governance can be modeled explicitly, including HIPAA/GDPR-driven privacy concerns and governed boundaries around imported clinical terminology:

- [x] **Add privacy and data-governance semantics to the medical backbone** — added `PersonalDataCategory`, `SpecialCategoryPersonalData`, `ProtectedHealthInformation`, `DataProcessingActivity`, controller/processor roles, consent/notice/retention/minimum-necessary policies, de-identification, pseudonymization, privacy-impact assessment, and data-subject-request anchors to `@memo/ontology-medical`
- [x] **Ground the privacy semantics in HIPAA/GDPR-relevant modeling concerns** — the ontology now distinguishes HIPAA-style permission bases, GDPR-style lawful bases, controller/processor roles, minimum-necessary handling, privacy-by-design assessment, retention, and data-subject request handling without trying to encode legal advice in the ontology itself
- [x] **Deepen the external ontology import boundary** — added `TerminologyImportBoundary`, `ImportedTerminologySubset`, `ImportedConceptBinding`, and `ImportProvenanceRecord` so models can represent governed import scope, local-to-external binding, and provenance without embedding full imported hierarchies
- [x] **Exercise the new semantics in live examples** — the irrigation reference model now classifies perioperative exchange payloads as PHI/personal data, governs connected processing activities, models optional consent-governed secondary analytics, and records terminology subset/provenance boundaries
- [x] **Add workbench validation and viewpoint support** — `@memo/medical-modeling-profile` now validates privacy/governance and import-boundary artifacts and includes a dedicated privacy/import viewpoint

Exit criteria:
- [x] `@memo/ontology-medical` supports privacy/data-governance semantics needed for connected medical-device modeling
- [x] `@memo/ontology-medical` supports deeper terminology import-boundary semantics without collapsing into full ontology import tooling
- [x] at least one reference model exercises PHI/personal-data classification, governed processing, retention/notice/assessment, and terminology subset/provenance semantics end to end

## Adoption Strategy

MEMO has a strong foundation: differentiated wedge in regulated medical-device architecture, serious standards-aware ontology, practical CLI workflows, and reference models that make it more than a diagram toy. But it is **not yet ready for broad adoption** by startups and mid-size medical device companies.

**Four adoption blockers (in priority order):**

1. **UI cohesion** — The app is 6-mode (`catalog`, `diagram`, `actionflow`, `dsm`, `scenario`, `ontology`) while the architecture says view-centric ISO 42010. Users see tabs, not a unified workbench.
2. **Compliance outputs** — For real startup use, doc generation, CI outputs, trace matrices, and review artifacts matter at least as much as modeling.
3. **Package ecosystem** — Users need reusable packages, profiles, and extension flows. The package story is emerging but incomplete.
4. **Contributor ergonomics** — Broad open-source adoption requires a stable extension model, package semantics, and easier contribution paths.

**Priority sequence for reaching adoption:**

1. Become the **easiest serious tool** for medical-device architecture review and traceability
2. Become the **easiest tool to generate** useful compliance documentation and evidence artifacts
3. Become the **easiest tool to extend** with reusable medical and technical packages
4. Only after that, deepen ecosystem and advanced imports

**The adoption test:** A 15–100 person medical device company can model architecture and traceability in SysML, run validation in CI, generate review-ready outputs, add domain packages (software lifecycle, usability, cybersecurity, EtherCAT, etc.), and adopt the tool without MBSE specialists full-time.

The rearchitecture (Phase 7–9 below) is foundational work that enables everything else. It is NOT the product — it makes the product possible.

---

## Milestone Roadmap

All milestones numbered in strict execution order. One authoritative sequence, no conflicting docs.

**Partially complete items (accounted for in milestone scoping):**
- SysAnd export (`memo ontology export sysand`) exists in `packages/cli/src/commands/ontology.ts` — M48 hardens it
- `library package` grammar and PackageRegistry exist — M59 builds on it
- OntologyViewer component exists in web app — M60 extracts it
- `medical-modeling-profile` has `projectType: device` instead of `profile` — M36 fixes it

### Phase 7: Package & Registry Foundation **[CRITICAL]**

The rearchitecture core. Eliminates ~2,900 lines of YAML duplication by making SysML v2 the single source of truth for kinds and relationships. See `docs/architecture/platform-strategy.md` for full architecture spec.

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M36 | Package semantics cleanup | **Done** | None | Fix `medical-modeling-profile` projectType (device→profile). Add `ontology`/`profile`/`library` type discriminator to package manifest. Create `memo.package.yaml` for all 3 ontology packages. Add `.project.json` SysAnd manifests. |
| M37 | Directory restructure — ontology-core | **Done** | M36 | Move `sysml/entities/*.sysml` → `sysml/<layer>/<file>.sysml` (Apollo-11 pattern). 11 layer directories. Update `index.sysml`. Delete `entities/`. |
| M38 | Directory restructure — ontology-medical | **Done** | M36 | Same as M37 for medical package. 14 entity files → layer directories. |
| M39 | KindRegistry — SysML-driven kind discovery | **Done** | M37, M38 | New `KindRegistry` class: walks `*Definition` AST nodes, derives layer from directory path via `resolveLayerFromPath()`, produces kind metadata matching old `config.kinds`. 19 new tests. |
| M40 | RelationshipRegistry — SysML-driven relationship discovery | **Done** | M39 | New `RelationshipRegistry` from `ConnectionDefinition` AST nodes. PascalCase→camelCase normalization. 19 new tests. |
| M41 | Dual-mode builder — registry + config fallback | **Done** | M39, M40 | Modify `buildMemoModel()` to accept optional registries. Registry takes precedence over `config.kinds` at `builder.ts:262`. Backward compatible — existing tests unchanged. 6 new tests. |
| M42 | Ontology loader — wire registries into CLI | **Done** | M41 | Pipeline: parse ontology SysML → populate registries → pass to builder. Wire into `memo dev` and `memo validate`. Integration test with infusion-pump example. 4 new tests. |

**Parallelization:** {M37, M38} after M36. M39 after both. M40 after M39. M41 after M40. M42 after M41.

### Phase 8: Config Decomposition **[CRITICAL]**

Decompose `memo.config.yaml` (~2,900 lines across 3 packages) into purpose-specific files. Remove kind and relationship duplication from YAML.

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M43 | Extract memo.rendering.yaml | **Done** | M42 | Extract `cosmaLayers` from config into `memo.rendering.yaml`. Use `layers` key (not `cosmaLayers`). Config-loader loads both old and new format, merges with dedup. 9 new tests. |
| M44 | Extract memo.rules.yaml | **Done** | M42 | Extract `closureRules` (109 rules) from `medical-modeling-profile/memo.config.yaml` into `memo.rules.yaml`. Config-loader loads both old and new format, merges with dedup. 8 new tests. |
| M45 | Remove config.kinds | **Done** | M42, M43 | Delete `kinds:` sections from all configs (~1,500 lines). Builder uses KindRegistry only. Make `kinds` optional in MEMOConfig. Update all builder tests. |
| M46 | Remove config.relationshipTypes | **Done** | M45 | Delete `relationshipTypes:` sections (~700 lines). Builder uses RelationshipRegistry only. |
| M47 | Delete legacy config | **Done** | M45, M46 | Remove `memo.config.yaml` from ontology packages entirely. Slim `MEMOConfig` type. Example projects use new format. Config-loader falls back to `memo.config.yaml` for user projects. |

**Parallelization:** {M43, M44} after M42. M45 after M43. M46 after M45. M47 after M46.

### Phase 9: Package Lifecycle & Interop **[HIGH]**

Make packages installable, lockable, and exportable. This is what turns the ontology from "code in a repo" into "a package ecosystem."

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M48 | Harden SysAnd export + round-trip validation | **Done** | M47 | Existing `memo ontology export sysand` works but predates config decomposition. Update to use registries + new config files. Add round-trip test: export → re-import → compare. |
| M49 | Ontology lock + change detection | **Done** | M47 | `memo.lock.yaml` created at project init. On `memo dev`/`memo validate`, compare current ontology ID with lock. If changed: full validation, clear error messages. No auto-migration. |
| M50 | memo init with ontology selection | **Done** | M49 | `memo init --ontology @memo/medical-modeling-profile`. Prompt for selection if interactive. Creates new-format config files + lock. |
| M51 | memo install — package resolution | **Done** | M50 | `memo install <git-url\|npm-pkg\|local-path>`. Installs to `memo_packages/` or `node_modules/`. Adds to `memo.package.yaml` dependencies. Resolution order: git subtree workspace → workspace → `memo_packages/` → `node_modules/`. |

**Parallelization:** M48 and M49 can run in parallel after M47. M50 after M49. M51 after M50.

### Phase 10: Unified Workbench UX **[CRITICAL]**

The #1 adoption blocker. Replace 6-mode tab system with ISO 42010-aligned view-centric architecture.

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M52 | Unified view architecture | Done | M47 | Replace `AppMode` 6-mode switcher in `App.tsx` with view-centric layout. Single canvas renders any view type (BDD, IBD, ACT, AFD, REQ). Remove separate ActionFlow, DSM, Scenario modes. |
| M53 | Model Explorer + View Explorer | Done | M52 | Left panel: Model Explorer (elements by kind/layer/package) + View Explorer (views under viewpoints in tree). Replaces Catalog mode and ViewpointBrowser. |
| M54 | Properties panel + inline editing | Done | M52 | Right panel: element properties, attributes, relationships, violations. Inline editing of attributes. |
| M55 | Tools panel + productivity | Done | M52 | DSM, Consistency, FMEA accessible from toolbar icon. Cmd+K search. Context menus on diagram nodes and browser rows. Breadcrumb navigation. |

**Parallelization:** {M53, M54, M55} after M52.

### Phase 11: Compliance & Productivity **[HIGH]**

The #2 adoption blocker. Generate review-ready compliance outputs.

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M56 | CI integration | Done | M47 | `memo validate --format junit` with exit codes. JSON output for CI dashboards. |
| M57 | Traceability matrix | Done | M52 | N×N matrix with presets (ISO 14971 risk→control, IEC 62304 req→test). Filterable by viewpoint. |
| M58 | DHF generator | Done | M52 | Design History File data generator + HTML renderer. `memo export dhf`. Web preview mode. |

**Parallelization:** M56 independent of M52 (pure CLI). {M57, M58} after M52.

### Phase 12: Extension Ecosystem **[MEDIUM]**

The #3 adoption blocker. Make it easy to create, share, and consume domain packages.

| ID | Title | Status | Dependencies | Scope |
|----|-------|--------|-------------|-------|
| M59 | Static build + reusable package authoring | **Done** | M47, M51 | `memo build` produces static HTML + data bundle. `.kpar` archive (`memo build --kpar`). Package templates, `memo create-package` (ontology/profile/library/device scaffolding). Builds on existing `library package` grammar/PackageRegistry. |
| M60 | Standalone ontology viewer | **Done** | M47 | Standalone Vite app at `tools/ontology-viewer/`. Read-only. Loads `memo export json` output via drag-and-drop. Kind tree grouped by layer/construct, detail view, card view, relationship types. Decoupled from @memo/web. |
| M61 | VS Code extension | Not started | M47 | LSP for `.sysml` files. Syntax highlighting, go-to-definition, diagnostics. |

### Deferred (no milestone IDs until dependencies clear)

| Item | Reason |
|------|--------|
| External ontology import (OWL/JSON-LD/SysAnd) | Import before package model is stable is premature |
| LLM integration (Q&A, generation, report drafting) | Nice-to-have, not adoption-critical |
| EA/Cameo import | Migration tools — after core adoption proven |
| Cloud + collaboration | Hosted deployment — after local tool is solid |
| Domain packages (automotive, aerospace) | After medical vertical proven |
| Plugin system | After extension model stable |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **View-centric, not mode-centric** | ISO 42010 organizes architecture as Viewpoint → View → Model. All diagram types are views under viewpoints, not separate app modes. |
| **DSM/FMEA are tools, not views** | Analysis tools (DSM, consistency, FMEA) are accessed from a toolbar, not as separate modes. They operate on the model and can be invoked from CLI too. |
| **Activity diagrams are views** | Action Flow Diagram is a view type (AFD) under behavior-view, not a top-level mode. |
| **Arcadia-aligned layers** | Operational Analysis → Functional Need → Logical Architecture → Physical Architecture, following Capella/Arcadia methodology. |
| **SysML v2 is single source of truth** | Kinds/relationships derived from SysML AST, not YAML catalogs. `KindRegistry`/`RelationshipRegistry` replace `config.kinds`/`config.relationshipTypes`. |
| **Directory = Layer (Apollo-11 pattern)** | `sysml/<layer>/<file>.sysml` determines architecture layer. No YAML needed to assign layers. |
| **Config decomposes into purpose-specific files** | `memo.package.yaml` (identity) + `memo.rendering.yaml` (visualization) + `memo.rules.yaml` (validation) replace monolithic `memo.config.yaml`. |
| **Ontology locked per project** | Selected at `memo init`, changing shows validation errors, no auto-migration. |
| **Two-repo split** | `memo-base` (ontology, Layer 2) and `memo-architect` (tool, Layer 3) evolve independently. Git subtree for local dev. |
| **Adoption before ecosystem** | Unified UX → compliance outputs → package ecosystem → advanced features. |

---

## Known Issues

| Issue | Priority | Notes |
|---|---|---|
| 6-mode architecture needs replacement | Critical | Current modes don't match ISO 42010. Phase 10 addresses this. |
| ~~`medical-modeling-profile` has `projectType: device`~~ | ~~High~~ | Fixed in M36. |
| ~2,900 lines YAML duplication | High | Kinds/rels duplicated in SysML + YAML. Phase 7-8 eliminates this. |
| Web bundle size (1.8 MB) | Low | Consider code splitting for ReactFlow/ELK |
| No web component tests | Medium | `@memo/web` has no test infrastructure yet |
| Small viewport layout overlap | Low | 3-panel layouts need min-width breakpoints |
