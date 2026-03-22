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

- [x] Langium SysML v2 parser with full grammar
- [x] Ontology with 60+ entity types and a layered relationship vocabulary
- [x] Ontology viewer (standalone HTML)
- [x] Medical domain config evolved into layered ontology + workbench split (`@memo/ontology-medical` + `@memo/medical`, 48 rules, 6 viewpoints)
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
- [x] Config resolver for `@memo/ontology` extends chain
- [x] 69 tests passing (60 core + 9 CLI E2E)

### Phase 3 — Modular Ontology & Multi-Mode Web App

- [x] **Modular ontology architecture** — Base `@memo/ontology` + `@memo/medical` extends
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
- [x] **Keep rules/views separate** — `@memo/medical` now extends `@memo/ontology-medical` and carries workbench rules/viewpoints/templates, with only transitional compatibility kinds left outside the ontology packages

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
- [x] **Move common medical-development kinds into ontology** — `UserNeed`, `SoftwareRequirement`, `HardwareRequirement`, `OtherRequirement`, `UserActivity`, `Component`, and `EnvironmentElement` now live in `@memo/ontology-medical` instead of only `@memo/medical`
- [x] **Move generic platform kinds into core** — `Microcontroller`, `FPGA`, and `SingleBoardComputer` now live in `@memo/ontology-core` instead of only `@memo/medical`
- [x] **Move reusable compliance and rationale kinds into ontology** — `Standard` and `RegulatoryRequirement` now live in `@memo/ontology-medical`, and `Question` now lives in `@memo/ontology-core`
- [x] **Remove remaining transitional duplicates from `@memo/medical`** — reusable UI/platform realization kinds and medical software defaults now live in the ontology layer, leaving the workbench package focused on rules, viewpoints, and templates
- [x] **Migrate examples off compatibility-only kinds** — starter/example models now use the layered backbone vocabulary, with `UserNeed` retained as the preferred medical-facing specialization on top of core `StakeholderNeed`

### Next Milestone — Standards Hardening **[CRITICAL]**

- [x] **Apollo-aligned core scaffolding** — added `Program`, `Context`, `Operation`, `MissionRequirement`, `Specification` containers, `MissionFunction`, and richer analysis result/trade study primitives to `@memo/ontology-core`
- [x] **Verification semantics widened** — `Verify` now supports broader medical verification subjects instead of only generic requirements
- [x] **IEC 62304 lifecycle hardening** — added development plan, architecture, detailed design, SOUP evaluation, problem report, and change impact concepts to `@memo/ontology-medical`
- [x] **IEC 60601 usability/safety hardening** — added user interface requirement, use error, hazard-related use scenario, usability specification/validation, and primary operating function concepts
- [x] **Medical workbench rules/viewpoints extended** — added 60601/62304 closure rules and a dedicated usability engineering viewpoint

### Next Milestone — Compatibility Retirement + Standards Traceability **[HIGH]**

- [x] **Layer legacy `@memo/ontology` on the medical backbone** — the compatibility package now explicitly extends `@memo/ontology-medical` instead of presenting itself as the primary ontology source
- [x] **Keep legacy `MEMO_Ontology` imports working** — compatibility package metadata and docs now describe the package as a shim rather than a clean backbone
- [x] **Exercise new standards concepts in live models** — infusion-pump example and starter template now instantiate IEC 60601 usability, essential performance, IEC 62304 lifecycle, and QMS trace artifacts
- [x] **Complete example trace chains** — the split infusion-pump example now includes a compliance package linking user interface requirements, use errors, risk controls, software items, records, evidence, and release artifacts
- [x] **Promote product UI into the medical ontology** — `UIElement`, `UIScreen`, `UIPanel`, and `UIFunction` now live in `@memo/ontology-medical` and inherit from shared software/function concepts so requirements and risk can trace to them directly

### Next Ontology Milestone — Legacy Compatibility Decision **[HIGH]**

Choose the final fate of the legacy `@memo/ontology` package instead of letting it drift indefinitely:

