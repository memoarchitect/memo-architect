# Roadmap

## Completed

### Phase 1 — Foundation

- [x] Langium SysML v2 parser with full grammar
- [x] Ontology with 60+ entity types, 16 relationship types
- [x] Ontology viewer (standalone HTML)
- [x] Medical domain config (70 kinds, 15 rules, 7 viewpoints, 10 CoSMA layers)
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

- [x] **Modular ontology architecture** — Base `@memo/ontology` (45 kinds, 8 layers, 12 relationships, 4 viewpoints) + `@memo/medical` extends with domain-specific additions
- [x] **Ontology metadata** — `OntologyMetadata` type with id, version, description, author, license, tags
- [x] **Config merge deduplication** — `dedup()` for cosmaLayers (by id), relationshipTypes (by name), closureRules (by id)
- [x] **External ontology types** — `ExternalOntologyRef` and `LibraryRef` type definitions for future OWL/JSON-LD/SysAnd imports
- [x] **4-mode web app** — Mode switcher with Catalog, Diagram, Scenarios, Ontology tabs
- [x] **Catalog Explorer** — Tree browser with layer/kind/file grouping, element detail center panel, properties panel
- [x] **Diagramming mode** — Viewpoint-first sidebar (ViewpointBrowser), ELK.js diagram canvas, properties panel
- [x] **Scenario Catalog** — Filters Scenario/UseCase/UserActivity elements, grouped tree, linked elements
- [x] **Ontology Viewer** — Tree View + Graph View, grouping by layer/construct/source, show/hide groups, 45 kinds across 11 groups
- [x] **OWL/RDF export** — `exportToOwlTurtle()` and `exportToOwlXml()` in `@memo/ontology`
- [x] **Ontology CLI commands** — `memo ontology show`, `memo ontology export owl`, `memo ontology export xml`
- [x] **Properties panel** — Shared across modes with element attributes, relationships (clickable navigation), violations/guidance

### Phase 4A — CSV Import/Export & SysML Generation

- [x] **CSV import/export module** — Ontology-aware CSV parsing with kind validation, construct auto-derivation, dynamic attribute columns
- [x] **SysML generator** — Generate valid SysML v2 files from imported CSV elements and relationships
- [x] **CSV CLI commands** — `memo import csv`, `memo import csv-rel`, `memo import template`
- [x] **CSV template generation** — Auto-generate CSV templates from ontology kinds and relationship types
- [x] **WebSocket CSV import protocol** — `csv:import` client→server and `import:result` server→client messages
- [x] **22 tests** for CSV roundtrip, validation, edge cases, SysML generation

### Phase 4B — First-Class Diagram System

- [x] **DiagramType & DiagramDefinition** types in core config
- [x] **DiagramDTO** in semantic model transport layer
- [x] **Diagram CRUD protocol** — Create/Update/Delete messages over WebSocket
- [x] **Config-driven diagrams** — Viewpoints declare `supportedDiagramTypes` and `diagrams` arrays
- [x] **Auto-generated diagrams** — Model Viewpoint auto-generates Context + Decomposition BDDs
- [x] **SysML v2 diagram types** — BDD, IBD, REQ, UCD, ACT, PKG, PAR, RISK with color badges
- [x] **ViewpointBrowser rewrite** — Diagrams rendered from model DTO, type badges, auto indicators
- [x] **DiagramCanvas filtering** — selectedDiagramId drives viewpoint filter + diagram header overlay
- [x] **PropertiesPanel** — Shows diagram properties when diagram selected (no element)
- [x] **Diagram store selectors** — `getDiagram()`, `getDiagramsForViewpoint()`, `selectDiagram()`
- [x] **Config mergeViewpoints()** — Deduplicates viewpoints by ID, merges diagrams within shared viewpoints
- [x] **Medical + ontology configs** — 7 viewpoints with diagram definitions
- [x] **DIAGRAM_TYPE_META** constant — Replaces old DiagramDef with per-type metadata (code, label, fullName, color)

### Phase 4C — Documentation

- [x] **Medical Device Quick Start Tutorial** — End-to-end guide: setup → CSV import → traceability → validation → CI
- [x] **mkdocs guide structure** — Tutorial added as first guide in nav with callout on index

### Phase 4D — UI Polish

- [x] **Git user identity in status bar** — GapBar shows git user.name / user.email + branch
- [x] **Vertical completeness bar** — Collapsible compact tab by default
- [x] **UI font/size tuning** — 440px sidebar, 16px catalog fonts, text-xl diagram
- [x] **Branding** — MEMO chat-bubble logo, favicon, brain watermark
- [x] **Decomposition/containment diagram modes** — BDD + IBD auto-generated diagrams
- [x] **Collapsible left sidebar** — Toggle sidebar open/closed across all 4 modes (40px collapsed strip with vertical label)
- [x] **Comments/discussion panel** — Element-level annotation/comment sidebar with git user attribution, dirty tracking, and WebSocket persistence

### Phase 4 — Multi-File SysML & Cross-File Resolution

- [x] **Cross-file import resolution** — PackageRegistry tracks packages across files, two-pass builder defers connections, resolves via imports
- [x] **SysML v2 `library` keyword** — Grammar supports `library package` (definitions only, `isLibrary` tracked in registry)
- [x] **Wildcard and named imports** — Full `::*` and `::SpecificType` import syntax with registry-based resolution
- [x] **Multi-file model splitting** — Convention with example split files (risk/, requirements/, architecture/) and 100 passing tests

### Phase 5 — Behavior Viewpoint (SysML v2 Actions & Flows)

- [x] **Phase 5a: Behavior grammar & semantic model** — `action def`, `action usage`, `item def`, `flow`, `succession`, `allocate` in Langium grammar; `ActionParameter`, `parentAction`, `allocatedTo`, `flowItem` in semantic model; two-pass builder with deferred flow/succession/allocate resolution; 30 behavior tests
- [x] **Phase 5b: Action Flow Diagram renderer** — `ActionFlowDiagram` component with ELK.js layered layout, swim lanes by allocation target, flow edges (solid/dashed by material/signal), succession edges, start/done pseudo-nodes, custom `ActionFlowNode` with port badges
- [x] **Phase 5c: Viewpoint integration** — Action Flow mode in ModeSwitcher, `actionflow` route in App, parameters & allocation display in PropertiesPanel, behavior layer/kinds/viewpoint in base ontology config, `flow`/`succession` relationship types
- [x] **Phase 5d: Behavior validation & completeness** — `behavior-validator.ts` with BV-001 (unallocated action warning), BV-002 (orphan action warning), BV-003 (incompatible flow type error); `validateModel()` composer; `actionType` attribute on usages for definition lookup; 6 validation tests
- [x] **Example models** — Infusion pump behavior (6 action defs, flows, successions, allocations), irrigation pump (structure + behavior with parallel branches)

### Phase 5e — UI Polish & Viewpoint Restructuring

- [x] **Design system tokens** — `styles/tokens.ts` with SHADOW, RADIUS, FONT, EDGE, TRANSITION constants for consistent rendering
- [x] **Viewpoint config restructuring** — Split monolithic `architecture-view` into ISO 42010–aligned viewpoints: `context-view`, `functional-view`, `logical-view`, `interface-view`; moved hardcoded EXTRA_VIEWPOINTS into ontology config
- [x] **Node polish** — Drop shadows, hover lift, smooth transitions on DecompositionNode and ActionFlowNode; CSS transitions for edges and handles
- [x] **Diagram canvas UX** — Empty state placeholder, scroll-to-zoom + pan-on-scroll, softer background grid, longer fitView animations
- [x] **Medical domain viewpoints** — Safety Analysis viewpoint, Physical Containment IBD diagram, Model Viewpoint reduced to single cross-cutting overview