- [x] **Audit remaining compatibility-only content** — confirmed the remaining legacy-only surface is the `MEMO_Ontology` namespace, compatibility viewpoints, a few legacy helper kinds (`Responsibility`, `LogicalComponentExternal`, `ActionDefinition`, `ActionUsage`, `ItemDefinition`), and the product-specific leftover `Catheter`
- [x] **Decide shim policy** — `@memo/ontology` is now frozen as a supported compatibility shim, not an active ontology development target
- [x] **Isolate legacy-only domain content** — `Catheter` is explicitly treated as legacy-only until a future product-family ontology promotes it deliberately
- [x] **Document deprecation path** — ADR-1-7 and the ontology docs now state that new work targets `MEMO_Ontology_Medical` / `@memo/ontology-medical`, while `MEMO_Ontology` remains supported only for existing projects

Exit criteria:
- `@memo/ontology` has an explicit long-term policy
- no new ontology concepts are added there by default

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
- [x] `@memo/medical` validates the newer ontology concepts, not just the original subset
- [x] docs and examples show the intended rule coverage

### Next Ontology Milestone — Additional Reference Models **[HIGH]**

Prove the ontology against more than a single infusion-pump reference:

- [x] **Add a second medical reference model** — `examples/irrigation-pump` is now a surgical irrigation console reference model built on the shared medical backbone
- [x] **Exercise different ontology slices** — the irrigation model stresses disposable setup, pressure regulation, depletion alarming, and a different software/physical partition than infusion pump
- [x] **Compare rule behavior across examples** — infusion pump and irrigation pump both validate against the same 39-rule medical pack, exposing only the pre-existing infusion behavior warnings
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
- [x] **Add workbench validation on top of the ontology** — extended `@memo/medical` with FMEA / FTA closure rules and a dedicated risk-analysis viewpoint without collapsing ontology and tooling concerns

Exit criteria:
- [x] `@memo/ontology-medical` contains first-class FTA / FMEA / structured risk-analysis semantics
- [x] risk-analysis traces connect directly into the existing medical risk-management ontology
- [x] at least one reference model exercises the new concepts end to end

### Next Ontology Milestone — Clinical Context Enrichment **[HIGH]**

Continue the paper-driven ontology enrichment by pulling more of the clinical and procedural context into the backbone:

- [ ] **Add patient / subject ontology semantics** — introduce patient, anatomical-site, and recipient-of-procedure concepts where the meaning is stable enough for `@memo/ontology-medical`
- [ ] **Deepen procedure semantics** — add explicit method, route, clinical-step, and treatment-pathway semantics on top of the new core `Procedure` structure
- [ ] **Enrich clinical environment modeling** — capture sterile context, available equipment, personnel, substances, and relevant environmental qualifiers without collapsing into device-family specifics
- [ ] **Add observable / outcome context** — model clinically meaningful observations, morphology/state changes, and measurable outcomes that procedures and device functions act upon
- [ ] **Evaluate terminology import boundaries** — decide how far MEMO should align with or import patient/clinical terminology from external ontologies (for example SNOMED-style patient, procedure, anatomy, and observable hierarchies) without overloading the core workbench
- [ ] **Exercise the richer clinical context in examples and viewpoints** — extend the reference models and medical viewpoints so the new patient/context concepts are used in live models rather than documented only in theory

Exit criteria:
- [ ] `@memo/ontology-medical` covers patient/subject, anatomy, procedure-context, and observation semantics needed for early medical-device design reasoning
- [ ] at least one reference model uses the enriched clinical context end to end
- [ ] roadmap direction is explicit about what should be modeled locally versus imported from external clinical ontologies

### Phase 7 — Unified View Architecture (M33) **[CRITICAL]**

Replace 6-mode tab system with ISO 42010-aligned view-centric architecture:

- [ ] **Model Explorer panel** — Elements grouped by kind/layer/package (replaces Catalog mode)
- [ ] **View Explorer panel** — Views organized under viewpoints in tree (replaces ViewpointBrowser)
- [ ] **Unified Canvas** — Single canvas renders any view type (BDD, IBD, ACT, AFD, REQ, etc.)
- [ ] **View creation** — Users can create new views under any viewpoint
- [ ] **Auto-generated views** — Grouped under viewpoint (e.g., "Auto: Physical Decomposition" under physical-view)
- [ ] **Tools panel** — DSM, Consistency Analysis, FMEA accessible from toolbar icon (replaces DSM mode)
- [ ] **Breadcrumb navigation** — Viewpoint > View path above canvas
- [ ] **Remove separate ActionFlow mode** — AFD becomes a view type under behavior-view
- [ ] **Remove separate DSM mode** — DSM becomes a tool in toolbar
- [ ] **Remove separate Scenario mode** — Scenarios become views under behavioral viewpoints