### Phase 6a — Functional Breakdown Structure (FBS)

- [x] **`decomposedBy` relationship type** — Parent function → child function decomposition in ontology config + REL_COLORS
- [x] **FBS tree diagram** — `buildFunctionalTree()` + `computeFBSLayout()` in layout.ts; interactive expand/collapse tree for functional kinds using ELK MRTree algorithm
- [x] **FBS diagram integration** — `diag-fbs-tree` auto-diagram in functional-view with `layoutStyle: fbs`; DiagramCanvas routes FBS to dedicated layout with expand/collapse controls
- [x] **Example models** — Infusion pump FBS: 4 SystemFunctions decomposed into 5 ComponentFunctions via `DecomposedBy` connections

### Phase 6b — DSM Analysis

- [x] **DSM matrix computation** — `computeDSM()` builds N×N matrix from model relationships; filters by element kinds and relationship types; `DSMCell` records count, types, flowItems per dependency
- [x] **Clustering algorithm** — Union-find connected component detection; `reorderDSM()` groups clustered elements for band minimization
- [x] **Interactive DSM view** — `DSMView` component with color-coded matrix cells, rotated column headers, hover tooltips with relationship details, element selection on click
- [x] **Allocation overlay** — Toggle to show allocated-to badges on row labels
- [x] **DSM toolbar** — Kind filter (Functions/Behavior/All), cluster toggle, allocation overlay toggle, dependency count
- [x] **9 DSM tests** — Matrix construction, flow/decomposedBy cell recording, diagonal empty, clustering, custom filters, reordering, empty/no-match models

---

## In Progress / Next Up

### Phase 6 — DSM & Functional Analysis

#### 6c. Functional ↔ Logical Consistency
- [ ] **Consistency visualization** — Overlay functional flows on logical architecture

### Phase 7 — Build, Export & Advanced Features

- [ ] **`memo build` command** — Static HTML report with embedded diagram
- [ ] **`.kpar` packaging** — SysAnd-compatible archive
- [ ] **PDF export** — Compliance documentation PDF
- [ ] **Ontology editor** — Visual editor for kinds and relationships
- [ ] **Scenario editor** — Text-driven scenario editor with element linking, future diagram sync
- [ ] **Multi-file navigation** — Click-through from diagram to source `.sysml` file and line
- [ ] **Diff view** — Show changes between rebuilds
- [ ] **VS Code extension** — Language server with autocomplete, go-to-definition, diagnostics

### Phase 8 — LLM Integration

- [ ] **Model Q&A** — Natural language questions about the model
- [ ] **Completeness assistant** — LLM suggests missing elements based on closure rule violations
- [ ] **Model generation** — Generate SysML v2 from natural language descriptions
- [ ] **Impact analysis** — Change propagation analysis
- [ ] **Report drafting** — LLM generates regulatory narratives from model data

### Phase 9 — Ecosystem

- [ ] **Additional domain packages** — Automotive (ISO 26262), aerospace (DO-178C)
- [ ] **Plugin system** — Custom rule types, visualizations, exporters
- [ ] **Element libraries** — Reusable standard component libraries (USB, Logging, PowerDown)
- [ ] **External ontology imports** — OWL/JSON-LD/SysAnd ontology integration
- [ ] **Import from EA/Cameo** — Migration tools from Enterprise Architect or Cameo

### Phase 10 — CI & Cloud

- [ ] **CI integration** — `memo validate` returns exit code 1 on errors; GitHub Actions
- [ ] **Cloud deployment** — Hosted version with user accounts
- [ ] **Collaboration** — Multi-user editing with conflict resolution

---

## Known Issues

| Issue | Priority | Notes |
|---|---|---|
| Web bundle size (1.8 MB) | Low | Consider code splitting for ReactFlow/ELK |
| No web component tests | Medium | `@memo/web` has no test infrastructure yet |
| Small viewport layout overlap | Low | 3-panel layouts need min-width breakpoints |