### Phase 7a — Core MBSE Capabilities **[CRITICAL]**

- [ ] **Element Libraries (M34)** — Reusable standard component libraries (`library package`)
- [ ] **External Ontology Import (M35)** — OWL/JSON-LD/SysAnd import for interoperability
- [ ] **Ontology Editor (M4)** — Visual editor for kinds, relationships, layers, closure rules
- [ ] **Relationship/Traceability Matrix (M6)** — N×N matrix with presets (ISO 14971/IEC 62304)
- [ ] **FMEA + Risk Analysis (M9)** — tooling and tabular analysis workflows built on top of the structured medical risk-analysis ontology

### Phase 7b — Compliance & Productivity **[HIGH]**

- [ ] **DHF Generator Engine (M14)** — Design History File data generator + HTML renderer
- [ ] **DHF Web Preview (M15)** — DHF preview mode in web app
- [ ] **CI Integration (M19)** — `memo validate` with exit code + JSON/JUnit output
- [ ] **Cmd+K Search (M12)** — Global fuzzy search command palette
- [ ] **Properties Tabs + Editing (M10)** — Inline editing of element properties
- [ ] **Static Build + Export (M20)** — `memo build` command, .kpar packaging

### Phase 8 — Enhanced Experience **[MEDIUM]**

- [ ] **Custom Viewpoints UI (M5)** — CRUD for viewpoints
- [ ] **Right-Click Context Menus (M7)** — Diagram nodes and browser rows
- [ ] **Tabular View (M8)** — Spreadsheet view of elements
- [ ] **Focus Mode (M13)** — Ego-graph focus on selected node
- [ ] **Scenario Editor + Diff (M22)** — Source navigation, model diff
- [ ] **VS Code Extension (M26)** — LSP for .sysml files
- [ ] **Statistics Dashboard (M21)** — Model statistics cards

### Phase 9 — LLM Integration **[LOW]**

- [ ] **Model Q&A (M29)** — Natural language questions about the model
- [ ] **Completeness assistant** — LLM suggests missing elements
- [ ] **Model generation (M30)** — Generate SysML v2 from natural language
- [ ] **Report drafting** — LLM generates regulatory narratives

### Phase 10 — Ecosystem **[LOW]**

- [ ] **Domain Packages (M31)** — Automotive (ISO 26262), Aerospace (DO-178C)
- [ ] **Plugin System (M28)** — Custom rules, visualizations, exporters
- [ ] **EA/Cameo Import (M27)** — Migration tools from Enterprise Architect, Cameo
- [ ] **Cloud + Collaboration (M32)** — Hosted deployment, real-time sync

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **View-centric, not mode-centric** | ISO 42010 organizes architecture as Viewpoint → View → Model. All diagram types are views under viewpoints, not separate app modes. |
| **DSM/FMEA are tools, not views** | Analysis tools (DSM, consistency, FMEA) are accessed from a toolbar, not as separate modes. They operate on the model and can be invoked from CLI too. |
| **Activity diagrams are views** | Action Flow Diagram is a view type (AFD) under behavior-view, not a top-level mode. |
| **Arcadia-aligned layers** | Operational Analysis → Functional Need → Logical Architecture → Physical Architecture, following Capella/Arcadia methodology. |
| **30 concrete viewpoints** | Based on Starman SA taxonomy: Domain (Clinical, Business, Jobs, Capability, Environment), Behavioral (Use Case, Usability, Stakeholder Need, Risk, Requirement), Functional, Logical (Data, Control), Implementational (Hardware, Software, Timing, Network, Security, Deployment), Operational (Communication, Development, Service, Manufacturing, Execution, Process). |

---

## Known Issues

| Issue | Priority | Notes |
|---|---|---|
| Web bundle size (1.8 MB) | Low | Consider code splitting for ReactFlow/ELK |
| No web component tests | Medium | `@memo/web` has no test infrastructure yet |
| Small viewport layout overlap | Low | 3-panel layouts need min-width breakpoints |
| 6-mode architecture needs replacement | Critical | Current modes (catalog, diagram, actionflow, dsm, scenario, ontology) don't match ISO 42010. Phase 7 addresses this. |
